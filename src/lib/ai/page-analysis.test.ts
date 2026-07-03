import { describe, expect, it } from "vite-plus/test";

import { createPageAnalysisMessages } from "@/lib/ai/page-analysis";
import type { ExtractedPage } from "@/lib/domain";

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
