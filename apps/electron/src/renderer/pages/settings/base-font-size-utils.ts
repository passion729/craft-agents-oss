import {
  BASE_FONT_SIZE_STEP,
  MAX_BASE_FONT_SIZE,
  MIN_BASE_FONT_SIZE,
} from '@/context/base-font-size'

const BASE_FONT_SIZE_INPUT_PATTERN = /^\d+(?:\.\d+)?$/

function isStepAligned(value: number): boolean {
  const scaled = value / BASE_FONT_SIZE_STEP
  return Math.abs(scaled - Math.round(scaled)) < Number.EPSILON
}

export function parseBaseFontSizeInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed || !BASE_FONT_SIZE_INPUT_PATTERN.test(trimmed)) return null

  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return null
  if (parsed < MIN_BASE_FONT_SIZE || parsed > MAX_BASE_FONT_SIZE) return null
  if (!isStepAligned(parsed)) return null

  return parsed
}
