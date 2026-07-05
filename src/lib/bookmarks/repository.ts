import {
  conceptsTable,
  edgesTable,
  pagesTable,
  providerCallsTable,
} from "@/lib/bookmarks/database";
import {
  conceptFromKeyword,
  edgeFromKeyword,
  isGenericTerm,
  normalizeTerm,
} from "@/lib/bookmarks/ranking";
import { createAnalyzedPageRecord, hydratePage } from "@/lib/bookmarks/repository-records";
import type {
  ConceptRecord,
  ExtractedPage,
  PageAnalysis,
  ProviderCallRecord,
  SavedBookmark,
} from "@/lib/domain";

export {
  deleteAllBookmarks,
  exportBookmarks,
  importBookmarks,
} from "@/lib/bookmarks/bookmark-transfer";
export {
  createManualBookmark,
  deleteBookmark,
  updateManualBookmark,
} from "@/lib/bookmarks/manual-bookmarks";
export type { ManualBookmarkInput } from "@/lib/bookmarks/manual-bookmarks";

export type SaveBookmarkInput = {
  readonly page: ExtractedPage;
  readonly analysis: PageAnalysis;
  readonly providerCall: Omit<ProviderCallRecord, "pageId" | "status">;
};

export async function saveAnalyzedBookmark(input: SaveBookmarkInput): Promise<SavedBookmark> {
  const now = new Date().toISOString();
  const page = createAnalyzedPageRecord(input.page, input.analysis, now);
  const acceptedKeywords = input.analysis.keywords.filter(
    (keyword) => !isGenericTerm(keyword.normalizedTerm),
  );

  await pagesTable().put(page);

  for (const keyword of acceptedKeywords) {
    const concept = conceptFromKeyword(keyword, now);
    const edge = edgeFromKeyword(page.id, concept.id, keyword, input.page);
    await conceptsTable().put(concept);
    await edgesTable().put(edge);
  }

  await providerCallsTable().put({
    ...input.providerCall,
    pageId: page.id,
    status: "succeeded",
  });

  return hydratePage(page);
}

export async function recordFailedProviderCall(
  call: Omit<ProviderCallRecord, "status">,
): Promise<void> {
  await providerCallsTable().put({ ...call, status: "failed" });
}

export async function listBookmarks(): Promise<readonly SavedBookmark[]> {
  const pages = await pagesTable().orderBy("savedAt").reverse().toArray();
  return Promise.all(pages.map(hydratePage));
}

export async function searchBookmarks(query: string): Promise<readonly SavedBookmark[]> {
  const normalized = normalizeTerm(query);
  const all = await listBookmarks();

  if (!normalized) {
    return all;
  }

  return all.filter((bookmark) => {
    const haystack = normalizeTerm(
      `${bookmark.title} ${bookmark.summary} ${bookmark.domain} ${bookmark.url} ${bookmark.tags.join(" ")}`,
    );
    return (
      haystack.includes(normalized) ||
      bookmark.concepts.some((concept) => concept.normalizedTerm.includes(normalized))
    );
  });
}

export async function listHighlightConcepts(): Promise<readonly ConceptRecord[]> {
  const concepts = await conceptsTable().orderBy("lastSeenAt").reverse().limit(80).toArray();
  return concepts.filter((concept) => concept.normalizedTerm.length > 2);
}

export async function bookmarksForConcept(term: string): Promise<readonly SavedBookmark[]> {
  const normalized = normalizeTerm(term);
  const edges = await edgesTable().where("normalizedTerm").equals(normalized).toArray();
  const pages = await Promise.all(edges.map((edge) => pagesTable().get(edge.pageId)));
  const hydrated = await Promise.all(
    pages.filter((page) => page !== undefined).map((page) => hydratePage(page)),
  );
  return hydrated.sort((left, right) => {
    const leftScore =
      left.concepts.find((concept) => concept.normalizedTerm === normalized)?.score ?? 0;
    const rightScore =
      right.concepts.find((concept) => concept.normalizedTerm === normalized)?.score ?? 0;
    return rightScore - leftScore;
  });
}
