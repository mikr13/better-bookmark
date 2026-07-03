import Dexie from "dexie";

import type {
  BookmarkPageRecord,
  ConceptRecord,
  PageConceptEdgeRecord,
  ProviderCallRecord,
} from "@/lib/domain";

export const bookmarkDb = new Dexie("better-bookmarks");

bookmarkDb.version(1).stores({
  pages: "&id, &url, domain, savedAt, updatedAt",
  concepts: "&id, &normalizedTerm, lastSeenAt",
  pageConceptEdges: "&id, pageId, conceptId, normalizedTerm, pageKeywordScore",
  providerCalls: "&id, pageId, createdAt, status",
});

export function pagesTable(): Dexie.Table<BookmarkPageRecord, string> {
  return bookmarkDb.table<BookmarkPageRecord, string>("pages");
}

export function conceptsTable(): Dexie.Table<ConceptRecord, string> {
  return bookmarkDb.table<ConceptRecord, string>("concepts");
}

export function edgesTable(): Dexie.Table<PageConceptEdgeRecord, string> {
  return bookmarkDb.table<PageConceptEdgeRecord, string>("pageConceptEdges");
}

export function providerCallsTable(): Dexie.Table<ProviderCallRecord, string> {
  return bookmarkDb.table<ProviderCallRecord, string>("providerCalls");
}
