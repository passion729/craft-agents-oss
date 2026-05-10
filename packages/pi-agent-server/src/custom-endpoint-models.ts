export type CustomEndpointInput = 'text' | 'image'
export type CustomEndpointApi = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

/** Normalize legacy OpenAI Chat Completions configs to the Responses API. */
export function normalizeCustomEndpointApi(api: CustomEndpointApi): CustomEndpointApi {
  return api === 'openai-completions' ? 'openai-responses' : api
}

export interface CustomEndpointModelDefaults {
  supportsImages?: boolean
}

export interface CustomEndpointModelOverrides {
  contextWindow?: number
  supportsImages?: boolean
}

export interface CustomEndpointModelEntry extends CustomEndpointModelOverrides {
  id: string
}

export type CustomEndpointModelConfig = string | {
  id: string
  contextWindow?: number
  supportsImages?: boolean
}

/** Strip bare model IDs (remove pi/ prefix if present). */
export function stripPiPrefix(id: string): string {
  return id.startsWith('pi/') ? id.slice(3) : id
}

/**
 * Normalize a user-configured custom endpoint model for Pi SDK registration.
 *
 * Keep explicit per-model capability overrides intact. In particular,
 * `supportsImages: false` is meaningful because it can override a global
 * endpoint default of `supportsImages: true` for text-only models.
 */
export function normalizeCustomEndpointModelEntry(model: CustomEndpointModelConfig): CustomEndpointModelEntry {
  if (typeof model === 'string') {
    return { id: stripPiPrefix(model) }
  }

  return {
    id: stripPiPrefix(model.id),
    ...(model.contextWindow !== undefined ? { contextWindow: model.contextWindow } : {}),
    ...(model.supportsImages !== undefined ? { supportsImages: model.supportsImages } : {}),
  }
}

/**
 * Build a synthetic model definition for a custom endpoint.
 * Uses reasonable defaults for context window and max tokens since we can't
 * query the endpoint for its actual capabilities. Image support is enabled
 * by default and can be disabled per-endpoint or per-model.
 */
export function buildCustomEndpointModelDef(
  id: string,
  defaults?: CustomEndpointModelDefaults,
  overrides?: CustomEndpointModelOverrides,
  _api?: CustomEndpointApi,
) {
  const supportsImages = overrides?.supportsImages ?? defaults?.supportsImages ?? true
  const input: CustomEndpointInput[] = supportsImages ? ['text', 'image'] : ['text']

  return {
    id,
    name: id,
    reasoning: false,
    input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: overrides?.contextWindow ?? 131_072,
    maxTokens: 8_192,
  }
}
