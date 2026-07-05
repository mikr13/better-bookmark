import { z } from "zod";

import {
  conceptsTable,
  edgesTable,
  pagesTable,
  providerCallsTable,
} from "@/lib/bookmarks/database";
import { isGenericTerm, makeConceptId, makeEdgeId, normalizeTerm } from "@/lib/bookmarks/ranking";
import {
  hydratePage,
  pageRecordWithDefaults,
  pruneOrphanConcepts,
  uniqueTags,
} from "@/lib/bookmarks/repository-records";
import type { BookmarkPageRecord, ConceptRecord, PageConceptEdgeRecord } from "@/lib/domain";

export type ManualBookmarkInput = {
  readonly url: string;
  readonly title: string;
  readonly summary: string;
  readonly tags: readonly string[];
};

const ManualBookmarkInputSchema = z.object({
  url: z.string().trim().url(),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  tags: z.array(z.string()).default([]),
});

type ParsedManualBookmarkInput = z.infer<typeof ManualBookmarkInputSchema>;

function domainFromUrl(url: string): string {
  return new URL(url).hostname;
}

function normalizeManualInput(input: ManualBookmarkInput): ParsedManualBookmarkInput {
  const parsed = ManualBookmarkInputSchema.parse(input);
  return { ...parsed, url: new URL(parsed.url).toString(), tags: uniqueTags(parsed.tags) };
}

function createManualPageRecord(input: ParsedManualBookmarkInput, now: string): BookmarkPageRecord {
  return {
    id: crypto.randomUUID(),
    url: input.url,
    title: input.title,
    domain: domainFromUrl(input.url),
    summary: input.summary,
    tags: input.tags,
    savedAt: now,
    updatedAt: now,
  };
}

function updatePageRecord(
  page: BookmarkPageRecord,
  input: ParsedManualBookmarkInput,
  now: string,
): BookmarkPageRecord {
  const next = {
    id: page.id,
    url: input.url,
    title: input.title,
    domain: domainFromUrl(input.url),
    summary: input.summary,
    tags: input.tags,
    savedAt: page.savedAt,
    updatedAt: now,
  };

  if (!page.description) {
    return next;
  }

  return { ...next, description: page.description };
}

function conceptFromTag(tag: string, now: string): ConceptRecord | null {
  const normalizedTerm = normalizeTerm(tag);

  if (isGenericTerm(normalizedTerm)) {
    return null;
  }

  return {
    id: makeConceptId(normalizedTerm),
    term: tag,
    normalizedTerm,
    kind: "other",
    aliases: [],
    lastSeenAt: now,
  };
}

function edgeFromTag(pageId: string, concept: ConceptRecord, tag: string): PageConceptEdgeRecord {
  return {
    id: makeEdgeId(pageId, concept.id),
    pageId,
    conceptId: concept.id,
    normalizedTerm: concept.normalizedTerm,
    source: "manual",
    aiRelevance: 100,
    modelConfidence: 100,
    pageKeywordScore: 100,
    evidenceSpans: [
      {
        text: tag,
        source: "visibleText",
        reason: "Manual bookmark tag",
      },
    ],
  };
}

async function replaceManualTagEdges(page: BookmarkPageRecord, now: string): Promise<void> {
  const existingEdges = await edgesTable().where("pageId").equals(page.id).toArray();
  const manualEdges = existingEdges.filter((edge) => edge.source === "manual");
  const manualConceptIds = manualEdges.map((edge) => edge.conceptId);

  for (const edge of manualEdges) {
    await edgesTable().delete(edge.id);
  }

  for (const tag of page.tags) {
    const concept = conceptFromTag(tag, now);

    if (!concept) {
      continue;
    }

    await conceptsTable().put(concept);
    await edgesTable().put(edgeFromTag(page.id, concept, tag));
  }

  await pruneOrphanConcepts(manualConceptIds);
}

export async function createManualBookmark(input: ManualBookmarkInput) {
  const parsed = normalizeManualInput(input);
  const now = new Date().toISOString();
  const existing = await pagesTable().where("url").equals(parsed.url).first();
  const page = existing
    ? updatePageRecord(pageRecordWithDefaults(existing), parsed, now)
    : createManualPageRecord(parsed, now);

  await pagesTable().put(page);
  await replaceManualTagEdges(page, now);

  return hydratePage(page);
}

export async function updateManualBookmark(pageId: string, input: ManualBookmarkInput) {
  const existing = await pagesTable().get(pageId);

  if (!existing) {
    throw new Error(`Bookmark ${pageId} was not found.`);
  }

  const parsed = normalizeManualInput(input);
  const urlOwner = await pagesTable().where("url").equals(parsed.url).first();

  if (urlOwner && urlOwner.id !== pageId) {
    throw new Error("A bookmark with this URL already exists.");
  }

  const now = new Date().toISOString();
  const page = updatePageRecord(pageRecordWithDefaults(existing), parsed, now);

  await pagesTable().put(page);
  await replaceManualTagEdges(page, now);

  return hydratePage(page);
}

export async function deleteBookmark(pageId: string): Promise<void> {
  const page = await pagesTable().get(pageId);

  if (!page) {
    throw new Error(`Bookmark ${pageId} was not found.`);
  }

  const edges = await edgesTable().where("pageId").equals(pageId).toArray();
  const conceptIds = edges.map((edge) => edge.conceptId);

  await edgesTable().where("pageId").equals(pageId).delete();
  await providerCallsTable().where("pageId").equals(pageId).delete();
  await pagesTable().delete(pageId);
  await pruneOrphanConcepts(conceptIds);
}
