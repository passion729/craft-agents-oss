import { describe, expect, it } from 'bun:test'
import type { AnnotationV1 } from '@craft-agent/core'
import {
  formatAnnotationTooltipText,
  getAnnotationDisplayColor,
  getAnnotationEditorKind,
  getAnnotationEditorText,
  getAnnotationFollowUpText,
  getAnnotationKind,
  getAnnotationNoteText,
  shouldRenderAnnotationChip,
} from '../follow-up-state'
import {
  createFollowUpSelectionAnnotation,
  createHighlightSelectionAnnotation,
  createNoteSelectionAnnotation,
} from '../annotation-core'

describe('follow-up state helpers', () => {
  it('treats explicit note annotations as local notes', () => {
    const annotation = createNoteSelectionAnnotation(
      'msg-1',
      {
        start: 0,
        end: 5,
        selectedText: 'hello',
        prefix: '',
        suffix: ' world',
      },
      'Remember this',
      'session-1',
    )

    expect(getAnnotationKind(annotation)).toBe('note')
    expect(getAnnotationNoteText(annotation)).toBe('Remember this')
    expect(getAnnotationFollowUpText(annotation)).toBe('')
    expect(getAnnotationEditorKind(annotation)).toBe('note')
    expect(getAnnotationEditorText(annotation)).toBe('Remember this')
    expect(formatAnnotationTooltipText(annotation)).toBe('Remember this')
    expect(getAnnotationDisplayColor(annotation)).toBe('pink')
    expect(shouldRenderAnnotationChip(annotation)).toBe(true)
  })

  it('reads follow-up text from follow-up metadata only', () => {
    const annotation = createFollowUpSelectionAnnotation(
      'msg-1',
      {
        start: 0,
        end: 5,
        selectedText: 'hello',
        prefix: '',
        suffix: ' world',
      },
      'Ask the agent later',
      'session-1',
    )

    expect(getAnnotationKind(annotation)).toBe('follow-up')
    expect(getAnnotationNoteText(annotation)).toBe('')
    expect(getAnnotationFollowUpText(annotation)).toBe('Ask the agent later')
    expect(getAnnotationEditorKind(annotation)).toBe('follow-up')
    expect(getAnnotationEditorText(annotation)).toBe('Ask the agent later')
    expect(getAnnotationDisplayColor(annotation)).toBe('blue')
    expect(shouldRenderAnnotationChip(annotation)).toBe(true)
  })

  it('treats legacy note+followUp annotations as follow-up only', () => {
    const annotation = createNoteSelectionAnnotation(
      'msg-2',
      {
        start: 0,
        end: 4,
        selectedText: 'test',
        prefix: '',
        suffix: ' data',
      },
      'Old note body',
      'session-2',
    )

    annotation.meta = {
      ...(annotation.meta ?? {}),
      followUp: {
        text: 'Legacy follow-up',
      },
    }

    expect(getAnnotationKind(annotation)).toBe('follow-up')
    expect(getAnnotationNoteText(annotation)).toBe('')
    expect(getAnnotationFollowUpText(annotation)).toBe('Legacy follow-up')
    expect(formatAnnotationTooltipText(annotation)).toBe('Legacy follow-up')
    expect(shouldRenderAnnotationChip(annotation)).toBe(true)
  })

  it('falls back to highlight when no note or follow-up exists', () => {
    const annotation: AnnotationV1 = createHighlightSelectionAnnotation(
      'msg-3',
      {
        start: 1,
        end: 3,
        selectedText: 'ok',
        prefix: 'n',
        suffix: 'w',
      },
      'session-3',
    )

    expect(getAnnotationKind(annotation)).toBe('highlight')
    expect(getAnnotationNoteText(annotation)).toBe('')
    expect(getAnnotationFollowUpText(annotation)).toBe('')
    expect(getAnnotationEditorKind(annotation)).toBe('note')
    expect(getAnnotationEditorText(annotation)).toBe('')
    expect(getAnnotationDisplayColor(annotation)).toBe('yellow')
    expect(formatAnnotationTooltipText(annotation)).toBe('')
    expect(shouldRenderAnnotationChip(annotation)).toBe(false)
  })

  it('does not render chips for ephemeral preview annotations', () => {
    const annotation = createFollowUpSelectionAnnotation(
      'msg-4',
      {
        start: 0,
        end: 4,
        selectedText: 'test',
        prefix: '',
        suffix: ' data',
      },
      'Preview',
      'session-4',
    )

    annotation.meta = {
      ...(annotation.meta ?? {}),
      ephemeral: true,
    }

    expect(shouldRenderAnnotationChip(annotation)).toBe(false)
  })
})
