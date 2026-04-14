import { describe, expect, it } from 'bun:test'
import { shouldSkipRichInputProcessing } from '../composition-guards'

describe('shouldSkipRichInputProcessing', () => {
  it('returns true when event is explicitly composing', () => {
    expect(shouldSkipRichInputProcessing({ isComposing: true, inputType: null })).toBe(true)
  })

  it('returns true for composition input types', () => {
    expect(shouldSkipRichInputProcessing({ isComposing: false, inputType: 'insertCompositionText' })).toBe(true)
    expect(shouldSkipRichInputProcessing({ isComposing: false, inputType: 'deleteCompositionText' })).toBe(true)
  })

  it('returns false for non-composition input', () => {
    expect(shouldSkipRichInputProcessing({ isComposing: false, inputType: 'insertText' })).toBe(false)
    expect(shouldSkipRichInputProcessing({ isComposing: false, inputType: null })).toBe(false)
    expect(shouldSkipRichInputProcessing(undefined)).toBe(false)
  })
})
