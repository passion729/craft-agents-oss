export const WEB_SEARCH_PROVIDER_PREFERENCES = [
  'api-native',
  'duckduckgo',
  'bing.com',
  'baidu.com',
] as const;

export type WebSearchProviderPreference = (typeof WEB_SEARCH_PROVIDER_PREFERENCES)[number];

export function isWebSearchProviderPreference(value: unknown): value is WebSearchProviderPreference {
  return (
    typeof value === 'string'
    && (WEB_SEARCH_PROVIDER_PREFERENCES as readonly string[]).includes(value)
  );
}
