import { describe, expect, it } from "vite-plus/test";

import {
  findConceptTermsInText,
  isGenericTerm,
  normalizeTerm,
  scoreKeyword,
} from "@/lib/bookmarks/ranking";
import type { ConceptRecord, ExtractedPage, WeightedKeyword } from "@/lib/domain";

const page: ExtractedPage = {
  url: "https://example.com/local-first-bookmarks",
  title: "Local-first bookmark graphs",
  domain: "example.com",
  headings: ["Why local-first bookmark graphs matter"],
  articleText: "A local-first bookmark graph keeps research sources on device.",
  visibleText: "A local-first bookmark graph keeps research sources on device.",
  domOutline: "h1: Local-first bookmark graphs",
};

const keyword: WeightedKeyword = {
  term: "Local-first bookmark graphs",
  normalizedTerm: "local-first bookmark graphs",
  kind: "topic",
  relevance: 92,
  confidence: 88,
  aliases: ["bookmark graph"],
  evidenceSpans: [
    {
      text: "Local-first bookmark graphs",
      source: "title",
      reason: "Main subject",
    },
  ],
};

describe("ranking", () => {
  it("normalizes terms for canonical concept matching", () => {
    expect(normalizeTerm("  Local-first: Bookmark Graphs! ")).toBe("local-first bookmark graphs");
  });

  it("suppresses generic ambient highlight terms", () => {
    expect(isGenericTerm("model")).toBe(true);
    expect(isGenericTerm("local-first bookmark graphs")).toBe(false);
  });

  it("scores central title keywords above supporting terms", () => {
    expect(scoreKeyword(keyword, page)).toBeGreaterThan(75);
  });

  it("matches saved concepts in page text", () => {
    const concepts: readonly ConceptRecord[] = [
      {
        id: "concept:local-first-bookmark-graphs",
        term: "Local-first bookmark graphs",
        normalizedTerm: "local-first bookmark graphs",
        kind: "topic",
        aliases: ["bookmark graph"],
        lastSeenAt: new Date().toISOString(),
      },
    ];

    expect(
      findConceptTermsInText("This article discusses bookmark graph UX.", concepts, 3),
    ).toHaveLength(1);
  });
});
