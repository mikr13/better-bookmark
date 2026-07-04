import { asSchema, type ModelMessage } from "ai";
import { describe, expect, it } from "vite-plus/test";

import {
  PageAnalysisOutputSchema,
  analyzePageWithObjectGenerator,
  createPageAnalysisMessages,
  createTextOnlyPageAnalysisMessages,
} from "@/lib/ai/page-analysis";
import { PAGE_ANALYSIS_JSON_SCHEMA, type ExtractedPage, type PageAnalysis } from "@/lib/domain";

const PAGE_FIXTURE: ExtractedPage = {
  url: "https://example.com/biotech",
  title: "Biotechnology",
  domain: "example.com",
  description: "A page about biotechnology",
  headings: ["Applications", "Methods"],
  articleText: "Biotechnology uses organisms and biological systems.",
  visibleText: "Biotechnology and genetic engineering appear on the page.",
  domOutline: "main article h1",
};

const ANALYSIS_FIXTURE: PageAnalysis = {
  title: "Biotechnology",
  summary: "A page about biotechnology.",
  questions: [],
  keywords: [
    {
      term: "Biotechnology",
      normalizedTerm: "biotechnology",
      kind: "topic",
      relevance: 96,
      confidence: 94,
      aliases: [],
      evidenceSpans: [
        {
          text: "Biotechnology uses organisms and biological systems.",
          source: "article",
          reason: "Central page concept.",
        },
      ],
    },
  ],
};

describe("createPageAnalysisMessages", () => {
  it("includes page text and screenshot content for multimodal models", () => {
    const messages = createPageAnalysisMessages(
      PAGE_FIXTURE,
      "data:image/jpeg;base64,ZmFrZS1qcGVn",
    );
    const firstMessage = messages[0];

    expect(firstMessage?.role).toBe("user");

    if (!firstMessage || typeof firstMessage.content === "string") {
      throw new Error("Expected a multimodal user message.");
    }

    expect(firstMessage.content[0]).toMatchObject({
      type: "text",
      text: expect.stringContaining("Biotechnology"),
    });
    expect(firstMessage.content[1]).toMatchObject({
      type: "file",
      mediaType: "image/jpeg",
      data: { type: "data", data: "ZmFrZS1qcGVn" },
    });
  });
});

describe("createTextOnlyPageAnalysisMessages", () => {
  it("uses a string prompt with DOM text and no screenshot content", () => {
    const messages = createTextOnlyPageAnalysisMessages(PAGE_FIXTURE);
    const firstMessage = messages[0];

    expect(firstMessage?.role).toBe("user");
    expect(firstMessage?.content).toEqual(expect.stringContaining("DOM outline: main article h1"));
    expect(firstMessage?.content).toEqual(expect.not.stringContaining("data:image"));
  });
});

describe("analyzePageWithObjectGenerator", () => {
  it("retries once with a text-only DOM prompt when a provider rejects multimodal content", async () => {
    const calls: ModelMessage[][] = [];
    const result = await analyzePageWithObjectGenerator(
      {
        provider: "openai",
        apiKey: "sk-test-key-that-is-long-enough",
        model: "gpt-4.1",
        page: PAGE_FIXTURE,
        screenshotDataUrl: "data:image/jpeg;base64,ZmFrZS1qcGVn",
      },
      async (messages) => {
        calls.push(messages);

        if (calls.length === 1) {
          throw new Error("messages[0].content must be a string");
        }

        return { object: ANALYSIS_FIXTURE };
      },
    );

    expect(result).toEqual(ANALYSIS_FIXTURE);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.[0]?.content).toEqual(expect.any(Array));
    expect(calls[1]?.[0]?.content).toEqual(expect.stringContaining("DOM outline: main article h1"));
  });

  it("does not retry for unrelated provider errors", async () => {
    let callCount = 0;

    await expect(
      analyzePageWithObjectGenerator(
        {
          provider: "openai",
          apiKey: "sk-test-key-that-is-long-enough",
          model: "gpt-4.1",
          page: PAGE_FIXTURE,
          screenshotDataUrl: "data:image/jpeg;base64,ZmFrZS1qcGVn",
        },
        async () => {
          callCount += 1;
          throw new Error("rate limit exceeded");
        },
      ),
    ).rejects.toThrow("rate limit exceeded");

    expect(callCount).toBe(1);
  });
});

describe("PageAnalysisOutputSchema", () => {
  it("marks every keyword object property as required for OpenAI strict structured outputs", async () => {
    const jsonSchema = await asSchema(PageAnalysisOutputSchema).jsonSchema;

    expect(jsonSchema).toEqual(PAGE_ANALYSIS_JSON_SCHEMA);
    expect(PAGE_ANALYSIS_JSON_SCHEMA.properties.keywords.items.required).toEqual([
      "term",
      "normalizedTerm",
      "kind",
      "relevance",
      "confidence",
      "aliases",
      "evidenceSpans",
    ]);
  });
});
