export const SUPPORTED_PROVIDERS = ["anthropic", "openai"] as const;
export type Provider = (typeof SUPPORTED_PROVIDERS)[number];

const DEFAULT_MODELS: Record<Provider, string> = {
  anthropic: "claude-sonnet-4-20250514",
  openai: "gpt-4o",
};

export function getModelId(provider: Provider, model?: string): string {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  const modelName = model || DEFAULT_MODELS[provider];
  return `${provider}/${modelName}`;
}
