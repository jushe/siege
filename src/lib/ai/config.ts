import { getDb } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createModel, SUPPORTED_PROVIDERS, type Provider, type ProviderConfig } from "./provider";

function getSetting(key: string): string | undefined {
  const db = getDb();
  const s = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .get();
  return s?.value || undefined;
}

const ENV_KEY_MAP: Record<Provider, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  glm: "GLM_API_KEY",
};

/**
 * Check if a provider has an API key configured (env or DB).
 */
export function hasApiKey(provider?: Provider): boolean {
  const resolvedProvider =
    provider || (getSetting("default_provider") as Provider) || "anthropic";
  const apiKey =
    process.env[ENV_KEY_MAP[resolvedProvider]] ||
    getSetting(`${resolvedProvider}_api_key`);
  return !!apiKey;
}

/**
 * Get the configured model for a provider, respecting custom base URLs
 * and API keys stored in settings or env vars.
 */
/**
 * Returns true if default provider is "acp" (not an SDK provider).
 */
export function isAcpDefault(): boolean {
  return getSetting("default_provider") === "acp";
}

export function getConfiguredModel(provider?: Provider, model?: string) {
  let resolvedProvider =
    provider || (getSetting("default_provider") as Provider) || "anthropic";

  // "acp" is not an SDK provider — fallback to first configured SDK provider
  if (resolvedProvider === ("acp" as string)) {
    const fallback = SUPPORTED_PROVIDERS.find((p) => {
      const key = process.env[ENV_KEY_MAP[p]] || getSetting(`${p}_api_key`);
      return !!key;
    });
    resolvedProvider = fallback || "anthropic";
  }

  const resolvedModel = model || getSetting(`default_model_${resolvedProvider}`) || getSetting("default_model") || undefined;

  const config: ProviderConfig = {};
  const baseURL = getSetting(`${resolvedProvider}_base_url`);
  const apiKey =
    process.env[ENV_KEY_MAP[resolvedProvider]] ||
    getSetting(`${resolvedProvider}_api_key`);

  if (baseURL) config.baseURL = baseURL;
  if (apiKey) config.apiKey = apiKey;

  return createModel(resolvedProvider, resolvedModel, config);
}
