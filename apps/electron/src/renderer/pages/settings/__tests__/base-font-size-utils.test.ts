import { describe, expect, it } from 'bun:test'
import { parseBaseFontSizeInput } from '../base-font-size-utils'

describe('parseBaseFontSizeInput', () => {
  it('accepts half-step values', () => {
    expect(parseBaseFontSizeInput('15.5')).toBe(15.5)
  })

  it('rejects non half-step decimals', () => {
    expect(parseBaseFontSizeInput('15.2')).toBeNull()
  })

  it('accepts integer values', () => {
    expect(parseBaseFontSizeInput('16')).toBe(16)
  })
})
