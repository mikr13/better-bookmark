import { z } from "zod";

import {
  conceptsTable,
  edgesTable,
  pagesTable,
  providerCallsTable,
} from "@/lib/bookmarks/database";
import { uniqueTags } from "@/lib/bookmarks/repository-records";
import { ConceptRecordSchema, EvidenceSpanSchema } from "@/lib/domain";
import type { BookmarkPageRecord, ConceptRecord, PageConceptEdgeRecord } from "@/lib/domain";

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
  tags: z.array(z.string()).default([]),
  savedAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

const PageConceptEdgeRecordSchema = z.object({
  id: z.string().min(1),
  pageId: z.string().min(1),
  conceptId: z.string().min(1),
  normalizedTerm: z.string().min(1),
  source: z.enum(["ai", "manual"]).default("ai"),
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

function cleanPageRecord(page: ParsedBookmarkPageRecord): BookmarkPageRecord {
  const record = {
    id: page.id,
    url: page.url,
    title: page.title,
    domain: page.domain,
    summary: page.summary,
    tags: uniqueTags(page.tags),
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
    source: edge.source,
    aiRelevance: edge.aiRelevance,
    modelConfidence: edge.modelConfidence,
    pageKeywordScore: edge.pageKeywordScore,
    evidenceSpans: edge.evidenceSpans,
  };
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
