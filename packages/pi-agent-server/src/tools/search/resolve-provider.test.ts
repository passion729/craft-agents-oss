import { describe, expect, it } from 'bun:test';
import { resolveSearchProvider } from './resolve-provider.ts';
import { ResponsesApiSearchProvider } from './providers/openai.ts';
import { ChatGPTBackendSearchProvider } from './providers/chatgpt.ts';
import { GoogleSearchProvider } from './providers/google.ts';
import { DDGSearchProvider } from './providers/ddg.ts';
import { BingSearchProvider } from './providers/bing.ts';
import { BaiduSearchProvider } from './providers/baidu.ts';

/** Build a minimal JWT with a chatgpt_account_id claim. */
function makeJwt(accountId: string): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      'https://api.openai.com/auth': { chatgpt_account_id: accountId },
    }),
  );
  return `${header}.${payload}.fakesig`;
}

function withPiAuth(
  piAuth: {
    provider: string;
    credential: { type: 'api_key'; key: string } | { type: 'oauth'; access: string; refresh: string; expires: number };
  },
) {
  return { piAuth };
}

describe('resolveSearchProvider', () => {
  // --- Custom endpoint (OpenAI-compatible) ---

  it('honors explicit DuckDuckGo provider preference', () => {
    const provider = resolveSearchProvider({
      webSearchProvider: 'duckduckgo',
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-test' },
      },
    });

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('honors explicit Bing provider preference', () => {
    const provider = resolveSearchProvider({
      webSearchProvider: 'bing.com',
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-test' },
      },
    });

    expect(provider).toBeInstanceOf(BingSearchProvider);
  });

  it('honors explicit Baidu provider preference', () => {
    const provider = resolveSearchProvider({
      webSearchProvider: 'baidu.com',
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-test' },
      },
    });

    expect(provider).toBeInstanceOf(BaiduSearchProvider);
  });

  it('selects ResponsesApiSearchProvider for custom openai endpoint + api_key', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-proxy' },
      },
      baseUrl: 'https://proxy.example.com/v1/',
      customEndpoint: { api: 'openai-completions' },
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.apiBase).toBe('https://proxy.example.com/v1');
    expect((provider as any).config.model).toBeUndefined();
  });

  it('uses connection model for custom openai endpoint and strips pi/ prefix', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-proxy' },
      },
      baseUrl: 'https://proxy.example.com/v1/',
      model: 'pi/gpt-4.1-mini',
      customEndpoint: { api: 'openai-completions' },
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.model).toBe('gpt-4.1-mini');
  });

  it('prefers custom endpoint over official openai route when both are present', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-proxy' },
      },
      baseUrl: 'https://my-openai-proxy.internal/v1',
      customEndpoint: { api: 'openai-completions' },
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.apiBase).toBe('https://my-openai-proxy.internal/v1');
  });

  it('uses baseUrl for openai provider even when customEndpoint metadata is missing', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-proxy' },
      },
      baseUrl: 'https://third-party-openai.example.com/v1/',
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.apiBase).toBe('https://third-party-openai.example.com/v1');
  });

  it('uses baseUrl for custom provider even when customEndpoint metadata is missing', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'my-custom-provider',
        credential: { type: 'api_key', key: 'sk-custom' },
      },
      baseUrl: 'https://custom-openai-compatible.example.com/v1',
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.apiBase).toBe('https://custom-openai-compatible.example.com/v1');
  });

  it('falls back to DDG for custom openai endpoint without baseUrl', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-proxy' },
      },
      customEndpoint: { api: 'openai-completions' },
    });

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG for custom openai endpoint without api_key', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: {
          type: 'oauth',
          access: 'token',
          refresh: 'r',
          expires: Date.now() + 60_000,
        },
      },
      baseUrl: 'https://proxy.example.com/v1',
      customEndpoint: { api: 'openai-completions' },
    });

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG for anthropic-compatible custom endpoint', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-test' },
      },
      baseUrl: 'https://anthropic-proxy.example.com/v1',
      customEndpoint: { api: 'anthropic-messages' },
    });

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  // --- OpenAI (API key) ---

  it('selects ResponsesApiSearchProvider for openai + api_key', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai',
      credential: { type: 'api_key', key: 'sk-test' },
    }));

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect(provider.name).toBe('OpenAI');
  });

  it('uses connection model for openai + api_key and strips pi/ prefix', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openai',
        credential: { type: 'api_key', key: 'sk-test' },
      },
      model: 'pi/gpt-4.1',
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.model).toBe('gpt-4.1');
  });

  // --- ChatGPT Plus (OAuth) ---

  it('selects ChatGPTBackendSearchProvider for openai-codex + oauth with valid JWT', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai-codex',
      credential: {
        type: 'oauth',
        access: makeJwt('acc_123'),
        refresh: 'r',
        expires: Date.now() + 60_000,
      },
    }));

    expect(provider).toBeInstanceOf(ChatGPTBackendSearchProvider);
    expect(provider.name).toBe('ChatGPT');
  });

  it('selects ChatGPTBackendSearchProvider for openai-codex + api_key with valid JWT token', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai-codex',
      credential: { type: 'api_key', key: makeJwt('acc_999') },
    }));

    expect(provider).toBeInstanceOf(ChatGPTBackendSearchProvider);
    expect(provider.name).toBe('ChatGPT');
  });

  it('falls back to DDG for openai-codex + oauth with malformed JWT', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai-codex',
      credential: {
        type: 'oauth',
        access: 'not-a-jwt',
        refresh: 'r',
        expires: Date.now() + 60_000,
      },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG for openai-codex + api_key with malformed non-JWT token', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai-codex',
      credential: { type: 'api_key', key: 'not-a-jwt' },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  // --- OpenRouter ---

  it('selects ResponsesApiSearchProvider for openrouter + api_key', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openrouter',
      credential: { type: 'api_key', key: 'sk-or-test' },
    }));

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect(provider.name).toBe('OpenRouter');
  });

  it('uses connection model for openrouter + api_key', () => {
    const provider = resolveSearchProvider({
      piAuth: {
        provider: 'openrouter',
        credential: { type: 'api_key', key: 'sk-or-test' },
      },
      model: 'pi/openrouter/auto',
    });

    expect(provider).toBeInstanceOf(ResponsesApiSearchProvider);
    expect((provider as any).config.model).toBe('openrouter/auto');
  });

  // --- Google ---

  it('selects Google provider for google + api_key', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'google',
      credential: { type: 'api_key', key: 'g-test' },
    }));

    expect(provider).toBeInstanceOf(GoogleSearchProvider);
  });

  // --- Fallback cases ---

  it('falls back to DDG for openai + oauth (no ChatGPT backend for plain openai)', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai',
      credential: {
        type: 'oauth',
        access: 'a',
        refresh: 'r',
        expires: Date.now() + 60_000,
      },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG when provider is unknown', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'unknown',
      credential: { type: 'api_key', key: 'x' },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG when key is empty', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'openai',
      credential: { type: 'api_key', key: '' },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG when no piAuth is provided', () => {
    expect(resolveSearchProvider()).toBeInstanceOf(DDGSearchProvider);
    expect(resolveSearchProvider(undefined)).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG for github-copilot (no search API available)', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'github-copilot',
      credential: {
        type: 'oauth',
        access: 'ghu_token',
        refresh: 'r',
        expires: Date.now() + 60_000,
      },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });

  it('falls back to DDG for vercel-ai-gateway (not yet wired for provider-native search)', () => {
    const provider = resolveSearchProvider(withPiAuth({
      provider: 'vercel-ai-gateway',
      credential: { type: 'api_key', key: 'vercel-test-key' },
    }));

    expect(provider).toBeInstanceOf(DDGSearchProvider);
  });
});
