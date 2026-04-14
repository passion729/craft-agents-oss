import { describe, it, expect } from 'bun:test'
import { hasInputSnapshotChanged, isEscapeDuringComposition, isInputDuringComposition } from '../rich-text-input'

describe('isEscapeDuringComposition', () => {
  it('returns true for Escape when local composition ref is active', () => {
    expect(isEscapeDuringComposition({ key: 'Escape' }, true)).toBe(true)
  })

  it('returns true for Escape when nativeEvent.isComposing is true', () => {
    expect(
      isEscapeDuringComposition(
        { key: 'Escape', nativeEvent: { isComposing: true } },
        false
      )
    ).toBe(true)
  })

  it('returns true for Escape when event.isComposing is true', () => {
    expect(isEscapeDuringComposition({ key: 'Escape', isComposing: true }, false)).toBe(true)
  })

  it('returns false for Escape when no composition signal is active', () => {
    expect(isEscapeDuringComposition({ key: 'Escape' }, false)).toBe(false)
  })

  it('returns false for non-Escape keys even if composing', () => {
    expect(isEscapeDuringComposition({ key: 'Enter', isComposing: true }, true)).toBe(false)
  })
})

describe('isInputDuringComposition', () => {
  it('returns true when native event marks composing', () => {
    expect(
      isInputDuringComposition(
        { nativeEvent: { isComposing: true } },
        false
      )
    ).toBe(true)
  })

  it('returns true for composition inputType', () => {
    expect(
      isInputDuringComposition(
        { nativeEvent: { inputType: 'insertCompositionText' } },
        false
      )
    ).toBe(true)
  })

  it('returns false for regular text input when not composing', () => {
    expect(
      isInputDuringComposition(
        { nativeEvent: { inputType: 'insertText' } },
        false
      )
    ).toBe(false)
  })
})

describe('hasInputSnapshotChanged', () => {
  it('returns false for identical snapshots (composition end de-dupe)', () => {
    expect(hasInputSnapshotChanged(
      { text: '你好', cursor: 2 },
      { text: '你好', cursor: 2 }
    )).toBe(false)
  })

  it('returns true when text differs', () => {
    expect(hasInputSnapshotChanged(
      { text: '你', cursor: 1 },
      { text: '你好', cursor: 2 }
    )).toBe(true)
  })
})
