import type { AssistantTurn } from '@craft-agent/ui'

export interface TurnExpansionStrategyInput {
  storedExpanded: boolean
  hasManualOverride: boolean
  hasAutoManaged: boolean
  shouldAutoExpand: boolean
}

/**
 * Auto-expand while the assistant turn is streaming.
 * This includes both intermediate/tool-phase streaming and final response streaming.
 */
export function shouldAutoExpandAssistantTurn(turn: Pick<AssistantTurn, 'isStreaming'>): boolean {
  return turn.isStreaming
}

/**
 * Expansion priority:
 * 1) Manual override (persisted user choice)
 * 2) Auto-managed + active auto condition => expanded
 * 3) Auto-managed + auto condition ended => collapsed
 * 4) Stored expansion state
 */
export function resolveTurnExpandedState(input: TurnExpansionStrategyInput): boolean {
  const {
    storedExpanded,
    hasManualOverride,
    hasAutoManaged,
    shouldAutoExpand,
  } = input

  if (hasManualOverride) return storedExpanded
  if (hasAutoManaged && shouldAutoExpand) return true
  if (hasAutoManaged && !shouldAutoExpand) return false
  return storedExpanded
}
