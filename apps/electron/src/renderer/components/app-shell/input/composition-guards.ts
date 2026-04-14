import type { RichTextInputChangeMeta } from '@/components/ui/rich-text-input'

const COMPOSITION_INPUT_TYPES = new Set(['insertCompositionText', 'deleteCompositionText'])

/**
 * Returns true when rich input processing (menus, auto-capitalization, typography)
 * should be skipped because the event belongs to IME composition.
 */
export function shouldSkipRichInputProcessing(meta: RichTextInputChangeMeta | null | undefined): boolean {
  if (!meta) return false
  if (meta.isComposing) return true
  return Boolean(meta.inputType && COMPOSITION_INPUT_TYPES.has(meta.inputType))
}
