import { afterEach, describe, expect, it } from 'bun:test';
import { BaiduSearchProvider } from './baidu.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('BaiduSearchProvider', () => {
  it('parses search results from Baidu HTML', async () => {
    globalThis.fetch = (async () => {
      return new Response(
        `<!doctype html>
        <html><body>
          <div class="result c-container">
            <h3><a href="https://example.cn/a">结果A</a></h3>
            <div class="c-abstract">描述A</div>
          </div>
          <div class="result c-container">
            <h3><a href="https://example.cn/b">结果B</a></h3>
            <div class="c-abstract">描述B</div>
          </div>
        </body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html' } },
      );
    }) as typeof fetch;

    const provider = new BaiduSearchProvider();
    const results = await provider.search('craft agents', 5);

    expect(results).toHaveLength(2);
    expect(results[0]?.title).toBe('结果A');
    expect(results[0]?.url).toBe('https://example.cn/a');
    expect(results[1]?.title).toBe('结果B');
  });
});
