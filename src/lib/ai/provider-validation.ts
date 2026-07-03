import ky from "ky";

import { OPENAI_COMPATIBLE_MODELS_URLS, providerHeaders } from "@/lib/ai/provider-http";
import { getProviderConfig } from "@/lib/ai/provider-registry";
import type { AIProvider } from "@/lib/domain";

export async function validateProviderConnection(
  provider: AIProvider,
  apiKey?: string,
): Promise<boolean> {
  try {
    switch (provider) {
      case "openai":
      case "groq":
      case "deepseek": {
        if (!apiKey) {
          return false;
        }

        const response = await ky.get(OPENAI_COMPATIBLE_MODELS_URLS[provider], {
          headers: providerHeaders(getProviderConfig(provider), apiKey),
          timeout: 10000,
          throwHttpErrors: false,
        });
        return response.ok;
      }
      case "anthropic": {
        if (!apiKey) {
          return false;
        }

        const response = await ky.get("https://api.anthropic.com/v1/models", {
          headers: providerHeaders(getProviderConfig(provider), apiKey),
          timeout: 10000,
          throwHttpErrors: false,
        });
        return response.ok;
      }
      case "gemini": {
        if (!apiKey) {
          return false;
        }

        const response = await ky.get("https://generativelanguage.googleapis.com/v1/models", {
          headers: providerHeaders(getProviderConfig(provider), apiKey),
          timeout: 10000,
          throwHttpErrors: false,
        });
        return response.ok;
      }
      case "ollama": {
        const response = await ky.get("http://localhost:11434/api/tags", {
          timeout: 3000,
          throwHttpErrors: false,
        });
        return response.ok;
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }

    throw error;
  }
}
