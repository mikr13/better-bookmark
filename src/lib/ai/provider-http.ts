import type { ProviderConfig } from "@/lib/ai/provider-registry";

// export type OpenAICompatibleProvider = "openai" | "groq" | "deepseek";
export type OpenAICompatibleProvider = "openai";

export const OPENAI_COMPATIBLE_MODELS_URLS = {
  openai: "https://api.openai.com/v1/models",
  // groq: "https://api.groq.com/openai/v1/models",
  // deepseek: "https://api.deepseek.com/v1/models",
} satisfies Record<OpenAICompatibleProvider, string>;

export function providerHeaders(config: ProviderConfig, apiKey: string): Record<string, string> {
  switch (config.id) {
    case "openai":
      return { Authorization: `Bearer ${apiKey}` };
    // case "groq":
    // case "deepseek":
    //   return { Authorization: `Bearer ${apiKey}` };
    case "anthropic":
      return { "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
    case "gemini":
      return { "x-goog-api-key": apiKey };
    case "ollama":
      return {};
  }
}
