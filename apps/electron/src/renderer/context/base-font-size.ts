export const MIN_BASE_FONT_SIZE = 12
export const MAX_BASE_FONT_SIZE = 20
export const BASE_FONT_SIZE_STEP = 0.5

export function normalizeBaseFontSize(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed)) return fallback
  const rounded = Math.round(parsed / BASE_FONT_SIZE_STEP) * BASE_FONT_SIZE_STEP
  return Math.min(MAX_BASE_FONT_SIZE, Math.max(MIN_BASE_FONT_SIZE, rounded))
}
