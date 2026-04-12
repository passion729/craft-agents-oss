import { describe, expect, it } from 'bun:test'
import {
  resolveTurnExpandedState,
  shouldAutoExpandAssistantTurn,
} from '../turn-card-expansion-strategy'

describe('turn-card expansion strategy', () => {
  it('auto-expands during intermediate streaming when not manually overridden', () => {
    expect(resolveTurnExpandedState({
      storedExpanded: false,
      hasManualOverride: false,
      hasAutoManaged: true,
      shouldAutoExpand: true,
    })).toBe(true)
  })

  it('auto-collapses after auto condition ends', () => {
    expect(resolveTurnExpandedState({
      storedExpanded: true,
      hasManualOverride: false,
      hasAutoManaged: true,
      shouldAutoExpand: false,
    })).toBe(false)
  })

  it('respects manual collapse during streaming', () => {
    expect(resolveTurnExpandedState({
      storedExpanded: false,
      hasManualOverride: true,
      hasAutoManaged: true,
      shouldAutoExpand: true,
    })).toBe(false)
  })

  it('respects manual expand after streaming ends', () => {
    expect(resolveTurnExpandedState({
      storedExpanded: true,
      hasManualOverride: true,
      hasAutoManaged: true,
      shouldAutoExpand: false,
    })).toBe(true)
  })

  it('falls back to stored state when turn is not auto-managed', () => {
    expect(resolveTurnExpandedState({
      storedExpanded: true,
      hasManualOverride: false,
      hasAutoManaged: false,
      shouldAutoExpand: false,
    })).toBe(true)
  })

  it('auto-expand condition follows streaming state', () => {
    expect(shouldAutoExpandAssistantTurn({ isStreaming: true })).toBe(true)
    expect(shouldAutoExpandAssistantTurn({ isStreaming: false })).toBe(false)
  })
})
