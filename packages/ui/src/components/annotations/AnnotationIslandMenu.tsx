import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { Check, Copy, CornerDownRight, Highlighter, NotebookPen } from 'lucide-react'
import {
  Island,
  IslandContentView,
  IslandFollowUpContentView,
  type IslandTransitionConfig,
} from '../ui'
import { cn } from '../../lib/utils'
import { clampIslandAnchorX, getDefaultIslandWidthEstimate } from './island-motion'
import { useTranslation } from 'react-i18next'
import type { AnnotationEditorKind } from './annotation-core'

export type AnnotationIslandView = 'compact' | 'editor'
export type AnnotationIslandMode = 'edit' | 'view'

export interface AnnotationIslandMenuProps {
  anchor: { x: number; y: number } | null
  sourceKey: string
  replayNonce: number
  isVisible: boolean
  /** Render via React portal to document.body (default). Disable inside modal/dialog contexts. */
  usePortal?: boolean
  activeView: AnnotationIslandView
  mode: AnnotationIslandMode
  draft: string
  onDraftChange: (next: string) => void
  onOpenFollowUp: () => void
  onOpenNote: () => void
  onHighlight: () => void
  onCancel: () => void
  onRequestBack?: () => boolean
  onRequestEdit: () => void
  editorKind: AnnotationEditorKind
  copyText?: string
  onSubmit: (value: string) => void
  onSubmitAndSend?: (value: string) => void
  onDelete?: () => void
  sendMessageKey?: 'enter' | 'cmd-enter'
  transitionConfig: IslandTransitionConfig
  onExitComplete?: () => void
  zIndex?: React.CSSProperties['zIndex']
  overlayZIndex?: React.CSSProperties['zIndex']
}

export function AnnotationIslandMenu({
  anchor,
  sourceKey,
  replayNonce,
  isVisible,
  activeView,
  mode,
  draft,
  onDraftChange,
  onOpenFollowUp,
  onOpenNote,
  onHighlight,
  onCancel,
  onRequestBack,
  onRequestEdit,
  editorKind,
  copyText,
  onSubmit,
  onSubmitAndSend,
  onDelete,
  sendMessageKey = 'enter',
  transitionConfig,
  onExitComplete,
  zIndex = 'var(--z-island, 400)',
  overlayZIndex,
  usePortal = true,
}: AnnotationIslandMenuProps) {
  const { t } = useTranslation()
  const menuRef = React.useRef<HTMLDivElement>(null)
  const [activeViewSize, setActiveViewSize] = React.useState<{ width: number; height: number } | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Keep blocker behind the island menu when consumers pass a custom numeric zIndex
  // (for example TurnCard uses zIndex=50). Otherwise fall back to the semantic island token.
  const resolvedOverlayZIndex = React.useMemo<React.CSSProperties['zIndex']>(() => {
    if (overlayZIndex != null) return overlayZIndex
    if (typeof zIndex === 'number') return zIndex - 1
    return 'var(--z-island-overlay, 390)'
  }, [overlayZIndex, zIndex])

  const anchorX = React.useMemo(() => {
    if (typeof window === 'undefined') return 0
    if (!anchor) return window.innerWidth / 2

    const width = activeViewSize?.width ?? getDefaultIslandWidthEstimate()
    return clampIslandAnchorX(anchor.x, width)
  }, [anchor, activeViewSize])

  React.useEffect(() => {
    setCopied(false)
  }, [sourceKey])

  const handleCopySelection = React.useCallback(async () => {
    const text = copyText?.trim()
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return

    await navigator.clipboard.writeText(text)
    setCopied(true)
  }, [copyText])

  if (!anchor) return null

  const editorTitle = editorKind === 'note' ? t('chat.notes') : t('chat.followUp')
  const editorPlaceholder = editorKind === 'note'
    ? t('chat.notesPlaceholder')
    : t('chat.annotationPlaceholder')

  const menuNode = (
    <div
      ref={menuRef}
      data-ca-annotation-island="true"
      className="fixed"
      style={{
        zIndex,
        left: anchorX,
        top: Math.max(36, anchor.y),
        transform: 'translate(-50%, -100%)',
      }}
    >
      <Island
        key={sourceKey}
        activeViewId={activeView}
        radius={12}
        className="border-border/40 bg-background/75 backdrop-blur-xl backdrop-saturate-150 shadow-strong"
        onActiveViewSizeChange={setActiveViewSize}
        isVisible={isVisible}
        onExitComplete={onExitComplete}
        replayEntryKey={`${sourceKey}:${replayNonce}`}
        replayOnVisible="always"
        transitionConfig={transitionConfig}
        dialogBehavior="back-or-close"
        onRequestBack={onRequestBack}
        onRequestClose={onCancel}
        overlayZIndex={resolvedOverlayZIndex}
      >
        <IslandContentView id="compact" anchorX="center" anchorY="bottom">
          <div className="p-1 flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenFollowUp}
              className={cn(
                'h-[30px] px-2.5 rounded-[8px] text-[13px] font-medium inline-flex items-center gap-1.5',
                'text-foreground/85 hover:text-foreground hover:bg-foreground/5',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              <span>{t('chat.followUp')}</span>
            </button>
            <button
              type="button"
              onClick={onHighlight}
              className={cn(
                'h-[30px] px-2.5 rounded-[8px] text-[13px] font-medium inline-flex items-center gap-1.5',
                'text-foreground/85 hover:text-foreground hover:bg-foreground/5',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span>{t('chat.highlight')}</span>
            </button>
            <button
              type="button"
              onClick={onOpenNote}
              className={cn(
                'h-[30px] px-2.5 rounded-[8px] text-[13px] font-medium inline-flex items-center gap-1.5',
                'text-foreground/85 hover:text-foreground hover:bg-foreground/5',
                'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
              )}
            >
              <NotebookPen className="h-3.5 w-3.5" />
              <span>{t('chat.notes')}</span>
            </button>
            {copyText?.trim() ? (
              <button
                type="button"
                onClick={() => {
                  void handleCopySelection()
                }}
                className={cn(
                  'h-[30px] px-2.5 rounded-[8px] text-[13px] font-medium inline-flex items-center gap-1.5',
                  'text-foreground/85 hover:text-foreground hover:bg-foreground/5',
                  'focus:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                )}
                title={copied ? t('common.copied') : t('common.copy')}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? t('common.copied') : t('common.copy')}</span>
              </button>
            ) : null}
          </div>
        </IslandContentView>

        <IslandFollowUpContentView
          id="editor"
          mode={mode}
          value={draft}
          onValueChange={onDraftChange}
          onCancel={onCancel}
          onRequestEdit={onRequestEdit}
          kind={editorKind}
          onSubmit={onSubmit}
          onSubmitAndSend={editorKind === 'follow-up' ? onSubmitAndSend : undefined}
          onDelete={onDelete}
          title={editorTitle}
          submitLabel={t('common.save')}
          placeholder={editorPlaceholder}
          maxInputHeight={320}
          sendMessageKey={sendMessageKey}
          lockScroll
          blockOutsideInteraction
        />
      </Island>
    </div>
  )

  return usePortal ? ReactDOM.createPortal(menuNode, document.body) : menuNode
}
