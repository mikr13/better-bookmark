import type {
  ConceptRecord,
  ExtractedPage,
  PageConceptEdgeRecord,
  SavedBookmark,
  WeightedKeyword,
} from "@/lib/domain";

const GENERIC_TERMS = new Set([
  "ai",
  "api",
  "app",
  "data",
  "model",
  "models",
  "page",
  "research",
  "system",
  "tool",
  "tools",
  "user",
  "users",
  "web",
]);

export function normalizeTerm(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isGenericTerm(normalizedTerm: string): boolean {
  return normalizedTerm.length < 3 || GENERIC_TERMS.has(normalizedTerm);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function includesTerm(haystack: string, needle: string): boolean {
  return normalizeTerm(haystack).includes(needle);
}

function titleHeadingBoost(keyword: WeightedKeyword, page: ExtractedPage): number {
  if (includesTerm(page.title, keyword.normalizedTerm)) {
    return 100;
  }

  return page.headings.some((heading) => includesTerm(heading, keyword.normalizedTerm)) ? 75 : 30;
}

function evidenceQuality(keyword: WeightedKeyword): number {
  const sourceCount = new Set(keyword.evidenceSpans.map((span) => span.source)).size;
  const spanScore = Math.min(100, keyword.evidenceSpans.length * 24);
  return clampScore(spanScore * 0.65 + sourceCount * 12);
}

function termFrequencySignal(keyword: WeightedKeyword, page: ExtractedPage): number {
  const text = normalizeTerm(`${page.title} ${page.articleText} ${page.visibleText}`);

  if (!text || !keyword.normalizedTerm) {
    return 0;
  }

  const matches = text.split(keyword.normalizedTerm).length - 1;
  return clampScore(Math.min(matches, 8) * 12.5);
}

export function scoreKeyword(keyword: WeightedKeyword, page: ExtractedPage): number {
  return clampScore(
    keyword.relevance * 0.45 +
      keyword.confidence * 0.15 +
      titleHeadingBoost(keyword, page) * 0.15 +
      evidenceQuality(keyword) * 0.1 +
      termFrequencySignal(keyword, page) * 0.1 +
      85 * 0.05,
  );
}

export function makeConceptId(normalizedTerm: string): string {
  return `concept:${normalizedTerm.replace(/\s+/g, "-")}`;
}

export function makeEdgeId(pageId: string, conceptId: string): string {
  return `${pageId}:${conceptId}`;
}

export function conceptFromKeyword(keyword: WeightedKeyword, now: string): ConceptRecord {
  return {
    id: makeConceptId(keyword.normalizedTerm),
    term: keyword.term,
    normalizedTerm: keyword.normalizedTerm,
    kind: keyword.kind,
    aliases: keyword.aliases.map(normalizeTerm).filter((alias) => !isGenericTerm(alias)),
    lastSeenAt: now,
  };
}

export function edgeFromKeyword(
  pageId: string,
  conceptId: string,
  keyword: WeightedKeyword,
  page: ExtractedPage,
): PageConceptEdgeRecord {
  return {
    id: makeEdgeId(pageId, conceptId),
    pageId,
    conceptId,
    normalizedTerm: keyword.normalizedTerm,
    aiRelevance: keyword.relevance,
    modelConfidence: keyword.confidence,
    pageKeywordScore: scoreKeyword(keyword, page),
    evidenceSpans: keyword.evidenceSpans,
  };
}

export function rankBookmarksForTerm(
  term: string,
  bookmarks: readonly SavedBookmark[],
): readonly SavedBookmark[] {
  const normalized = normalizeTerm(term);

  return [...bookmarks].sort((left, right) => {
    const leftScore =
      left.concepts.find((concept) => concept.normalizedTerm === normalized)?.score ?? 0;
    const rightScore =
      right.concepts.find((concept) => concept.normalizedTerm === normalized)?.score ?? 0;

    if (leftScore !== rightScore) {
      return rightScore - leftScore;
    }

    return Date.parse(right.savedAt) - Date.parse(left.savedAt);
  });
}

export function findConceptTermsInText(
  text: string,
  concepts: readonly ConceptRecord[],
  limit: number,
): readonly ConceptRecord[] {
  const normalizedText = normalizeTerm(text);
  const matches: ConceptRecord[] = [];

  for (const concept of concepts) {
    if (matches.length >= limit) {
      break;
    }

    if (isGenericTerm(concept.normalizedTerm)) {
      continue;
    }

    const candidates = [concept.normalizedTerm, ...concept.aliases];
    if (candidates.some((candidate) => normalizedText.includes(candidate))) {
      matches.push(concept);
    }
  }

  return matches;
}
