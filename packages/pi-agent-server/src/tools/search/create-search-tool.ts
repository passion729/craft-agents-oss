/**
 * Creates a `web_search` AgentTool backed by the given search provider.
 *
 * The tool name is always `web_search` regardless of the underlying provider,
 * so the model doesn't need to know which backend is used.
 */

import { Type } from '@sinclair/typebox';
import type { AgentTool } from '@mariozechner/pi-agent-core';
import type { WebSearchProvider, WebSearchResult } from './types.ts';
import { DDGSearchProvider } from './providers/ddg.ts';

const schema = Type.Object({
  query: Type.Optional(Type.String({ description: 'The search query' })),
  q: Type.Optional(Type.String({ description: 'Alias for query' })),
  searchQuery: Type.Optional(Type.String({ description: 'Alias for query' })),
  keyword: Type.Optional(Type.String({ description: 'Alias for query' })),
  count: Type.Optional(
    Type.Number({
      description: 'Max results (1-10, default 5)',
      minimum: 1,
      maximum: 10,
    }),
  ),
});

function formatResults(
  query: string,
  providerName: string,
  results: WebSearchResult[],
  note?: string,
) {
  const formatted = results
    .map(
      (r, i) =>
        `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description}`,
    )
    .join('\n\n');

  const noteText = note ? `${note}\n\n` : '';

  return {
    content: [
      {
        type: 'text' as const,
        text: `${noteText}Search results for "${query}" (via ${providerName}):\n\n${formatted}`,
      },
    ],
    details: {},
  };
}

function formatErrorSnippet(message: string, max = 180): string {
  const compact = message.replace(/\s+/g, ' ').trim();
  if (!compact) return 'unknown error';
  return compact.length > max ? `${compact.slice(0, max - 1)}…` : compact;
}

function resolveQuery(params: {
  query?: unknown;
  q?: unknown;
  searchQuery?: unknown;
  keyword?: unknown;
}): string | null {
  const candidates = [params.query, params.q, params.searchQuery, params.keyword];
  for (const value of candidates) {
    if (typeof value !== 'string') continue;
    const normalized = value.trim();
    if (normalized.length > 0) return normalized;
  }
  return null;
}

export function createSearchTool(
  provider: WebSearchProvider,
  fallbackProvider: WebSearchProvider = new DDGSearchProvider(),
): AgentTool<typeof schema> {
  return {
    name: 'web_search',
    label: 'Web Search',
    description:
      'Search the web for current information. Returns titles, URLs, and snippets. Use for current information, documentation lookups, or fact-checking.',
    promptSnippet:
      'Use web_search for up-to-date information, documentation lookups, or fact-checking. Returns titles, URLs, and snippets. Pass a non-empty query (field: query) and optional count (1-10).',
    parameters: schema,
    async execute(toolCallId, params) {
      const query = resolveQuery(params);
      if (!query) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'web_search requires a non-empty `query` argument. Example: {"query":"latest bun release notes","count":5}',
            },
          ],
          details: { isError: true },
        };
      }

      const count = Math.max(1, Math.min(10, params.count ?? 5));

      try {
        const results = await provider.search(query, count);
        return formatResults(query, provider.name, results);
      } catch (err) {
        const primaryMsg = err instanceof Error ? err.message : String(err);

        const canFallback = provider.name !== fallbackProvider.name;
        if (canFallback) {
          try {
            const fallbackResults = await fallbackProvider.search(query, count);
            return formatResults(
              query,
              fallbackProvider.name,
              fallbackResults,
              `Primary search provider (${provider.name}) failed (${formatErrorSnippet(primaryMsg)}), automatically fell back to ${fallbackProvider.name}.`,
            );
          } catch (fallbackErr) {
            const fallbackMsg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Search failed for "${query}": primary (${provider.name}) failed with "${primaryMsg}"; fallback (${fallbackProvider.name}) failed with "${fallbackMsg}"`,
                },
              ],
              details: { isError: true },
            };
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: `Search failed for "${query}": ${primaryMsg}`,
            },
          ],
          details: { isError: true },
        };
      }
    },
  };
}
