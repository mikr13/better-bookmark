import { describe, expect, it } from "vite-plus/test";

import { highlightTermsForBookmarks } from "@/lib/bookmarks/highlight-index";
import type { SavedBookmark } from "@/lib/domain";

function bookmark(
  id: string,
  title: string,
  concepts: SavedBookmark["concepts"] = [],
): SavedBookmark {
  return {
    id,
    title,
    url: `https://en.wikipedia.org/wiki/${id}`,
    domain: "en.wikipedia.org",
    summary: `${title} summary`,
    savedAt: "2026-07-03T00:00:00.000Z",
    updatedAt: "2026-07-03T00:00:00.000Z",
    concepts,
  };
}

const agriculture = {
  id: "concept:agriculture",
  term: "agriculture",
  normalizedTerm: "agriculture",
  kind: "topic",
  aliases: [],
  lastSeenAt: "2026-07-03T00:00:00.000Z",
  score: 80,
} satisfies SavedBookmark["concepts"][number];

describe("highlightTermsForBookmarks", () => {
  it("includes clean saved page titles even when the AI concepts miss the title term", () => {
    const terms = highlightTermsForBookmarks([
      bookmark("Biotechnology", "Biotechnology", [agriculture]),
    ]);

    expect(terms.map((term) => term.normalizedTerm)).toContain("biotechnology");
    expect(terms.map((term) => term.normalizedTerm)).toContain("agriculture");
  });

  it("strips browser title suffixes before adding title terms", () => {
    const terms = highlightTermsForBookmarks([bookmark("Gene", "Gene - Wikipedia")]);

    expect(terms.map((term) => term.normalizedTerm)).toContain("gene");
    expect(terms.map((term) => term.normalizedTerm)).not.toContain("gene - wikipedia");
  });
});
