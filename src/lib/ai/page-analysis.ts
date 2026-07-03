import { generateObject, type ModelMessage } from "ai";

import { getAIModel } from "@/lib/ai/model-factory";
import type { AIProvider, ExtractedPage, PageAnalysis } from "@/lib/domain";
import { PageAnalysisSchema } from "@/lib/domain";

type AnalyzePageInput = {
  readonly provider: AIProvider;
  readonly apiKey?: string;
  readonly model: string;
  readonly page: ExtractedPage;
  readonly screenshotDataUrl: string;
};

type ScreenshotData = {
  readonly mediaType: string;
  readonly data: string;
};

function screenshotData(dataUrl: string): ScreenshotData {
  const separatorIndex = dataUrl.indexOf(",");
  const metadata = separatorIndex >= 0 ? dataUrl.slice(0, separatorIndex) : "";
  const data = separatorIndex >= 0 ? dataUrl.slice(separatorIndex + 1) : dataUrl;
  const mediaTypeEnd = metadata.indexOf(";");
  const mediaType =
    metadata.startsWith("data:") && mediaTypeEnd > "data:".length
      ? metadata.slice("data:".length, mediaTypeEnd)
      : "image/jpeg";

  return { mediaType, data };
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

export function createPageAnalysisMessages(
  page: ExtractedPage,
  screenshotDataUrl: string,
): ModelMessage[] {
  const screenshot = screenshotData(screenshotDataUrl);

  return [
    {
      role: "user",
      content: [
        { type: "text", text: buildPrompt(page) },
        {
          type: "file",
          mediaType: screenshot.mediaType,
          data: { type: "data", data: screenshot.data },
          providerOptions: { openai: { imageDetail: "low" } },
        },
      ],
    },
  ];
}

export async function analyzePageWithProvider(input: AnalyzePageInput): Promise<PageAnalysis> {
  const modelConfig =
    input.apiKey === undefined
      ? { provider: input.provider, model: input.model }
      : { provider: input.provider, apiKey: input.apiKey, model: input.model };
  const result = await generateObject({
    model: getAIModel(modelConfig),
    schema: PageAnalysisSchema,
    schemaName: "better_bookmarks_page_analysis",
    schemaDescription: "Saved page concept graph analysis for Better Bookmarks.",
    messages: createPageAnalysisMessages(input.page, input.screenshotDataUrl),
  });

  return PageAnalysisSchema.parse(result.object);
}
