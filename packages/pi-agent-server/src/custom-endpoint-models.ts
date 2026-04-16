export type CustomEndpointInput = 'text' | 'image'
export type CustomEndpointApi = 'openai-completions' | 'anthropic-messages'

export interface CustomEndpointModelDefaults {
  supportsImages?: boolean
}

export interface CustomEndpointModelOverrides {
  contextWindow?: number
  supportsImages?: boolean
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
  api?: CustomEndpointApi,
) {
  const supportsImages = overrides?.supportsImages ?? defaults?.supportsImages ?? true
  const input: CustomEndpointInput[] = supportsImages ? ['text', 'image'] : ['text']
  const compat = api === 'openai-completions'
    ? {
      // Use conservative defaults for third-party OpenAI-compatible endpoints.
      // Many providers reject one or more of these OpenAI-specific fields.
      supportsUsageInStreaming: false,
      supportsStore: false,
      supportsStrictMode: false,
      requiresAssistantAfterToolResult: true,
      requiresToolResultName: true,
    }
    : undefined

  return {
    id,
    name: id,
    reasoning: false,
    input,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: overrides?.contextWindow ?? 131_072,
    maxTokens: 8_192,
    ...(compat ? { compat } : {}),
  }
}
