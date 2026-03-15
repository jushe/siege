import { describe, it, expect } from "vitest";
import { getModelId, SUPPORTED_PROVIDERS } from "@/lib/ai/provider";

describe("AI Provider", () => {
  it("should list supported providers", () => {
    expect(SUPPORTED_PROVIDERS).toContain("anthropic");
    expect(SUPPORTED_PROVIDERS).toContain("openai");
  });

  it("should build anthropic model id", () => {
    const modelId = getModelId("anthropic", "claude-sonnet-4-20250514");
    expect(modelId).toBe("anthropic/claude-sonnet-4-20250514");
  });

  it("should build openai model id", () => {
    const modelId = getModelId("openai", "gpt-4o");
    expect(modelId).toBe("openai/gpt-4o");
  });

  it("should use default model for provider", () => {
    const modelId = getModelId("anthropic");
    expect(modelId).toMatch(/^anthropic\//);
  });

  it("should throw for unsupported provider", () => {
    expect(() => getModelId("unsupported" as any)).toThrow();
  });
});
