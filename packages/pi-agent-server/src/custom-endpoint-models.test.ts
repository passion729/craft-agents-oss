import { describe, expect, it } from 'bun:test'
import {
  buildCustomEndpointModelDef,
  normalizeCustomEndpointApi,
  normalizeCustomEndpointModelEntry,
  stripPiPrefix,
} from './custom-endpoint-models.ts'

describe('normalizeCustomEndpointApi', () => {
  it('upgrades legacy OpenAI completions protocol to responses', () => {
    expect(normalizeCustomEndpointApi('openai-completions')).toBe('openai-responses')
    expect(normalizeCustomEndpointApi('openai-responses')).toBe('openai-responses')
  })
})

describe('normalizeCustomEndpointModelEntry', () => {
  it('strips pi/ prefixes from string model IDs', () => {
    expect(stripPiPrefix('pi/my-model')).toBe('my-model')
    expect(normalizeCustomEndpointModelEntry('pi/my-model')).toEqual({ id: 'my-model' })
  })

  it('preserves per-model image support when enabled', () => {
    expect(normalizeCustomEndpointModelEntry({
      id: 'pi/vision-model',
      supportsImages: true,
    })).toEqual({
      id: 'vision-model',
      supportsImages: true,
    })
  })

  it('preserves explicit per-model image support when disabled', () => {
    expect(normalizeCustomEndpointModelEntry({
      id: 'pi/text-only-model',
      supportsImages: false,
    })).toEqual({
      id: 'text-only-model',
      supportsImages: false,
    })
  })

  it('preserves context window and image support together', () => {
    expect(normalizeCustomEndpointModelEntry({
      id: 'pi/vision-model',
      contextWindow: 262_144,
      supportsImages: true,
    })).toEqual({
      id: 'vision-model',
      contextWindow: 262_144,
      supportsImages: true,
    })
  })
})

describe('buildCustomEndpointModelDef', () => {
  it('defaults custom endpoint models to image-capable input', () => {
    const model = buildCustomEndpointModelDef('my-model')
    expect(model.input).toEqual(['text', 'image'])
  })

  it('lets connection-level defaults disable image input', () => {
    const model = buildCustomEndpointModelDef('text-only-model', { supportsImages: false })
    expect(model.input).toEqual(['text'])
  })

  it('lets per-model overrides disable image input even when the connection default is enabled', () => {
    const model = buildCustomEndpointModelDef('text-only-model', { supportsImages: true }, { supportsImages: false })
    expect(model.input).toEqual(['text'])
  })

  it('lets per-model overrides enable image input and custom context window', () => {
    const model = buildCustomEndpointModelDef('vision-model', undefined, { supportsImages: true, contextWindow: 262_144 })
    expect(model.input).toEqual(['text', 'image'])
    expect(model.contextWindow).toBe(262_144)
  })

  it('does not set chat-completions compat overrides for responses custom endpoints', () => {
    const model = buildCustomEndpointModelDef('my-model', undefined, undefined, 'openai-responses')
    expect(model.compat).toBeUndefined()
  })

  it('does not set compat overrides for anthropic-compatible custom endpoints', () => {
    const model = buildCustomEndpointModelDef('my-model', undefined, undefined, 'anthropic-messages')
    expect(model.compat).toBeUndefined()
  })
})
