import {
  AIProviderSchema,
  type AIProvider,
  type AppSettings,
  type ProviderModel,
} from "@/lib/domain";

export const AI_PROVIDER_IDS = AIProviderSchema.options;

export type ProviderConfig = {
  readonly id: AIProvider;
  readonly name: string;
  readonly description: string;
  readonly requiresApiKey: boolean;
  readonly keyPlaceholder: string;
  readonly apiKeyUrl?: string;
};

export const PROVIDER_REGISTRY = {
  openai: {
    id: "openai",
    name: "OpenAI",
    description: "GPT-5, GPT-o models and more",
    requiresApiKey: true,
    keyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    description: "Claude 4.1 models (Opus, Sonnet, Haiku)",
    requiresApiKey: true,
    keyPlaceholder: "sk-ant-...",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
  },
  groq: {
    id: "groq",
    name: "Groq",
    description: "Fast Llama models",
    requiresApiKey: true,
    keyPlaceholder: "gsk_...",
    apiKeyUrl: "https://console.groq.com/keys",
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek models",
    requiresApiKey: true,
    keyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    description: "Google Gemini models with large context windows",
    requiresApiKey: true,
    keyPlaceholder: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/app/api-keys",
  },
  ollama: {
    id: "ollama",
    name: "Ollama (Local)",
    description: "Run models locally on your machine",
    requiresApiKey: false,
    keyPlaceholder: "http://localhost:11434",
  },
} as const satisfies Record<AIProvider, ProviderConfig>;

export const FALLBACK_PROVIDER_MODELS = {
  openai: [
    { id: "gpt-5.5", name: "GPT-5.5", description: "Latest flagship multimodal model" },
    { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", description: "Lower latency multimodal model" },
    { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", description: "Lowest cost multimodal model" },
    { id: "gpt-4.1", name: "GPT-4.1", description: "Multimodal GPT-4 family model" },
    { id: "gpt-4o", name: "GPT-4o", description: "Omni multimodal model" },
  ],
  anthropic: [
    {
      id: "claude-haiku-4-5-20251001",
      name: "Claude Haiku 4.5",
      description: "Fast Claude multimodal model",
    },
  ],
  groq: [
    {
      id: "llama-4-maverick",
      name: "Llama 4 Maverick",
      description: "Fast multimodal Llama model",
    },
  ],
  deepseek: [{ id: "deepseek-chat", name: "DeepSeek Chat", description: "DeepSeek model" }],
  gemini: [
    {
      id: "models/gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description: "Large-context multimodal model",
    },
  ],
  ollama: [
    {
      id: "llama3.2-vision",
      name: "Llama 3.2 Vision",
      description: "Local text and screenshot capable model",
    },
    { id: "gemma3:4b", name: "Gemma 3 - 4B", description: "Local multimodal model" },
    { id: "llava:latest", name: "LLaVA", description: "Local vision-language model" },
  ],
} as const satisfies Record<AIProvider, readonly ProviderModel[]>;

export function getProviderConfig(provider: AIProvider): ProviderConfig {
  return PROVIDER_REGISTRY[provider];
}

export function providerNeedsApiKey(provider: AIProvider): boolean {
  return getProviderConfig(provider).requiresApiKey;
}

export function isProviderConfigured(
  settings: AppSettings,
  provider: AIProvider = settings.selectedAIProvider,
): boolean {
  return providerNeedsApiKey(provider) ? settings.configuredProviders[provider] === true : true;
}

export function defaultModelForProvider(provider: AIProvider): string {
  return FALLBACK_PROVIDER_MODELS[provider][0]?.id ?? "";
}

export function selectedModelForProvider(settings: AppSettings, provider: AIProvider): string {
  return settings.selectedProviderModels[provider] ?? defaultModelForProvider(provider);
}

export function isPlausibleProviderKey(provider: AIProvider, value: string): boolean {
  const trimmed = value.trim();

  switch (provider) {
    case "openai":
    case "deepseek":
      return trimmed.startsWith("sk-") && trimmed.length > 20;
    case "anthropic":
      return trimmed.startsWith("sk-ant-") && trimmed.length > 20;
    case "groq":
      return trimmed.startsWith("gsk_") && trimmed.length > 20;
    case "gemini":
      return trimmed.startsWith("AIza") && trimmed.length > 20;
    case "ollama":
      return true;
  }
}
