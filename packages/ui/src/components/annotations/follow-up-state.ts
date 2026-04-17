import type { AnnotationV1 } from '@craft-agent/core'
import { getAnnotationDefaultColor } from './annotation-core'

export type AnnotationFollowUpState = 'none' | 'pending' | 'sent'
export type AnnotationKind = 'highlight' | 'note' | 'follow-up'

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

export function normalizeFollowUpText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function getAnnotationBodyNoteText(annotation: AnnotationV1): string {
  const noteBody = annotation.body.find((body): body is Extract<AnnotationV1['body'][number], { type: 'note' }> => body.type === 'note')
  return noteBody?.text?.trim() ?? ''
}

function getAnnotationExplicitKind(annotation: AnnotationV1): AnnotationKind | null {
  const kind = asRecord(annotation.meta)?.annotationKind
  return kind === 'highlight' || kind === 'note' || kind === 'follow-up'
    ? kind
    : null
}

export function getAnnotationFollowUpText(annotation: AnnotationV1): string {
  const followUpMeta = asRecord(asRecord(annotation.meta)?.followUp)
  const metaText = typeof followUpMeta?.text === 'string' ? followUpMeta.text.trim() : ''
  if (metaText.length > 0) return metaText

  const explicitKind = getAnnotationExplicitKind(annotation)
  if (explicitKind === 'follow-up') {
    return getAnnotationBodyNoteText(annotation)
  }

  return ''
}

export function getAnnotationNoteText(annotation: AnnotationV1): string {
  if (getAnnotationFollowUpText(annotation).length > 0) {
    return ''
  }

  return getAnnotationBodyNoteText(annotation)
}

export function getAnnotationKind(annotation: AnnotationV1): AnnotationKind {
  const explicitKind = getAnnotationExplicitKind(annotation)
  if (explicitKind === 'follow-up') return 'follow-up'

  const followUpText = getAnnotationFollowUpText(annotation)
  if (followUpText.length > 0) return 'follow-up'

  if (explicitKind === 'note') return 'note'

  const noteText = getAnnotationBodyNoteText(annotation)
  if (noteText.length > 0) return 'note'

  return explicitKind ?? 'highlight'
}

export function getAnnotationDisplayColor(annotation: AnnotationV1): string {
  return getAnnotationDefaultColor(getAnnotationKind(annotation))
}

export function shouldRenderAnnotationChip(annotation: AnnotationV1): boolean {
  if (asRecord(annotation.meta)?.ephemeral === true) return false
  return getAnnotationKind(annotation) !== 'highlight'
}

export function getAnnotationEditorKind(annotation: AnnotationV1): 'note' | 'follow-up' {
  return getAnnotationKind(annotation) === 'follow-up' ? 'follow-up' : 'note'
}

export function getAnnotationEditorText(annotation: AnnotationV1): string {
  return getAnnotationEditorKind(annotation) === 'follow-up'
    ? getAnnotationFollowUpText(annotation)
    : getAnnotationNoteText(annotation)
}

export function getAnnotationFollowUpState(annotation: AnnotationV1): AnnotationFollowUpState {
  const followUpText = getAnnotationFollowUpText(annotation)
  if (!followUpText) return 'none'

  const followUpMeta = asRecord(asRecord(annotation.meta)?.followUp)
  if (!followUpMeta) return 'pending'

  const sentAt = typeof followUpMeta.lastSentAt === 'number'
    ? followUpMeta.lastSentAt
    : (typeof followUpMeta.sentAt === 'number' ? followUpMeta.sentAt : null)

  const sentTextRaw = typeof followUpMeta.lastSentText === 'string'
    ? followUpMeta.lastSentText
    : (typeof followUpMeta.sentText === 'string' ? followUpMeta.sentText : '')

  const sentText = sentTextRaw.trim()
  return sentAt != null && sentText.length > 0 && sentText === followUpText.trim()
    ? 'sent'
    : 'pending'
}

export function isAnnotationFollowUpSent(annotation: AnnotationV1): boolean {
  return getAnnotationFollowUpState(annotation) === 'sent'
}

export function formatAnnotationFollowUpTooltipText(annotation: AnnotationV1, maxLength = 180): string {
  const note = normalizeFollowUpText(getAnnotationFollowUpText(annotation))
  if (!note) return ''

  return note.length > maxLength
    ? `${note.slice(0, maxLength - 1).trimEnd()}…`
    : note
}

export function formatAnnotationTooltipText(annotation: AnnotationV1, maxLength = 180): string {
  const text = normalizeFollowUpText(getAnnotationNoteText(annotation) || getAnnotationFollowUpText(annotation))
  if (!text) return ''

  return text.length > maxLength
    ? `${text.slice(0, maxLength - 1).trimEnd()}…`
    : text
}
