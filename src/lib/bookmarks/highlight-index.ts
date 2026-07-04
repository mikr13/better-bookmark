import { isGenericTerm, normalizeTerm } from "@/lib/bookmarks/ranking";
import { listBookmarks } from "@/lib/bookmarks/repository";
import type { SavedBookmark } from "@/lib/domain";
import type { HighlightTerm } from "@/lib/page/highlight-term";

const MAX_TITLE_TERM_LENGTH = 80;
const MAX_TITLE_TERM_WORDS = 8;
const TITLE_SEPARATOR_PATTERN = /\s+(?:[-–—|])\s+/u;

export function highlightTermsForBookmarks(
  bookmarks: readonly SavedBookmark[],
): readonly HighlightTerm[] {
  const terms = new Map<string, HighlightTerm>();

  for (const bookmark of bookmarks) {
    for (const titleTerm of titleHighlightTerms(bookmark.title)) {
      addHighlightTerm(terms, titleTerm);
    }

    for (const concept of bookmark.concepts) {
      const normalizedTerm = normalizeTerm(concept.normalizedTerm);
      if (isGenericTerm(normalizedTerm)) {
        continue;
      }

      addHighlightTerm(terms, {
        term: concept.term,
        normalizedTerm,
        aliases: concept.aliases
          .map(normalizeTerm)
          .filter((alias) => alias !== normalizedTerm && !isGenericTerm(alias)),
      });
    }
  }

  return Array.from(terms.values()).sort(
    (left, right) => right.normalizedTerm.length - left.normalizedTerm.length,
  );
}

export async function listHighlightTerms(): Promise<readonly HighlightTerm[]> {
  return highlightTermsForBookmarks(await listBookmarks());
}

export async function bookmarksForHighlightTerm(term: string): Promise<readonly SavedBookmark[]> {
  const normalizedTerm = normalizeTerm(term);

  if (isGenericTerm(normalizedTerm)) {
    return [];
  }

  return (await listBookmarks())
    .filter((bookmark) => bookmarkMatchesHighlightTerm(bookmark, normalizedTerm))
    .sort((left, right) => {
      const scoreDifference =
        highlightScore(right, normalizedTerm) - highlightScore(left, normalizedTerm);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return Date.parse(right.savedAt) - Date.parse(left.savedAt);
    });
}

function titleHighlightTerms(title: string): readonly HighlightTerm[] {
  const normalizedTitle = normalizeTerm(titleCore(title));

  if (!isUsableTitleTerm(normalizedTitle)) {
    return [];
  }

  return [
    {
      term: normalizedTitle,
      normalizedTerm: normalizedTitle,
      aliases: [],
    },
  ];
}

function titleCore(title: string): string {
  const firstSegment = title.split(TITLE_SEPARATOR_PATTERN)[0];
  return firstSegment?.trim() ?? title.trim();
}

function isUsableTitleTerm(normalizedTitle: string): boolean {
  if (isGenericTerm(normalizedTitle) || normalizedTitle.length > MAX_TITLE_TERM_LENGTH) {
    return false;
  }

  return normalizedTitle.split(/\s+/g).length <= MAX_TITLE_TERM_WORDS;
}

function addHighlightTerm(terms: Map<string, HighlightTerm>, term: HighlightTerm): void {
  const existing = terms.get(term.normalizedTerm);

  if (!existing) {
    terms.set(term.normalizedTerm, term);
    return;
  }

  terms.set(term.normalizedTerm, {
    term: existing.term,
    normalizedTerm: existing.normalizedTerm,
    aliases: Array.from(new Set([...existing.aliases, ...term.aliases])),
  });
}

function bookmarkMatchesHighlightTerm(bookmark: SavedBookmark, normalizedTerm: string): boolean {
  return (
    titleHighlightTerms(bookmark.title).some((term) => term.normalizedTerm === normalizedTerm) ||
    bookmark.concepts.some(
      (concept) =>
        concept.normalizedTerm === normalizedTerm ||
        concept.aliases.map(normalizeTerm).includes(normalizedTerm),
    )
  );
}

function highlightScore(bookmark: SavedBookmark, normalizedTerm: string): number {
  const conceptScore =
    bookmark.concepts.find(
      (concept) =>
        concept.normalizedTerm === normalizedTerm ||
        concept.aliases.map(normalizeTerm).includes(normalizedTerm),
    )?.score ?? 0;
  const titleScore = titleHighlightTerms(bookmark.title).some(
    (term) => term.normalizedTerm === normalizedTerm,
  )
    ? 100
    : 0;

  return Math.max(conceptScore, titleScore);
}
