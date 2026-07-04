import { z } from "zod";

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
import { ConceptRecordSchema, EvidenceSpanSchema } from "@/lib/domain";
import type {
  BookmarkPageRecord,
  ConceptRecord,
  ExtractedPage,
  PageAnalysis,
  PageConceptEdgeRecord,
  ProviderCallRecord,
  SavedBookmark,
} from "@/lib/domain";

export type SaveBookmarkInput = {
  readonly page: ExtractedPage;
  readonly analysis: PageAnalysis;
  readonly providerCall: Omit<ProviderCallRecord, "pageId" | "status">;
};

type ExportPayload = {
  readonly schemaVersion: 1;
  readonly exportedAt: string;
  readonly pages: BookmarkPageRecord[];
  readonly concepts: ConceptRecord[];
  readonly edges: PageConceptEdgeRecord[];
};

const BookmarkPageRecordSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  title: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().optional(),
  summary: z.string().min(1),
  savedAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const PageConceptEdgeRecordSchema = z.object({
  id: z.string().min(1),
  pageId: z.string().min(1),
  conceptId: z.string().min(1),
  normalizedTerm: z.string().min(1),
  aiRelevance: z.number(),
  modelConfidence: z.number(),
  pageKeywordScore: z.number(),
  evidenceSpans: z.array(EvidenceSpanSchema),
});

const ExportPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string().default(""),
  pages: z.array(BookmarkPageRecordSchema),
  concepts: z.array(ConceptRecordSchema),
  edges: z.array(PageConceptEdgeRecordSchema),
});

type ParsedBookmarkPageRecord = z.infer<typeof BookmarkPageRecordSchema>;
type ParsedConceptRecord = z.infer<typeof ConceptRecordSchema>;
type ParsedPageConceptEdgeRecord = z.infer<typeof PageConceptEdgeRecordSchema>;

function createPageRecord(
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
    savedAt: now,
    updatedAt: now,
  };

  if (!page.description) {
    return record;
  }

  return { ...record, description: page.description };
}

function cleanPageRecord(page: ParsedBookmarkPageRecord): BookmarkPageRecord {
  const record = {
    id: page.id,
    url: page.url,
    title: page.title,
    domain: page.domain,
    summary: page.summary,
    savedAt: page.savedAt,
    updatedAt: page.updatedAt,
  };

  if (!page.description) {
    return record;
  }

  return { ...record, description: page.description };
}

function cleanConceptRecord(concept: ParsedConceptRecord): ConceptRecord {
  return {
    id: concept.id,
    term: concept.term,
    normalizedTerm: concept.normalizedTerm,
    kind: concept.kind,
    aliases: concept.aliases,
    lastSeenAt: concept.lastSeenAt,
  };
}

function cleanEdgeRecord(edge: ParsedPageConceptEdgeRecord): PageConceptEdgeRecord {
  return {
    id: edge.id,
    pageId: edge.pageId,
    conceptId: edge.conceptId,
    normalizedTerm: edge.normalizedTerm,
    aiRelevance: edge.aiRelevance,
    modelConfidence: edge.modelConfidence,
    pageKeywordScore: edge.pageKeywordScore,
    evidenceSpans: edge.evidenceSpans,
  };
}

async function hydratePage(page: BookmarkPageRecord): Promise<SavedBookmark> {
  const edges = await edgesTable().where("pageId").equals(page.id).toArray();
  const concepts = await Promise.all(
    edges.map(async (edge) => {
      const concept = await conceptsTable().get(edge.conceptId);
      return concept ? { ...concept, score: edge.pageKeywordScore } : null;
    }),
  );

  return {
    ...page,
    concepts: concepts.filter((concept) => concept !== null),
  };
}

export async function saveAnalyzedBookmark(input: SaveBookmarkInput): Promise<SavedBookmark> {
  const now = new Date().toISOString();
  const page = createPageRecord(input.page, input.analysis, now);
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
      `${bookmark.title} ${bookmark.summary} ${bookmark.domain} ${bookmark.url}`,
    );
    return (
      haystack.includes(normalized) ||
      bookmark.concepts.some((concept) => concept.normalizedTerm.includes(normalized))
    );
  });
}

export async function exportBookmarks(): Promise<string> {
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    pages: await pagesTable().toArray(),
    concepts: await conceptsTable().toArray(),
    edges: await edgesTable().toArray(),
  } satisfies ExportPayload;

  return JSON.stringify(payload, null, 2);
}

export async function importBookmarks(payloadText: string): Promise<void> {
  const parsed = JSON.parse(payloadText);
  const payload = parseExportPayload(parsed);
  await pagesTable().bulkPut(payload.pages);
  await conceptsTable().bulkPut(payload.concepts);
  await edgesTable().bulkPut(payload.edges);
}

export async function deleteAllBookmarks(): Promise<void> {
  await edgesTable().clear();
  await conceptsTable().clear();
  await pagesTable().clear();
  await providerCallsTable().clear();
}

function parseExportPayload(value: unknown): ExportPayload {
  const parsed = ExportPayloadSchema.safeParse(value);

  if (!parsed.success) {
    throw new Error("Import file has an unsupported schema.");
  }

  return {
    schemaVersion: 1,
    exportedAt: parsed.data.exportedAt,
    pages: parsed.data.pages.map(cleanPageRecord),
    concepts: parsed.data.concepts.map(cleanConceptRecord),
    edges: parsed.data.edges.map(cleanEdgeRecord),
  };
}
