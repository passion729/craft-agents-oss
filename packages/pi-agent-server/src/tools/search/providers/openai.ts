/**
 * Responses API search provider — works with any endpoint that implements the
 * OpenAI Responses API format with a built-in `web_search` tool.
 *
 * Supports:
 *   - api.openai.com/v1  (OpenAI direct)
 *   - openrouter.ai/api/v1  (OpenRouter)
 *   - Any future Responses API-compatible endpoint
 */

import type { WebSearchProvider, WebSearchResult } from '../types.ts';
import { parseResponsesApiResults, type ResponsesApiResponse } from './responses-api-parser.ts';

const DEFAULT_SEARCH_MODEL = 'gpt-4o-mini';

export interface ResponsesApiSearchConfig {
  /** Base URL without trailing slash (e.g. "https://api.openai.com/v1") */
  apiBase: string;
  /** Bearer token for Authorization header */
  apiKey: string;
  /** Model to use for the search call (default: gpt-4o-mini) */
  model?: string;
  /** Additional headers to include in the request */
  extraHeaders?: Record<string, string>;
  /** Display name for this provider (default: derived from apiBase) */
  displayName?: string;
}

export class ResponsesApiSearchProvider implements WebSearchProvider {
  name: string;

  constructor(private config: ResponsesApiSearchConfig) {
    this.name = config.displayName || deriveDisplayName(config.apiBase);
  }

  async search(query: string, count: number): Promise<WebSearchResult[]> {
    const preferredModel = this.config.model || DEFAULT_SEARCH_MODEL;
    const primaryAttempt = await this.runSearch(query, count, preferredModel);

    if (
      !primaryAttempt.ok &&
      preferredModel !== DEFAULT_SEARCH_MODEL &&
      shouldFallbackToDefaultModel(primaryAttempt.errorText)
    ) {
      const fallbackAttempt = await this.runSearch(query, count, DEFAULT_SEARCH_MODEL);
      if (fallbackAttempt.ok) {
        return parseResponsesApiResults(fallbackAttempt.data, query, count);
      }

      throw new Error(
        `${this.name} search failed with preferred model "${preferredModel}" (HTTP ${primaryAttempt.status}): ${primaryAttempt.errorText}; fallback model "${DEFAULT_SEARCH_MODEL}" failed (HTTP ${fallbackAttempt.status}): ${fallbackAttempt.errorText}`,
      );
    }

    if (!primaryAttempt.ok) {
      throw new Error(`${this.name} search failed (HTTP ${primaryAttempt.status}): ${primaryAttempt.errorText}`);
    }

    const data = primaryAttempt.data;
    return parseResponsesApiResults(data, query, count);
  }

  private async runSearch(
    query: string,
    count: number,
    model: string,
  ): Promise<
    | { ok: true; data: ResponsesApiResponse }
    | { ok: false; status: number; errorText: string }
  > {
    const response = await fetch(`${this.config.apiBase}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...this.config.extraHeaders,
      },
      body: JSON.stringify({
        model,
        tools: [{ type: 'web_search' }],
        input: `Search the web for: ${query}\n\nReturn the top ${count} results with title, URL, and a brief description.`,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        errorText: await response.text(),
      };
    }

    return {
      ok: true,
      data: await parseSearchResponsePayload(response),
    };
  }
}

/**
 * @deprecated Use `ResponsesApiSearchProvider` instead.
 * Kept as a re-export for backwards compatibility with existing imports.
 */
export const OpenAISearchProvider = ResponsesApiSearchProvider;

function deriveDisplayName(apiBase: string): string {
  if (apiBase.includes('openrouter')) return 'OpenRouter';
  if (apiBase.includes('openai.com')) return 'OpenAI';
  return 'Web Search';
}

function shouldFallbackToDefaultModel(errorText: string): boolean {
  const lower = errorText.toLowerCase();
  return (
    lower.includes('model_not_supported_in_group') ||
    lower.includes('model_not_supported') ||
    lower.includes('model_not_found') ||
    lower.includes('unknown model') ||
    lower.includes('does not exist')
  );
}

async function parseSearchResponsePayload(response: Response): Promise<ResponsesApiResponse> {
  const contentType = response.headers.get('content-type') || '';
  const raw = await response.text();
  const trimmed = raw.trimStart();

  const looksLikeSse =
    contentType.includes('text/event-stream') ||
    trimmed.startsWith('event:') ||
    trimmed.startsWith('data:') ||
    raw.includes('\ndata:') ||
    raw.includes('\n\nevent:');

  if (looksLikeSse) {
    return parseSseResponsePayload(raw);
  }

  return JSON.parse(raw) as ResponsesApiResponse;
}

function parseSseResponsePayload(sseText: string): ResponsesApiResponse {
  let completed: ResponsesApiResponse | null = null;

  for (const chunk of sseText.split('\n\n')) {
    const dataLines = chunk
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .filter(Boolean);

    for (const line of dataLines) {
      if (line === '[DONE]') continue;

      let event: any;
      try {
        event = JSON.parse(line);
      } catch {
        continue;
      }

      if (event?.type === 'response.completed' || event?.type === 'response.done') {
        if (event.response && typeof event.response === 'object') {
          completed = event.response as ResponsesApiResponse;
        }
      } else if (event?.output || event?.output_text) {
        // Some proxies stream the final payload without wrapping it in response.completed.
        completed = event as ResponsesApiResponse;
      }
    }
  }

  if (!completed) {
    throw new Error('Search stream returned no completed response payload');
  }

  return completed;
}
