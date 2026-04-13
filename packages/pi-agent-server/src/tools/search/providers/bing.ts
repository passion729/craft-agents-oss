import { parse as parseHtml } from 'node-html-parser';
import type { WebSearchProvider, WebSearchResult } from '../types.ts';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html',
  'Accept-Language': 'en-US,en;q=0.9',
} as const;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeBingUrl(href: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://www.bing.com');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractResultsFromBingHtml(html: string, count: number): WebSearchResult[] {
  const root = parseHtml(html);
  const items = root.querySelectorAll('li.b_algo');
  const results: WebSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const item of items) {
    if (results.length >= count) break;

    const anchor = item.querySelector('h2 a') || item.querySelector('a');
    if (!anchor) continue;

    const title = normalizeWhitespace(anchor.textContent || '');
    if (!title) continue;

    const href = anchor.getAttribute('href') || '';
    const url = normalizeBingUrl(href);
    if (!url || seenUrls.has(url)) continue;

    const description =
      normalizeWhitespace(
        item.querySelector('.b_caption p')?.textContent
        || item.querySelector('p')?.textContent
        || '',
      ) || '';

    seenUrls.add(url);
    results.push({ title, url, description });
  }

  return results;
}

export class BingSearchProvider implements WebSearchProvider {
  name = 'Bing';

  async search(query: string, count: number): Promise<WebSearchResult[]> {
    const response = await fetch(`https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${Math.max(1, count)}`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Bing search failed (HTTP ${response.status})`);
    }

    const html = await response.text();
    const results = extractResultsFromBingHtml(html, count);
    if (results.length === 0) {
      throw new Error('No results parsed from Bing HTML');
    }
    return results;
  }
}
