import { describe, expect, it } from "vite-plus/test";

import {
  AI_PROVIDER_IDS,
  FALLBACK_PROVIDER_MODELS,
  defaultModelForProvider,
  isMultimodalOllamaModel,
  isProviderConfigured,
  providerNeedsApiKey,
} from "@/lib/ai/providers";
import { defaultSettings } from "@/lib/domain";

describe("AI provider registry", () => {
  it("keeps Superfill-style providers available for analysis", () => {
    expect(AI_PROVIDER_IDS).toEqual([
      "openai",
      "anthropic",
      // "groq",
      // "deepseek",
      "gemini",
      "ollama",
    ]);
    expect(defaultModelForProvider("openai")).toBe("gpt-5.5");
    expect(defaultModelForProvider("anthropic")).toBe("claude-haiku-4-5-20251001");
    // expect(defaultModelForProvider("groq")).toBe("llama-4-maverick");
    expect(defaultModelForProvider("gemini")).toBe("models/gemini-2.5-flash");
    expect(defaultModelForProvider("ollama")).toBe("llama3.2-vision");
  });

  it("models cloud providers as key-backed and Ollama as local", () => {
    expect(providerNeedsApiKey("openai")).toBe(true);
    expect(providerNeedsApiKey("anthropic")).toBe(true);
    // expect(providerNeedsApiKey("groq")).toBe(true);
    expect(providerNeedsApiKey("gemini")).toBe(true);
    expect(providerNeedsApiKey("ollama")).toBe(false);
    expect(isProviderConfigured({ ...defaultSettings, selectedAIProvider: "ollama" })).toBe(true);
    expect(isProviderConfigured({ ...defaultSettings, selectedAIProvider: "openai" })).toBe(false);
  });

  it("only lists screenshot-capable local model families for Ollama", () => {
    expect(isMultimodalOllamaModel("llama3.2-vision")).toBe(true);
    expect(isMultimodalOllamaModel("gemma3:12b")).toBe(true);
    expect(isMultimodalOllamaModel("llava:latest")).toBe(true);
    expect(isMultimodalOllamaModel("llama3.2")).toBe(false);
  });

  it("uses multimodal fallback models for every provider", () => {
    expect(FALLBACK_PROVIDER_MODELS.openai.every((model) => model.description.length > 0)).toBe(
      true,
    );
    expect(FALLBACK_PROVIDER_MODELS.anthropic[0]?.id).toContain("claude");
    expect(FALLBACK_PROVIDER_MODELS.gemini[0]?.id).toContain("gemini");
    expect(FALLBACK_PROVIDER_MODELS.ollama.map((model) => model.id)).toContain("llama3.2-vision");
  });
});
