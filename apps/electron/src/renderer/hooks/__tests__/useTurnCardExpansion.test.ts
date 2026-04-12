import { describe, expect, it } from 'bun:test'
import {
  applyExpandedTurnKeys,
  hasExpandedTurnKey,
  normalizeTurnKeys,
} from '../useTurnCardExpansion'

describe('useTurnCardExpansion key helpers', () => {
  it('normalizes one-or-many keys and removes duplicates', () => {
    expect(normalizeTurnKeys('assistant:msg:1')).toEqual(['assistant:msg:1'])
    expect(normalizeTurnKeys([' assistant:msg:1 ', 'assistant:msg:1', 'assistant:turn:1'])).toEqual([
      'assistant:msg:1',
      'assistant:turn:1',
    ])
  })

  it('treats any alias as expanded when reading state', () => {
    const expanded = new Set<string>(['assistant:turn:t1:100:7'])

    expect(hasExpandedTurnKey(expanded, [
      'assistant:msg:final-1',
      'assistant:turn:t1:100:7',
    ])).toBe(true)
  })

  it('syncs all aliases when expanding and collapsing', () => {
    const aliases = ['assistant:msg:final-1', 'assistant:turn:t1:100:7']

    const expanded = applyExpandedTurnKeys(new Set<string>(), aliases, true)
    expect(expanded.has('assistant:msg:final-1')).toBe(true)
    expect(expanded.has('assistant:turn:t1:100:7')).toBe(true)

    const collapsed = applyExpandedTurnKeys(expanded, aliases, false)
    expect(collapsed.has('assistant:msg:final-1')).toBe(false)
    expect(collapsed.has('assistant:turn:t1:100:7')).toBe(false)
  })
})

