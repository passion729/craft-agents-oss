import type { AnnotationV1 } from '@craft-agent/core'
import { getAnnotationFollowUpState, type AnnotationFollowUpState } from './follow-up-state'

export type AnnotationChipInteraction = {
  state: AnnotationFollowUpState
  clickable: boolean
  tooltipOnly: boolean
  openMode: 'edit'
}

/**
 * Unified annotation chip behavior:
 * - all annotation chips remain clickable, including sent follow-ups
 * - click opens the editor view so highlights can be upgraded into notes/follow-ups
 */
export function getAnnotationChipInteraction(annotation?: AnnotationV1 | null): AnnotationChipInteraction {
  const state = annotation ? getAnnotationFollowUpState(annotation) : 'none'

  return {
    state,
    clickable: true,
    tooltipOnly: false,
    openMode: 'edit',
  }
}

export function isAnnotationChipClickable(annotation?: AnnotationV1 | null): boolean {
  return getAnnotationChipInteraction(annotation).clickable
}

export function getAnnotationChipOpenMode(): 'edit' {
  return 'edit'
}

/**
 * Mouse-up events that originate from annotation affordances must not trigger
 * text-selection follow-up flows. This keeps chip clicks and rect-click
 * behavior consistent across inline and fullscreen renderers.
 */
export function shouldIgnoreSelectionMouseUpTarget(target: EventTarget | null): boolean {
  const candidate = (target && typeof target === 'object' && 'closest' in target)
    ? target as { closest: (selector: string) => Element | null }
    : null
  const parentCandidate = (target && typeof target === 'object' && 'parentElement' in target)
    ? (target as { parentElement?: { closest?: (selector: string) => Element | null } | null }).parentElement
    : null

  return Boolean(
    candidate?.closest('[data-ca-annotation-index], [data-ca-annotation-rect]')
      || parentCandidate?.closest?.('[data-ca-annotation-index], [data-ca-annotation-rect]')
  )
}
