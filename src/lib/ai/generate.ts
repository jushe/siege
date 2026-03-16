import { generateText } from "ai";
import { getConfiguredModel } from "./config";
import type { Provider } from "./provider";

/**
 * Generate text using the configured AI provider (SDK mode).
 * No CLI fallback — requires provider with API key or proxy configured.
 */
export async function generateTextAuto(options: {
  provider?: Provider;
  model?: string;
  system: string;
  prompt: string;
  sessionId?: string;
}): Promise<{ text: string; sessionId?: string }> {
  const model = getConfiguredModel(options.provider, options.model);
  const result = await generateText({
    model,
    system: options.system,
    prompt: options.prompt,
  });
  return { text: result.text.trim() };
}
