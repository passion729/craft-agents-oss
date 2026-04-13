import { afterEach, describe, expect, it } from 'bun:test';
import { BingSearchProvider } from './bing.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('BingSearchProvider', () => {
  it('parses search results from Bing HTML', async () => {
    globalThis.fetch = (async () => {
      return new Response(
        `<!doctype html>
        <html><body>
          <li class="b_algo">
            <h2><a href="https://example.com/a">Result A</a></h2>
            <div class="b_caption"><p>Description A</p></div>
          </li>
          <li class="b_algo">
            <h2><a href="https://example.com/b">Result B</a></h2>
            <div class="b_caption"><p>Description B</p></div>
          </li>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    }) as typeof fetch;

    const provider = new BingSearchProvider();
    const results = await provider.search('craft agents', 5);

    expect(results).toHaveLength(2);
    expect(results[0]?.title).toBe('Result A');
    expect(results[0]?.url).toBe('https://example.com/a');
    expect(results[1]?.title).toBe('Result B');
  });
});
