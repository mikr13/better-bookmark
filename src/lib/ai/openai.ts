import ky from "ky";
import { z } from "zod";

import {
  PAGE_ANALYSIS_JSON_SCHEMA,
  PageAnalysisSchema,
  type ExtractedPage,
  type PageAnalysis,
  type ProviderModel,
} from "@/lib/domain";

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

export const FALLBACK_OPENAI_MODELS: readonly ProviderModel[] = [
  { id: "gpt-5.5", name: "GPT-5.5", description: "Latest flagship multimodal model" },
  { id: "gpt-5.4-mini", name: "GPT-5.4 Mini", description: "Lower latency multimodal model" },
  { id: "gpt-5.4-nano", name: "GPT-5.4 Nano", description: "Lowest cost multimodal model" },
  { id: "gpt-4.1", name: "GPT-4.1", description: "Multimodal GPT-4 family model" },
  { id: "gpt-4o", name: "GPT-4o", description: "Omni multimodal model" },
];

const ModelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().min(1) })),
});

const ResponsesOutputContentSchema = z.object({
  type: z.string(),
  text: z.string().optional(),
});

const ResponsesOutputSchema = z.object({
  output_text: z.string().optional(),
  output: z
    .array(z.object({ content: z.array(ResponsesOutputContentSchema).optional() }))
    .optional(),
});

function modelName(id: string): string {
  return id
    .split("-")
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

function sortModels(models: readonly ProviderModel[]): readonly ProviderModel[] {
  const priority = new Map(FALLBACK_OPENAI_MODELS.map((model, index) => [model.id, index]));
  return [...models].sort((left, right) => {
    const leftRank = priority.get(left.id) ?? 100;
    const rightRank = priority.get(right.id) ?? 100;

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.id.localeCompare(right.id);
  });
}

export async function listOpenAIModels(apiKey: string): Promise<readonly ProviderModel[]> {
  try {
    const response = await ky.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
      throwHttpErrors: false,
    });

    if (!response.ok) {
      return FALLBACK_OPENAI_MODELS;
    }

    const parsed = ModelsResponseSchema.safeParse(await response.json<unknown>());

    if (!parsed.success) {
      return FALLBACK_OPENAI_MODELS;
    }

    const fetched = parsed.data.data
      .map((model) => model.id)
      .filter(isMultimodalOpenAIModel)
      .map((id) => ({
        id,
        name: modelName(id),
        description: "Text and screenshot capable",
      }));

    return fetched.length > 0 ? sortModels(fetched) : FALLBACK_OPENAI_MODELS;
  } catch (error) {
    if (error instanceof Error) {
      return FALLBACK_OPENAI_MODELS;
    }

    throw error;
  }
}

export async function validateOpenAIKey(apiKey: string): Promise<boolean> {
  try {
    const response = await ky.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10000,
      throwHttpErrors: false,
    });

    return response.ok;
  } catch (error) {
    if (error instanceof Error) {
      return false;
    }

    throw error;
  }
}

function buildPrompt(page: ExtractedPage): string {
  return [
    "Analyze this saved web page for a local-first bookmark graph.",
    "Use the screenshot and text together. Return only schema-valid JSON.",
    "Extract 12-40 high-signal keywords. Omit generic terms unless part of a specific phrase.",
    "Calibrate relevance: 90-100 central thesis, 70-89 important subtopic, 40-69 context.",
    "Confidence measures whether the keyword is meaningful page content, not chrome.",
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    `Description: ${page.description ?? ""}`,
    `Headings: ${page.headings.join(" | ")}`,
    `Article text: ${page.articleText.slice(0, 12000)}`,
    `Visible text: ${page.visibleText.slice(0, 5000)}`,
    `DOM outline: ${page.domOutline.slice(0, 3000)}`,
  ].join("\n\n");
}

function responseText(response: unknown): string {
  const parsed = ResponsesOutputSchema.parse(response);

  if (parsed.output_text) {
    return parsed.output_text;
  }

  const contentText = parsed.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("");

  if (contentText) {
    return contentText;
  }

  throw new Error("OpenAI response did not include output text.");
}

export async function analyzePageWithOpenAI(input: {
  readonly apiKey: string;
  readonly model: string;
  readonly page: ExtractedPage;
  readonly screenshotDataUrl: string;
}): Promise<PageAnalysis> {
  const response = await ky
    .post("https://api.openai.com/v1/responses", {
      headers: { Authorization: `Bearer ${input.apiKey}` },
      timeout: 60000,
      json: {
        model: input.model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: buildPrompt(input.page) },
              {
                type: "input_image",
                image_url: input.screenshotDataUrl,
                detail: "low",
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "better_bookmarks_page_analysis",
            strict: true,
            schema: PAGE_ANALYSIS_JSON_SCHEMA,
          },
        },
      },
    })
    .json<unknown>();

  return PageAnalysisSchema.parse(JSON.parse(responseText(response)));
}
