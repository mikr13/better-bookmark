import { describe, expect, it } from "vite-plus/test";

import { createGraphRenderData } from "@/components/app/knowledge-graph-render-data";
import type { KnowledgeGraph } from "@/lib/bookmarks/knowledge-graph";

const graph = {
  nodes: [
    {
      id: "page:one",
      kind: "page",
      label: "Biotechnology",
      domain: "en.wikipedia.org",
      url: "https://en.wikipedia.org/wiki/Biotechnology",
      summary: "Biotechnology summary",
      savedAt: "2026-07-03T00:00:00.000Z",
      conceptCount: 2,
      weight: 14,
    },
    {
      id: "concept:biotechnology",
      kind: "concept",
      label: "Biotechnology",
      normalizedTerm: "biotechnology",
      conceptKind: "topic",
      pageCount: 2,
      strength: 120,
      weight: 16,
    },
  ],
  links: [
    {
      id: "page:one->concept:biotechnology",
      source: "page:one",
      target: "concept:biotechnology",
      value: 96,
      label: "Biotechnology 96",
    },
  ],
  stats: { pageCount: 1, conceptCount: 1, linkCount: 1 },
} satisfies KnowledgeGraph;

describe("knowledge graph render data", () => {
  it("places pages and concepts in separate readable lanes", () => {
    const data = createGraphRenderData(graph);
    const page = data.nodes.find((node) => node.id === "page:one");
    const concept = data.nodes.find((node) => node.id === "concept:biotechnology");

    expect(page?.fx).toBeLessThan(0);
    expect(concept?.fx).toBeGreaterThan(0);
    expect(page?.fy).toBe(0);
    expect(concept?.fy).toBe(0);
  });
});
