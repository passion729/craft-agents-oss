import { describe, expect, it } from 'bun:test';
import { piDriver } from '../pi.ts';

describe('piDriver.buildRuntime', () => {
  it('infers Responses API for legacy official OpenAI endpoint metadata', () => {
    const runtime = piDriver.buildRuntime({
      context: {
        connection: {
          slug: 'openai',
          name: 'OpenAI',
          providerType: 'pi_compat',
          authType: 'api_key_with_endpoint',
          piAuthProvider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          models: ['pi/gpt-5.4'],
          defaultModel: 'pi/gpt-5.4',
          createdAt: Date.now(),
        },
        provider: 'pi',
        resolvedModel: 'pi/gpt-5.4',
        capabilities: { needsHttpPoolServer: false },
      },
      providerOptions: undefined,
      resolvedPaths: {
        nodeRuntimePath: '/node',
        piServerPath: '/pi-server',
        interceptorBundlePath: '/interceptor',
      },
    } as any);

    expect(runtime.customEndpoint).toEqual({ api: 'openai-responses' });
  });

  it('preserves explicit supportsImages overrides from custom model entries', () => {
    const runtime = piDriver.buildRuntime({
      context: {
        connection: {
          slug: 'custom',
          name: 'Custom',
          providerType: 'pi_compat',
          authType: 'api_key_with_endpoint',
          baseUrl: 'http://localhost:11434/v1',
          customEndpoint: { api: 'openai-responses' },
          models: [
            { id: 'pi/text-only', supportsImages: false },
            { id: 'pi/vision', supportsImages: true },
            { id: 'pi/ctx', contextWindow: 262_144 },
            { id: 'pi/plain' },
          ],
          createdAt: Date.now(),
        },
        provider: 'pi',
        resolvedModel: 'pi/text-only',
        capabilities: { needsHttpPoolServer: false },
      },
      providerOptions: undefined,
      resolvedPaths: {
        nodeRuntimePath: '/node',
        piServerPath: '/pi-server',
        interceptorBundlePath: '/interceptor',
      },
    } as any);

    expect(runtime.customModels).toEqual([
      { id: 'pi/text-only', supportsImages: false },
      { id: 'pi/vision', supportsImages: true },
      { id: 'pi/ctx', contextWindow: 262_144 },
      'pi/plain',
    ]);
  });
});
