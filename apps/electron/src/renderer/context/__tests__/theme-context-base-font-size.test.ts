import { describe, expect, it } from 'bun:test'
import { normalizeBaseFontSize } from '../base-font-size'

describe('normalizeBaseFontSize', () => {
  it('keeps integer values', () => {
    expect(normalizeBaseFontSize(15, 14)).toBe(15)
  })

  it('keeps half-step values', () => {
    expect(normalizeBaseFontSize(15.5, 14)).toBe(15.5)
  })

  it('rounds values to nearest half-step', () => {
    expect(normalizeBaseFontSize(15.24, 14)).toBe(15)
    expect(normalizeBaseFontSize(15.26, 14)).toBe(15.5)
  })

  it('clamps values to configured range', () => {
    expect(normalizeBaseFontSize(11.5, 14)).toBe(12)
    expect(normalizeBaseFontSize(20.5, 14)).toBe(20)
  })
})
