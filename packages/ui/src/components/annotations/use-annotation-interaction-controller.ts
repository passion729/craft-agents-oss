import * as React from 'react'
import type { AnnotationV1 } from '@craft-agent/core'
import {
  annotationInteractionActions,
  annotationInteractionReducer,
  type AnnotationIslandMode,
  initialAnnotationInteractionState,
  type ActiveAnnotationDetail,
  type AnchoredSelection,
} from './interaction-state-machine'
import type { AnnotationEditorKind } from './annotation-core'

export type ExternalOpenAnnotationRequest = {
  messageId: string
  annotationId: string
  mode: AnnotationIslandMode
  anchorX?: number
  anchorY?: number
  nonce: number
}

export function useAnnotationInteractionController() {
  const [state, dispatch] = React.useReducer(annotationInteractionReducer, initialAnnotationInteractionState)
  const lastHandledOpenRequestNonceRef = React.useRef<number | null>(null)

  const setDraft = React.useCallback((draft: string) => {
    dispatch(annotationInteractionActions.setDraft(draft))
  }, [])

  const openFromSelection = React.useCallback((selection: AnchoredSelection) => {
    dispatch(annotationInteractionActions.openFromSelection(selection))
  }, [])

  const openFollowUpFromSelection = React.useCallback(() => {
    dispatch(annotationInteractionActions.openFollowUpFromSelection())
  }, [])

  const openNoteFromSelection = React.useCallback(() => {
    dispatch(annotationInteractionActions.openNoteFromSelection())
  }, [])

  const openFromAnnotation = React.useCallback((
    detail: ActiveAnnotationDetail,
    noteText: string,
    mode: AnnotationIslandMode,
    editorKind: AnnotationEditorKind,
  ) => {
    dispatch(annotationInteractionActions.openFromAnnotation(detail, noteText, mode, editorKind))
  }, [])

  const setEditorKind = React.useCallback((editorKind: AnnotationEditorKind) => {
    dispatch(annotationInteractionActions.setEditorKind(editorKind))
  }, [])

  const requestEdit = React.useCallback(() => {
    dispatch(annotationInteractionActions.requestEdit())
  }, [])

  const cancelFollowUp = React.useCallback(() => {
    const hadPendingSelection = Boolean(state.pendingSelection)
    const pendingSelection = state.pendingSelection
    dispatch(annotationInteractionActions.cancelFollowUp())
    return { hadPendingSelection, pendingSelection }
  }, [state.pendingSelection])

  const closeAll = React.useCallback(() => {
    dispatch(annotationInteractionActions.closeAll())
  }, [])

  const markSubmitSuccess = React.useCallback(() => {
    dispatch(annotationInteractionActions.submitSuccess())
  }, [])

  const markDeleteSuccess = React.useCallback(() => {
    dispatch(annotationInteractionActions.deleteSuccess())
  }, [])

  const consumeExternalOpenRequest = React.useCallback((
    request: ExternalOpenAnnotationRequest | null | undefined,
    params: {
      messageId?: string
      annotations?: AnnotationV1[]
      getNoteText: (annotation: AnnotationV1) => string
      getEditorKind: (annotation: AnnotationV1) => AnnotationEditorKind
      fallbackAnchor: { x: number; y: number }
    },
  ): boolean => {
    if (!request || !params.messageId || !params.annotations?.length) return false
    if (request.messageId !== params.messageId) return false

    if (lastHandledOpenRequestNonceRef.current === request.nonce) return false

    const annotationIndex = params.annotations.findIndex(item => item.id === request.annotationId)
    if (annotationIndex < 0) return false

    lastHandledOpenRequestNonceRef.current = request.nonce

    const annotation = params.annotations[annotationIndex]
    if (!annotation) return false

    const noteText = params.getNoteText(annotation)
    const editorKind = params.getEditorKind(annotation)
    const detail: ActiveAnnotationDetail = {
      annotationId: request.annotationId,
      index: annotationIndex + 1,
      anchorX: request.anchorX ?? params.fallbackAnchor.x,
      anchorY: request.anchorY ?? params.fallbackAnchor.y,
    }

    dispatch(annotationInteractionActions.openFromAnnotation(detail, noteText, request.mode, editorKind))
    return true
  }, [])

  return {
    state,
    setDraft,
    openFromSelection,
    openFollowUpFromSelection,
    openNoteFromSelection,
    openFromAnnotation,
    setEditorKind,
    requestEdit,
    cancelFollowUp,
    closeAll,
    markSubmitSuccess,
    markDeleteSuccess,
    consumeExternalOpenRequest,
  }
}
