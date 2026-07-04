import type { HighlightTerm } from "@/lib/page/highlight-term";

const WORD_CHARACTER_PATTERN = /[\p{L}\p{N}]/u;
const TERM_SEPARATOR_PATTERN = /[\s\u00a0\-_–—]+/u;

export type HighlightCandidate = {
  readonly node: Text;
  readonly nodeOrder: number;
  readonly start: number;
  readonly length: number;
  readonly term: HighlightTerm;
};

type CompiledHighlightTerm = {
  readonly term: HighlightTerm;
  readonly patterns: readonly RegExp[];
  readonly longestSearchLength: number;
};

export function planHighlightMatches({
  nodes,
  terms,
  maxHighlightsPerTerm,
  maxTotalHighlights,
}: {
  readonly nodes: readonly Text[];
  readonly terms: readonly HighlightTerm[];
  readonly maxHighlightsPerTerm: number;
  readonly maxTotalHighlights: number;
}): readonly HighlightCandidate[] {
  const compiledTerms = compileHighlightTerms(terms);

  if (compiledTerms.length === 0) {
    return [];
  }

  const candidates = collectHighlightCandidates(nodes, compiledTerms);
  const limitedByTerm = limitMatchesByTerm(candidates, maxHighlightsPerTerm);
  const limitedTotal = limitEvenly(limitedByTerm, maxTotalHighlights);
  return resolveOverlaps(limitedTotal);
}

function compileHighlightTerms(terms: readonly HighlightTerm[]): readonly CompiledHighlightTerm[] {
  const compiled: CompiledHighlightTerm[] = [];

  for (const term of mergeHighlightTerms(terms)) {
    const searchTerms = [term.normalizedTerm, ...term.aliases]
      .map((value) => value.trim().toLocaleLowerCase())
      .filter((value, index, values) => value.length > 2 && values.indexOf(value) === index);
    const patterns = searchTerms
      .map((searchTerm) => createSearchPattern(searchTerm))
      .filter((pattern) => pattern !== null);

    if (patterns.length > 0) {
      compiled.push({
        term,
        patterns,
        longestSearchLength: Math.max(...searchTerms.map((searchTerm) => searchTerm.length)),
      });
    }
  }

  return compiled.sort((left, right) => right.longestSearchLength - left.longestSearchLength);
}

function mergeHighlightTerms(terms: readonly HighlightTerm[]): readonly HighlightTerm[] {
  const merged = new Map<string, { term: string; aliases: Set<string> }>();

  for (const term of terms) {
    const normalizedTerm = term.normalizedTerm.trim().toLocaleLowerCase();

    if (normalizedTerm.length <= 2) {
      continue;
    }

    const existing = merged.get(normalizedTerm);
    const aliases = existing?.aliases ?? new Set<string>();
    for (const alias of term.aliases) {
      const normalizedAlias = alias.trim().toLocaleLowerCase();
      if (normalizedAlias.length > 2 && normalizedAlias !== normalizedTerm) {
        aliases.add(normalizedAlias);
      }
    }

    merged.set(normalizedTerm, {
      term: existing?.term ?? term.term,
      aliases,
    });
  }

  return Array.from(merged.entries()).map(([normalizedTerm, value]) => ({
    term: value.term,
    normalizedTerm,
    aliases: Array.from(value.aliases),
  }));
}

function createSearchPattern(searchTerm: string): RegExp | null {
  const parts = searchTerm.split(TERM_SEPARATOR_PATTERN).filter((part) => part.length > 0);

  if (parts.length === 0) {
    return null;
  }

  return new RegExp(parts.map(escapeRegExp).join("[\\s\\u00a0\\-_–—]+"), "giu");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collectHighlightCandidates(
  nodes: readonly Text[],
  terms: readonly CompiledHighlightTerm[],
): readonly HighlightCandidate[] {
  return nodes.flatMap((node, nodeOrder) =>
    resolveOverlaps(matchesForTextNode(node, nodeOrder, terms)),
  );
}

function matchesForTextNode(
  node: Text,
  nodeOrder: number,
  terms: readonly CompiledHighlightTerm[],
): readonly HighlightCandidate[] {
  const text = node.textContent ?? "";
  const candidates: HighlightCandidate[] = [];

  for (const term of terms) {
    for (const pattern of term.patterns) {
      pattern.lastIndex = 0;
      for (const match of text.matchAll(pattern)) {
        const matchedText = match[0];
        const start = match.index;

        if (isBoundedMatch(text, matchedText, start)) {
          candidates.push({
            node,
            nodeOrder,
            start,
            length: matchedText.length,
            term: term.term,
          });
        }
      }
    }
  }

  return candidates;
}

function isBoundedMatch(text: string, matchedText: string, start?: number): start is number {
  return (
    Boolean(matchedText) &&
    start !== undefined &&
    hasTermBoundary(text, start, start + matchedText.length)
  );
}

function hasTermBoundary(text: string, start: number, end: number): boolean {
  const before = start > 0 ? text.charAt(start - 1) : "";
  const after = end < text.length ? text.charAt(end) : "";
  return !isWordCharacter(before) && !isWordCharacter(after);
}

function isWordCharacter(value: string): boolean {
  return value.length > 0 && WORD_CHARACTER_PATTERN.test(value);
}

function limitMatchesByTerm(
  matches: readonly HighlightCandidate[],
  limit: number,
): readonly HighlightCandidate[] {
  const groups = new Map<string, HighlightCandidate[]>();

  for (const match of sortByDocumentOrder(matches)) {
    const existing = groups.get(match.term.normalizedTerm);
    if (existing) {
      existing.push(match);
      continue;
    }
    groups.set(match.term.normalizedTerm, [match]);
  }

  return sortByDocumentOrder(
    Array.from(groups.values()).flatMap((group) => limitEvenly(group, limit)),
  );
}

function limitEvenly(
  matches: readonly HighlightCandidate[],
  limit: number,
): readonly HighlightCandidate[] {
  const ordered = sortByDocumentOrder(matches);

  if (limit <= 0) {
    return [];
  }

  if (ordered.length <= limit) {
    return ordered;
  }

  if (limit === 1) {
    const first = ordered[0];
    return first ? [first] : [];
  }

  const lastIndex = ordered.length - 1;
  const selectedIndexes = new Set<number>();
  for (let index = 0; index < limit; index += 1) {
    selectedIndexes.add(Math.round((lastIndex * index) / (limit - 1)));
  }

  return ordered.filter((_, index) => selectedIndexes.has(index));
}

function resolveOverlaps(matches: readonly HighlightCandidate[]): readonly HighlightCandidate[] {
  const longestFirst = [...matches].sort(
    (left, right) =>
      right.length - left.length ||
      left.nodeOrder - right.nodeOrder ||
      left.start - right.start ||
      left.term.normalizedTerm.localeCompare(right.term.normalizedTerm),
  );
  const selected: HighlightCandidate[] = [];

  for (const candidate of longestFirst) {
    if (
      !selected.some((match) => match.node === candidate.node && rangesOverlap(match, candidate))
    ) {
      selected.push(candidate);
    }
  }

  return sortByDocumentOrder(selected);
}

function rangesOverlap(left: HighlightCandidate, right: HighlightCandidate): boolean {
  return left.start < right.start + right.length && right.start < left.start + left.length;
}

function sortByDocumentOrder(
  matches: readonly HighlightCandidate[],
): readonly HighlightCandidate[] {
  return [...matches].sort(
    (left, right) => left.nodeOrder - right.nodeOrder || left.start - right.start,
  );
}
