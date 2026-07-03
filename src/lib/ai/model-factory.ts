import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import { ollama } from "ai-sdk-ollama";

import type { AIProvider } from "@/lib/domain";

type AIModelConfig = {
  readonly provider: AIProvider;
  readonly apiKey?: string;
  readonly model: string;
};

function assertNever(_value: never): never {
  throw new Error("Unsupported AI provider.");
}

function requireApiKey(provider: AIProvider, apiKey: string | undefined): string {
  if (!apiKey) {
    throw new Error(`${provider} API key is required.`);
  }

  return apiKey;
}

export function getAIModel(config: AIModelConfig): LanguageModel {
  switch (config.provider) {
    case "openai":
      return createOpenAI({ apiKey: requireApiKey(config.provider, config.apiKey) })(config.model);
    case "anthropic":
      return createAnthropic({
        apiKey: requireApiKey(config.provider, config.apiKey),
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      })(config.model);
    case "groq":
      return createOpenAI({
        apiKey: requireApiKey(config.provider, config.apiKey),
        baseURL: "https://api.groq.com/openai/v1",
        name: "groq",
      }).chat(config.model);
    case "deepseek":
      return createOpenAI({
        apiKey: requireApiKey(config.provider, config.apiKey),
        baseURL: "https://api.deepseek.com/v1",
        name: "deepseek",
      }).chat(config.model);
    case "gemini":
      return createGoogleGenerativeAI({ apiKey: requireApiKey(config.provider, config.apiKey) })(
        config.model,
      );
    case "ollama":
      return ollama(config.model);
    default:
      return assertNever(config.provider);
  }
}
