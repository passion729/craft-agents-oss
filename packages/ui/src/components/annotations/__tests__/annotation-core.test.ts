import { describe, expect, it } from 'bun:test'
import {
  buildEditedAnnotationPatch,
  createFollowUpSelectionAnnotation,
  createHighlightSelectionAnnotation,
  getAnnotationDefaultColor,
  createNoteSelectionAnnotation,
  createSelectionPreviewAnnotation,
} from '../annotation-core'
import { annotationColorToRgb, getAnnotationChipBackground, getAnnotationChipVisual, getAnnotationRectVisual, getAnnotationStrokeCss } from '../annotation-style-tokens'

describe('annotation core helpers', () => {
  it('creates follow-up selection annotation with metadata and no note body', () => {
    const annotation = createFollowUpSelectionAnnotation(
      'msg-1',
      {
        start: 2,
        end: 9,
        selectedText: 'example',
        prefix: 'pre',
        suffix: 'suf',
      },
      'Need follow-up',
      'session-42',
    )

    expect(annotation.target.source).toEqual({
      sessionId: 'session-42',
      messageId: 'msg-1',
    })

    const noteBody = annotation.body.find(body => body.type === 'note')
    expect(noteBody).toBeUndefined()
    expect(annotation.intent).toBe('question')

    const followUp = (annotation.meta as Record<string, unknown> | undefined)?.followUp as Record<string, unknown> | undefined
    expect(followUp?.text).toBe('Need follow-up')
    expect(typeof followUp?.createdAt).toBe('number')
    expect(annotation.style?.color).toBe(getAnnotationDefaultColor('follow-up'))
  })

  it('creates local note annotations without follow-up metadata', () => {
    const annotation = createNoteSelectionAnnotation(
      'msg-3',
      {
        start: 1,
        end: 6,
        selectedText: 'notes',
        prefix: 'a',
        suffix: 'b',
      },
      'Keep this locally',
      'session-9',
    )

    const noteBody = annotation.body.find(body => body.type === 'note')
    expect(noteBody && 'text' in noteBody ? noteBody.text : '').toBe('Keep this locally')
    expect((annotation.meta as Record<string, unknown> | undefined)?.followUp).toBeUndefined()
    expect((annotation.meta as Record<string, unknown> | undefined)?.annotationKind).toBe('note')
    expect(annotation.style?.color).toBe(getAnnotationDefaultColor('note'))
  })

  it('creates preview annotation marked ephemeral with explicit source', () => {
    const preview = createSelectionPreviewAnnotation(
      'msg-2',
      {
        start: 0,
        end: 4,
        selectedText: 'test',
        prefix: '',
        suffix: ' data',
      },
      'note',
      'session-preview',
    )

    expect(preview.target.source).toEqual({ sessionId: 'session-preview', messageId: 'msg-2' })
    expect(preview.style?.color).toBe(getAnnotationDefaultColor('note'))
    expect((preview.meta as Record<string, unknown>)?.ephemeral).toBe(true)
    expect((preview.meta as Record<string, unknown>)?.annotationKind).toBe('note')
    expect((preview.meta as Record<string, unknown>)?.source).toBe('annotation-selection-preview')
  })

  it('builds highlight-only patch when note text is cleared', () => {
    const annotation = createHighlightSelectionAnnotation(
      'msg-4',
      {
        start: 0,
        end: 4,
        selectedText: 'test',
        prefix: '',
        suffix: ' data',
      },
      'session-clear',
    )

    const patch = buildEditedAnnotationPatch(annotation, '', 'note')

    expect(patch.intent).toBe('highlight')
    expect(patch.body).toEqual([{ type: 'highlight' }])
    expect((patch.meta as Record<string, unknown>)?.annotationKind).toBe('highlight')
    expect((patch.style as Record<string, unknown>)?.color).toBe(getAnnotationDefaultColor('highlight'))
  })

  it('updates edited annotations to the semantic color for each editor kind', () => {
    const base = createHighlightSelectionAnnotation(
      'msg-5',
      {
        start: 0,
        end: 4,
        selectedText: 'test',
        prefix: '',
        suffix: ' data',
      },
      'session-color',
    )

    const notePatch = buildEditedAnnotationPatch(base, 'Remember this', 'note')
    const followUpPatch = buildEditedAnnotationPatch(base, 'Ask later', 'follow-up')

    expect((notePatch.style as Record<string, unknown>)?.color).toBe(getAnnotationDefaultColor('note'))
    expect((followUpPatch.style as Record<string, unknown>)?.color).toBe(getAnnotationDefaultColor('follow-up'))
  })

  it('keeps chip visuals consistent across pending and sent states', () => {
    const pending = getAnnotationChipVisual({ pendingFollowUp: true, sentFollowUp: false, colorName: 'blue' })
    const sent = getAnnotationChipVisual({ pendingFollowUp: false, sentFollowUp: true, colorName: 'pink' })
    const rect = getAnnotationRectVisual({ pendingFollowUp: true, sentFollowUp: false, colorName: 'pink' })

    expect(pending.className.includes('shadow-tinted')).toBe(false)
    expect(String(pending.style.backgroundColor)).toBe(getAnnotationChipBackground('blue', 'pending'))
    expect(String(sent.style.backgroundColor)).toBe(getAnnotationChipBackground('pink', 'sent'))
    expect(String((pending.style as Record<string, unknown>)['--shadow-color'])).toBe(annotationColorToRgb('blue'))
    expect(String((sent.style as Record<string, unknown>)['--shadow-color'])).toBe(annotationColorToRgb('pink'))
    expect(String((pending.style as Record<string, unknown>).border)).toBe(
      `1px solid ${getAnnotationStrokeCss('blue', '--annotation-pending-stroke-opacity', '0.32')}`
    )
    expect(String((rect.style as Record<string, unknown>).outline)).toBe(
      `1px solid ${getAnnotationStrokeCss('pink', '--annotation-pending-stroke-opacity', '0.32')}`
    )
  })
})
