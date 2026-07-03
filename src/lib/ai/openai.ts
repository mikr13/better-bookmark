import { analyzePageWithProvider } from "@/lib/ai/page-analysis";
import {
  FALLBACK_PROVIDER_MODELS,
  isMultimodalOpenAIModel,
  listProviderModels,
  validateProviderConnection,
} from "@/lib/ai/providers";
import type { ExtractedPage, PageAnalysis, ProviderModel } from "@/lib/domain";

export const FALLBACK_OPENAI_MODELS = FALLBACK_PROVIDER_MODELS.openai;
export { isMultimodalOpenAIModel };

export function listOpenAIModels(apiKey: string): Promise<readonly ProviderModel[]> {
  return listProviderModels("openai", apiKey);
}

export function validateOpenAIKey(apiKey: string): Promise<boolean> {
  return validateProviderConnection("openai", apiKey);
}

export function analyzePageWithOpenAI(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly page: ExtractedPage;
  readonly screenshotDataUrl: string;
}): Promise<PageAnalysis> {
  return analyzePageWithProvider({
    provider: "openai",
    apiKey: input.apiKey,
    model: input.model,
    page: input.page,
    screenshotDataUrl: input.screenshotDataUrl,
  });
}
