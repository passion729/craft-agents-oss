/**
 * Resolves the best web search provider based on the user's LLM connection.
 *
 * Priority:
 *   1. Custom endpoint native search (OpenAI-compatible responses endpoint)
 *   2. Provider-native search (OpenAI, ChatGPT, OpenRouter, Google) — best quality
 *   3. DuckDuckGo — universal fallback, no API key required
 *
 * To add a new Responses API-compatible provider:
 *   1. Add a case here with the provider name and apiBase URL
 *   2. The ResponsesApiSearchProvider handles the rest
 */

import type { WebSearchProvider } from './types.ts'; asaaa
import { ResponsesApiSearchProvider } from './providers/openai.ts';
import { ChatGPTBackendSearchProvider, extractChatGptAccountId } from './providers/chatgpt.ts';
import { GoogleSearchProvider } from './providers/google.ts';
import { DDGSearchProvider } from './providers/ddg.ts';
import { BingSearchProvider } from './providers/bing.ts';
import { BaiduSearchProvider } from './providers/baidu.ts';

export type SearchProviderCredential =
  | { type: 'api_key'; key: string }
  | { type: 'oauth'; access: string; refresh: string; expires: number }
  | { type: string; key?: string; access?: string };

export interface SearchProviderAuthConfig {
  provider?: string;
  credential?: SearchProviderCredential;
}

export interface SearchProviderRuntimeContext {
  piAuth?: SearchProviderAuthConfig;
  baseUrl?: string;
  model?: string;
  webSearchProvider?: 'api-native' | 'duckduckgo' | 'bing.com' | 'baidu.com';
  customEndpoint?: {
    api?: string;
    supportsImages?: boolean;
  };
}

function getApiKey(piAuth?: SearchProviderAuthConfig): string | undefined {
  if (piAuth?.credential?.type !== 'api_key') return undefined;
  return typeof piAuth.credential.key === 'string' && piAuth.credential.key.length > 0
    ? piAuth.credential.key
    : undefined;
}

function getOAuthAccess(piAuth?: SearchProviderAuthConfig): string | undefined {
  if (piAuth?.credential?.type !== 'oauth') return undefined;
  const access = (piAuth.credential as { access?: string }).access;
  return typeof access === 'string' && access.length > 0 ? access : undefined;
}

/**
 * openai-codex tokens may arrive as either:
 *  - oauth.access (legacy/explicit oauth shape), or
 *  - api_key.key (current runtime shape for ChatGPT Plus OAuth bearer token)
 */
function getOpenAiCodexAccessToken(piAuth?: SearchProviderAuthConfig): string | undefined {
  if (piAuth?.provider !== 'openai-codex') return undefined;
  return getOAuthAccess(piAuth) ?? getApiKey(piAuth);
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function normalizeModelId(model?: string): string | undefined {
  const trimmed = model?.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('pi/') ? trimmed.slice(3) : trimmed;
}

export function resolveSearchProvider(context?: SearchProviderRuntimeContext): WebSearchProvider {
  const providerPreference = context?.webSearchProvider;
  if (providerPreference === 'duckduckgo') {
    return new DDGSearchProvider();
  }
  if (providerPreference === 'bing.com') {
    return new BingSearchProvider();
  }
  if (providerPreference === 'baidu.com') {
    return new BaiduSearchProvider();
  }

  const piAuth = context?.piAuth;
  const provider = piAuth?.provider;
  const apiKey = getApiKey(piAuth);
  const openAiCodexAccess = getOpenAiCodexAccessToken(piAuth);
  const customEndpointApi = context?.customEndpoint?.api;
  const customBaseUrl = context?.baseUrl?.trim();
  const preferredModel = normalizeModelId(context?.model);

  // Custom OpenAI-compatible endpoint must use the configured base URL,
  // never hardcode api.openai.com with a third-party key.
  if (customEndpointApi === 'openai-completions') {
    if (customBaseUrl && apiKey) {
      return new ResponsesApiSearchProvider({
        apiBase: normalizeBaseUrl(customBaseUrl),
        apiKey,
        ...(preferredModel ? { model: preferredModel } : {}),
      });
    }
    return new DDGSearchProvider();
  }

  // Non-OpenAI custom endpoint protocols are not wired for provider-native search yet.
  if (customEndpointApi) {
    return new DDGSearchProvider();
  }

  // Backward-compatible safeguard:
  // Any API-key provider with explicit baseUrl should prefer that endpoint when
  // search protocol is OpenAI-compatible (or protocol metadata is missing).
  // This prevents third-party OpenAI-compatible keys from being sent to api.openai.com.
  const isNonResponsesProvider = provider === 'google' || provider === 'openai-codex';
  if (apiKey && customBaseUrl && !isNonResponsesProvider) {
    return new ResponsesApiSearchProvider({
      apiBase: normalizeBaseUrl(customBaseUrl),
      apiKey,
      ...(preferredModel ? { model: preferredModel } : {}),
    });
  }

  // OpenAI with API key → standard Responses API
  if (provider === 'openai' && apiKey) {
    return new ResponsesApiSearchProvider({
      apiBase: 'https://api.openai.com/v1',
      apiKey,
      ...(preferredModel ? { model: preferredModel } : {}),
    });
  }

  // ChatGPT Plus (OpenAI OAuth bearer token) → ChatGPT backend endpoint
  // Supports both oauth.access and api_key.key token shapes.
  if (provider === 'openai-codex' && openAiCodexAccess) {
    const accountId = extractChatGptAccountId(openAiCodexAccess);
    if (accountId) {
      return new ChatGPTBackendSearchProvider(openAiCodexAccess, accountId);
    }
    // Can't extract accountId (malformed/non-JWT token) → fall through to DDG
  }

  // OpenRouter → same Responses API format, different base URL
  if (provider === 'openrouter' && apiKey) {
    return new ResponsesApiSearchProvider({
      apiBase: 'https://openrouter.ai/api/v1',
      apiKey,
      model: preferredModel || 'openai/gpt-4o-mini',
    });
  }

  // Google → Gemini API with native Google Search grounding
  if (provider === 'google' && apiKey) {
    return new GoogleSearchProvider(apiKey);
  }

  // Vercel AI Gateway is currently not wired to provider-native search routing.
  // It intentionally falls back to DDG until we add an explicit Responses API mapping.

  // Universal fallback — no API key required
  return new DDGSearchProvider();
}
