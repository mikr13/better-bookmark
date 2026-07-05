import { describe, expect, it } from "vite-plus/test";

import { buildKnowledgeGraph } from "@/lib/bookmarks/knowledge-graph";
import type { SavedBookmark } from "@/lib/domain";

function bookmark(id: string, title: string, concepts: SavedBookmark["concepts"]): SavedBookmark {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    domain: "example.com",
    summary: `${title} summary`,
    tags: [],
    savedAt: `2026-07-0${id === "one" ? "3" : "2"}T00:00:00.000Z`,
    updatedAt: `2026-07-0${id === "one" ? "3" : "2"}T00:00:00.000Z`,
    concepts,
  };
}

const biotechnology = {
  id: "concept:biotechnology",
  term: "Biotechnology",
  normalizedTerm: "biotechnology",
  kind: "topic",
  aliases: [],
  lastSeenAt: "2026-07-03T00:00:00.000Z",
  score: 96,
} satisfies SavedBookmark["concepts"][number];

const geneticEngineering = {
  id: "concept:genetic-engineering",
  term: "Genetic engineering",
  normalizedTerm: "genetic engineering",
  kind: "method",
  aliases: [],
  lastSeenAt: "2026-07-03T00:00:00.000Z",
  score: 82,
} satisfies SavedBookmark["concepts"][number];

describe("knowledge graph", () => {
  it("builds page and concept nodes from saved bookmarks", () => {
    const graph = buildKnowledgeGraph([
      bookmark("one", "Biotechnology", [biotechnology, geneticEngineering]),
      bookmark("two", "Genetic engineering", [biotechnology]),
    ]);

    expect(graph.stats).toEqual({ pageCount: 2, conceptCount: 2, linkCount: 3 });
    expect(graph.nodes.map((node) => node.id)).toContain("page:one");
    expect(graph.nodes.map((node) => node.id)).toContain("concept:biotechnology");
    expect(graph.links.find((link) => link.id === "page:one->concept:biotechnology")?.value).toBe(
      96,
    );
  });

  it("aggregates shared concepts across pages", () => {
    const graph = buildKnowledgeGraph([
      bookmark("one", "Biotechnology", [biotechnology]),
      bookmark("two", "Genetic engineering", [biotechnology]),
    ]);
    const concept = graph.nodes.find((node) => node.id === "concept:biotechnology");

    expect(concept?.kind).toBe("concept");
    expect(concept?.kind === "concept" ? concept.pageCount : 0).toBe(2);
  });

  it("caps visible concepts by graph strength", () => {
    const graph = buildKnowledgeGraph(
      [bookmark("one", "Biotechnology", [biotechnology, geneticEngineering])],
      { maxConcepts: 1 },
    );

    expect(graph.stats.conceptCount).toBe(1);
    expect(graph.nodes.map((node) => node.id)).toContain("concept:biotechnology");
    expect(graph.nodes.map((node) => node.id)).not.toContain("concept:genetic-engineering");
  });
});
