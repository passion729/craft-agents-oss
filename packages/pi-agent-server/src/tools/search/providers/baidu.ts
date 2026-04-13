import { parse as parseHtml } from 'node-html-parser';
import type { WebSearchProvider, WebSearchResult } from '../types.ts';

const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
} as const;

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function normalizeBaiduUrl(href: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, 'https://www.baidu.com');
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractResultsFromBaiduHtml(html: string, count: number): WebSearchResult[] {
  const root = parseHtml(html);
  const containers = root.querySelectorAll('div.result, div.c-container');
  const results: WebSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (const container of containers) {
    if (results.length >= count) break;

    const anchor = container.querySelector('h3 a') || container.querySelector('a');
    if (!anchor) continue;

    const title = normalizeWhitespace(anchor.textContent || '');
    if (!title) continue;

    const href = anchor.getAttribute('href') || '';
    const url = normalizeBaiduUrl(href);
    if (!url || seenUrls.has(url)) continue;

    const description =
      normalizeWhitespace(
        container.querySelector('.c-abstract')?.textContent
        || container.querySelector('.c-span-last')?.textContent
        || container.querySelector('p')?.textContent
        || '',
      ) || '';

    seenUrls.add(url);
    results.push({ title, url, description });
  }

  return results;
}

export class BaiduSearchProvider implements WebSearchProvider {
  name = 'Baidu';

  async search(query: string, count: number): Promise<WebSearchResult[]> {
    const response = await fetch(`https://www.baidu.com/s?wd=${encodeURIComponent(query)}`, {
      headers: DEFAULT_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`Baidu search failed (HTTP ${response.status})`);
    }

    const html = await response.text();
    const results = extractResultsFromBaiduHtml(html, count);
    if (results.length === 0) {
      throw new Error('No results parsed from Baidu HTML');
    }
    return results;
  }
}
