import { describe, expect, it } from 'bun:test'
import type { SessionFilter } from '../../../shared/types'
import {
  buildLastSelectedSessionStorageSuffix,
  buildSessionFilterMemoryKey,
  resolveLastSelectedSessionIdForFilter,
} from '../navigation-session-memory'

describe('buildSessionFilterMemoryKey', () => {
  it('builds stable keys for all filter kinds', () => {
    expect(buildSessionFilterMemoryKey({ kind: 'allSessions' })).toBe('allSessions')
    expect(buildSessionFilterMemoryKey({ kind: 'flagged' })).toBe('flagged')
    expect(buildSessionFilterMemoryKey({ kind: 'archived' })).toBe('archived')
    expect(buildSessionFilterMemoryKey({ kind: 'state', stateId: 'todo' })).toBe('state:todo')
    expect(buildSessionFilterMemoryKey({ kind: 'label', labelId: 'priority/high' })).toBe('label:priority%2Fhigh')
    expect(buildSessionFilterMemoryKey({ kind: 'view', viewId: 'my view' })).toBe('view:my%20view')
  })
})

describe('buildLastSelectedSessionStorageSuffix', () => {
  it('namespaces suffix by workspace and filter key', () => {
    const a = buildLastSelectedSessionStorageSuffix('ws-1', { kind: 'allSessions' })
    const b = buildLastSelectedSessionStorageSuffix('ws-1', { kind: 'state', stateId: 'todo' })
    const c = buildLastSelectedSessionStorageSuffix('ws-2', { kind: 'allSessions' })

    expect(a).toBe('ws-1::allSessions')
    expect(b).toBe('ws-1::state:todo')
    expect(c).toBe('ws-2::allSessions')
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })
})

describe('resolveLastSelectedSessionIdForFilter', () => {
  const getFromMap = (map: Record<string, string | null>) => (key: string) => map[key] ?? null

  it('returns scoped value when valid', () => {
    const filter: SessionFilter = { kind: 'state', stateId: 'todo' }
    const scopedKey = buildLastSelectedSessionStorageSuffix('ws-1', filter)
    const result = resolveLastSelectedSessionIdForFilter({
      workspaceId: 'ws-1',
      filter,
      sessionIdsInFilter: ['s1', 's2'],
      getScopedValue: getFromMap({ [scopedKey]: 's2' }),
      getLegacyWorkspaceValue: getFromMap({ 'ws-1': 's1' }),
    })
    expect(result).toBe('s2')
  })

  it('returns null when scoped value does not belong to the filter set', () => {
    const filter: SessionFilter = { kind: 'state', stateId: 'todo' }
    const scopedKey = buildLastSelectedSessionStorageSuffix('ws-1', filter)
    const result = resolveLastSelectedSessionIdForFilter({
      workspaceId: 'ws-1',
      filter,
      sessionIdsInFilter: ['s1'],
      getScopedValue: getFromMap({ [scopedKey]: 's3' }),
      getLegacyWorkspaceValue: getFromMap({ 'ws-1': 's1' }),
    })
    expect(result).toBeNull()
  })

  it('falls back to legacy workspace value for allSessions only', () => {
    const result = resolveLastSelectedSessionIdForFilter({
      workspaceId: 'ws-1',
      filter: { kind: 'allSessions' },
      sessionIdsInFilter: ['a1', 'a2'],
      getScopedValue: getFromMap({}),
      getLegacyWorkspaceValue: getFromMap({ 'ws-1': 'a2' }),
    })
    expect(result).toBe('a2')
  })

  it('does not fall back to legacy workspace value for non-allSessions filters', () => {
    const result = resolveLastSelectedSessionIdForFilter({
      workspaceId: 'ws-1',
      filter: { kind: 'flagged' },
      sessionIdsInFilter: ['f1', 'f2'],
      getScopedValue: getFromMap({}),
      getLegacyWorkspaceValue: getFromMap({ 'ws-1': 'f2' }),
    })
    expect(result).toBeNull()
  })
})

