import type { SessionFilter } from '../../shared/types'

/**
 * Build a stable per-filter key for last-selected session persistence.
 * Dynamic IDs are URI-encoded to avoid delimiter collisions.
 */
export function buildSessionFilterMemoryKey(filter: SessionFilter): string {
  switch (filter.kind) {
    case 'allSessions':
      return 'allSessions'
    case 'flagged':
      return 'flagged'
    case 'archived':
      return 'archived'
    case 'state':
      return `state:${encodeURIComponent(filter.stateId)}`
    case 'label':
      return `label:${encodeURIComponent(filter.labelId)}`
    case 'view':
      return `view:${encodeURIComponent(filter.viewId)}`
    default:
      return 'allSessions'
  }
}

/**
 * Build storage suffix for per-workspace + per-filter persistence.
 */
export function buildLastSelectedSessionStorageSuffix(
  workspaceId: string,
  filter: SessionFilter,
): string {
  return `${workspaceId}::${buildSessionFilterMemoryKey(filter)}`
}

interface ResolveLastSelectedSessionIdOptions {
  workspaceId: string
  filter: SessionFilter
  sessionIdsInFilter: readonly string[]
  getScopedValue: (suffix: string) => string | null
  getLegacyWorkspaceValue: (workspaceId: string) => string | null
}

/**
 * Resolve the persisted last-selected session for a filter.
 *
 * Precedence:
 * 1) Scoped value (workspace + filter)
 * 2) Legacy workspace-level value (allSessions only, backward compatibility)
 */
export function resolveLastSelectedSessionIdForFilter({
  workspaceId,
  filter,
  sessionIdsInFilter,
  getScopedValue,
  getLegacyWorkspaceValue,
}: ResolveLastSelectedSessionIdOptions): string | null {
  if (sessionIdsInFilter.length === 0) return null

  const validIds = new Set(sessionIdsInFilter)
  const scopedSuffix = buildLastSelectedSessionStorageSuffix(workspaceId, filter)
  const scoped = getScopedValue(scopedSuffix)
  if (scoped && validIds.has(scoped)) return scoped

  if (filter.kind === 'allSessions') {
    const legacy = getLegacyWorkspaceValue(workspaceId)
    if (legacy && validIds.has(legacy)) return legacy
  }

  return null
}

