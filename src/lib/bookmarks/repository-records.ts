import { conceptsTable, edgesTable } from "@/lib/bookmarks/database";
import { normalizeTerm } from "@/lib/bookmarks/ranking";
import type { BookmarkPageRecord, ExtractedPage, PageAnalysis, SavedBookmark } from "@/lib/domain";

export function uniqueTags(tags: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const tag of tags) {
    const trimmed = tag.trim();

    if (!trimmed) {
      continue;
    }

    const normalized = normalizeTerm(trimmed);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(trimmed);
  }

  return result;
}

export function pageRecordWithDefaults(page: BookmarkPageRecord): BookmarkPageRecord {
  return { ...page, tags: uniqueTags(page.tags ?? []) };
}

export function createAnalyzedPageRecord(
  page: ExtractedPage,
  analysis: PageAnalysis,
  now: string,
): BookmarkPageRecord {
  const record = {
    id: crypto.randomUUID(),
    url: page.url,
    title: analysis.title || page.title,
    domain: page.domain,
    summary: analysis.summary,
    tags: [],
    savedAt: now,
    updatedAt: now,
  };

  if (!page.description) {
    return record;
  }

  return { ...record, description: page.description };
}

export async function hydratePage(page: BookmarkPageRecord): Promise<SavedBookmark> {
  const pageRecord = pageRecordWithDefaults(page);
  const edges = await edgesTable().where("pageId").equals(pageRecord.id).toArray();
  const concepts = await Promise.all(
    edges.map(async (edge) => {
      const concept = await conceptsTable().get(edge.conceptId);
      return concept ? { ...concept, score: edge.pageKeywordScore } : null;
    }),
  );

  return {
    ...pageRecord,
    concepts: concepts.filter((concept) => concept !== null),
  };
}

export async function pruneOrphanConcepts(conceptIds: readonly string[]): Promise<void> {
  for (const conceptId of new Set(conceptIds)) {
    const referenceCount = await edgesTable().where("conceptId").equals(conceptId).count();

    if (referenceCount === 0) {
      await conceptsTable().delete(conceptId);
    }
  }
}
