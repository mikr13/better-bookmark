import ky from "ky";
import { z } from "zod";

import {
  OPENAI_COMPATIBLE_MODELS_URLS,
  providerHeaders,
  type OpenAICompatibleProvider,
} from "@/lib/ai/provider-http";
import { FALLBACK_PROVIDER_MODELS, getProviderConfig } from "@/lib/ai/provider-registry";
import type { AIProvider, ProviderModel } from "@/lib/domain";

const MODEL_EXCLUSIONS = [
  "audio",
  "dall",
  "embedding",
  "image",
  "moderation",
  "realtime",
  "search",
  "speech",
  "transcribe",
  "tts",
  "whisper",
] as const;

const OpenAIModelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

const AnthropicModelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1), display_name: z.string().min(1) })),
});

const GeminiModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      name: z.string().min(1),
      displayName: z.string().min(1),
      supportedGenerationMethods: z.array(z.string()).default([]),
    }),
  ),
});

const OllamaTagsResponseSchema = z.object({
  models: z.array(z.object({ name: z.string().min(1) })),
});

function modelName(id: string): string {
  return id
    .split(/[-_:/.]/)
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toLocaleUpperCase() + part.slice(1))
    .join(" ");
}

export function isMultimodalOpenAIModel(id: string): boolean {
  const lower = id.toLocaleLowerCase();

  if (MODEL_EXCLUSIONS.some((excluded) => lower.includes(excluded))) {
    return false;
  }

  return (
    lower.startsWith("gpt-5") ||
    lower.startsWith("gpt-4.1") ||
    lower.startsWith("gpt-4o") ||
    lower.startsWith("o3") ||
    lower.startsWith("o4")
  );
}

export function isMultimodalOllamaModel(id: string): boolean {
  const lower = id.toLocaleLowerCase();
  return (
    lower.includes("vision") ||
    lower.startsWith("gemma3") ||
    lower.includes("llava") ||
    lower.includes("bakllava") ||
    lower.includes("minicpm-v") ||
    lower.includes("moondream") ||
    lower.includes("qwen2.5vl") ||
    lower.includes("qwen2-vl")
  );
}

function sortModels(
  provider: AIProvider,
  models: readonly ProviderModel[],
): readonly ProviderModel[] {
  const priority = new Map<string, number>(
    FALLBACK_PROVIDER_MODELS[provider].map((model, index) => [model.id, index]),
  );
  return [...models].sort((left, right) => {
    const leftRank = priority.get(left.id) ?? 100;
    const rightRank = priority.get(right.id) ?? 100;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.id.localeCompare(right.id);
  });
}

async function listOpenAICompatibleModels(
  provider: OpenAICompatibleProvider,
  apiKey: string,
): Promise<readonly ProviderModel[]> {
  const response = await ky.get(OPENAI_COMPATIBLE_MODELS_URLS[provider], {
    headers: providerHeaders(getProviderConfig(provider), apiKey),
    timeout: 10000,
    throwHttpErrors: false,
  });

  if (!response.ok) {
    return FALLBACK_PROVIDER_MODELS[provider];
  }

  const parsed = OpenAIModelsResponseSchema.safeParse(await response.json<unknown>());

  if (!parsed.success) {
    return FALLBACK_PROVIDER_MODELS[provider];
  }

  const models = parsed.data.data
    .map((model) => model.id)
    .filter(isMultimodalOpenAIModel)
    .map((id) => ({ id, name: modelName(id), description: "Available provider model" }));

  return models.length > 0 ? sortModels(provider, models) : FALLBACK_PROVIDER_MODELS[provider];
}

async function listAnthropicModels(apiKey: string): Promise<readonly ProviderModel[]> {
  const response = await ky.get("https://api.anthropic.com/v1/models", {
    headers: providerHeaders(getProviderConfig("anthropic"), apiKey),
    timeout: 10000,
    throwHttpErrors: false,
  });

  if (!response.ok) {
    return FALLBACK_PROVIDER_MODELS.anthropic;
  }

  const parsed = AnthropicModelsResponseSchema.safeParse(await response.json<unknown>());

  if (!parsed.success) {
    return FALLBACK_PROVIDER_MODELS.anthropic;
  }

  const models = parsed.data.data.map((model) => ({
    id: model.id,
    name: model.display_name,
    description: "Claude multimodal model",
  }));

  return models.length > 0 ? sortModels("anthropic", models) : FALLBACK_PROVIDER_MODELS.anthropic;
}

async function listGeminiModels(apiKey: string): Promise<readonly ProviderModel[]> {
  const response = await ky.get("https://generativelanguage.googleapis.com/v1/models", {
    headers: providerHeaders(getProviderConfig("gemini"), apiKey),
    timeout: 10000,
    throwHttpErrors: false,
  });

  if (!response.ok) {
    return FALLBACK_PROVIDER_MODELS.gemini;
  }

  const parsed = GeminiModelsResponseSchema.safeParse(await response.json<unknown>());

  if (!parsed.success) {
    return FALLBACK_PROVIDER_MODELS.gemini;
  }

  const models = parsed.data.models
    .filter((model) => model.name.includes("gemini"))
    .filter((model) => model.supportedGenerationMethods.includes("generateContent"))
    .map((model) => ({
      id: model.name,
      name: model.displayName,
      description: "Gemini multimodal model",
    }));

  return models.length > 0 ? sortModels("gemini", models) : FALLBACK_PROVIDER_MODELS.gemini;
}

async function listOllamaModels(): Promise<readonly ProviderModel[]> {
  const response = await ky.get("http://localhost:11434/api/tags", {
    timeout: 3000,
    throwHttpErrors: false,
  });

  if (!response.ok) {
    return FALLBACK_PROVIDER_MODELS.ollama;
  }

  const parsed = OllamaTagsResponseSchema.safeParse(await response.json<unknown>());

  if (!parsed.success) {
    return FALLBACK_PROVIDER_MODELS.ollama;
  }

  const models = parsed.data.models
    .map((model) => model.name)
    .filter(isMultimodalOllamaModel)
    .map((id) => ({ id, name: modelName(id), description: "Local multimodal model" }));

  return models.length > 0 ? sortModels("ollama", models) : FALLBACK_PROVIDER_MODELS.ollama;
}

export async function listProviderModels(
  provider: AIProvider,
  apiKey?: string,
): Promise<readonly ProviderModel[]> {
  try {
    switch (provider) {
      case "openai":
        return apiKey
          ? listOpenAICompatibleModels(provider, apiKey)
          : FALLBACK_PROVIDER_MODELS[provider];
      case "anthropic":
        return apiKey ? listAnthropicModels(apiKey) : FALLBACK_PROVIDER_MODELS.anthropic;
      case "gemini":
        return apiKey ? listGeminiModels(apiKey) : FALLBACK_PROVIDER_MODELS.gemini;
      case "ollama":
        return listOllamaModels();
    }
  } catch (error) {
    if (error instanceof Error) {
      return FALLBACK_PROVIDER_MODELS[provider];
    }

    throw error;
  }
}
