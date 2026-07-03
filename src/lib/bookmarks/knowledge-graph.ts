import type { ConceptKind, SavedBookmark } from "@/lib/domain";

const DEFAULT_MAX_PAGES = 32;
const DEFAULT_MAX_CONCEPTS = 48;

export type KnowledgeGraphNodeKind = "page" | "concept";

export type KnowledgeGraphPageNode = {
  readonly id: string;
  readonly kind: "page";
  readonly label: string;
  readonly domain: string;
  readonly url: string;
  readonly summary: string;
  readonly savedAt: string;
  readonly conceptCount: number;
  readonly weight: number;
};

export type KnowledgeGraphConceptNode = {
  readonly id: string;
  readonly kind: "concept";
  readonly label: string;
  readonly normalizedTerm: string;
  readonly conceptKind: ConceptKind;
  readonly pageCount: number;
  readonly strength: number;
  readonly weight: number;
};

export type KnowledgeGraphNode = KnowledgeGraphPageNode | KnowledgeGraphConceptNode;

export type KnowledgeGraphLink = {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly value: number;
  readonly label: string;
};

export type KnowledgeGraphStats = {
  readonly pageCount: number;
  readonly conceptCount: number;
  readonly linkCount: number;
};

export type KnowledgeGraph = {
  readonly nodes: readonly KnowledgeGraphNode[];
  readonly links: readonly KnowledgeGraphLink[];
  readonly stats: KnowledgeGraphStats;
};

export type BuildKnowledgeGraphOptions = {
  readonly maxPages?: number;
  readonly maxConcepts?: number;
};

type ConceptAggregate = {
  concept: SavedBookmark["concepts"][number];
  totalScore: number;
  maxScore: number;
  pageIds: Set<string>;
};

function scoreWeight(score: number): number {
  return Math.max(4, Math.min(16, 4 + Math.round(score / 10)));
}

function conceptStrength(aggregate: ConceptAggregate): number {
  return Math.round(
    aggregate.maxScore * 0.65 + aggregate.totalScore * 0.25 + aggregate.pageIds.size * 8,
  );
}

function pageNodeFromBookmark(bookmark: SavedBookmark): KnowledgeGraphPageNode {
  const topScore = Math.max(0, ...bookmark.concepts.map((concept) => concept.score));

  return {
    id: `page:${bookmark.id}`,
    kind: "page",
    label: bookmark.title,
    domain: bookmark.domain,
    url: bookmark.url,
    summary: bookmark.summary,
    savedAt: bookmark.savedAt,
    conceptCount: bookmark.concepts.length,
    weight: scoreWeight(topScore),
  };
}

export function buildKnowledgeGraph(
  bookmarks: readonly SavedBookmark[],
  options: BuildKnowledgeGraphOptions = {},
): KnowledgeGraph {
  const maxPages = options.maxPages ?? DEFAULT_MAX_PAGES;
  const maxConcepts = options.maxConcepts ?? DEFAULT_MAX_CONCEPTS;
  const visibleBookmarks = bookmarks.slice(0, maxPages);
  const pageNodes = visibleBookmarks.map(pageNodeFromBookmark);
  const conceptMap = new Map<string, ConceptAggregate>();

  for (const bookmark of visibleBookmarks) {
    for (const concept of bookmark.concepts) {
      const aggregate = conceptMap.get(concept.id);
      if (aggregate) {
        aggregate.totalScore += concept.score;
        aggregate.maxScore = Math.max(aggregate.maxScore, concept.score);
        aggregate.pageIds.add(bookmark.id);
        continue;
      }

      conceptMap.set(concept.id, {
        concept,
        totalScore: concept.score,
        maxScore: concept.score,
        pageIds: new Set([bookmark.id]),
      });
    }
  }

  const conceptAggregates = [...conceptMap.values()]
    .sort((left, right) => conceptStrength(right) - conceptStrength(left))
    .slice(0, maxConcepts);
  const visibleConceptIds = new Set(conceptAggregates.map((aggregate) => aggregate.concept.id));
  const conceptNodes = conceptAggregates.map<KnowledgeGraphConceptNode>((aggregate) => {
    const strength = conceptStrength(aggregate);
    return {
      id: aggregate.concept.id,
      kind: "concept",
      label: aggregate.concept.term,
      normalizedTerm: aggregate.concept.normalizedTerm,
      conceptKind: aggregate.concept.kind,
      pageCount: aggregate.pageIds.size,
      strength,
      weight: scoreWeight(strength),
    };
  });
  const links = visibleBookmarks.flatMap((bookmark) =>
    bookmark.concepts
      .filter((concept) => visibleConceptIds.has(concept.id))
      .map<KnowledgeGraphLink>((concept) => ({
        id: `page:${bookmark.id}->${concept.id}`,
        source: `page:${bookmark.id}`,
        target: concept.id,
        value: concept.score,
        label: `${concept.term} ${concept.score}`,
      })),
  );

  return {
    nodes: [...pageNodes, ...conceptNodes],
    links,
    stats: {
      pageCount: pageNodes.length,
      conceptCount: conceptNodes.length,
      linkCount: links.length,
    },
  };
}
