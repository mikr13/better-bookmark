import { z } from "zod";

export const ThemeSchema = z.enum(["system", "light", "dark"]);
export type ThemePreference = z.infer<typeof ThemeSchema>;

export const AIProviderSchema = z.enum([
  "openai",
  "anthropic",
  "groq",
  "deepseek",
  "gemini",
  "ollama",
]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const HighlightTriggerSchema = z.enum(["hover", "click"]);
export type HighlightTrigger = z.infer<typeof HighlightTriggerSchema>;

export const HighlightSiteRuleScopeSchema = z.enum(["today", "forever"]);
export type HighlightSiteRuleScope = z.infer<typeof HighlightSiteRuleScopeSchema>;

export const HighlightSiteRuleSchema = z.object({
  host: z.string().min(1),
  scope: HighlightSiteRuleScopeSchema,
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1).optional(),
});
export type HighlightSiteRule = z.infer<typeof HighlightSiteRuleSchema>;

export const ConceptKindSchema = z.enum([
  "topic",
  "entity",
  "method",
  "paper",
  "product",
  "person",
  "place",
  "organization",
  "metric",
  "other",
]);
export type ConceptKind = z.infer<typeof ConceptKindSchema>;

export const EvidenceSourceSchema = z.enum([
  "title",
  "heading",
  "article",
  "visibleText",
  "domOutline",
]);

export const EvidenceSpanSchema = z.object({
  text: z.string().min(1),
  source: EvidenceSourceSchema,
  reason: z.string().min(1),
});
export type EvidenceSpan = z.infer<typeof EvidenceSpanSchema>;

export const WeightedKeywordSchema = z.object({
  term: z.string().min(2),
  normalizedTerm: z.string().min(2),
  kind: ConceptKindSchema,
  relevance: z.number().int().min(0).max(100),
  confidence: z.number().int().min(0).max(100),
  aliases: z.array(z.string().min(2)).default([]),
  evidenceSpans: z.array(EvidenceSpanSchema).min(1),
});
export type WeightedKeyword = z.infer<typeof WeightedKeywordSchema>;

export const PageAnalysisSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  keywords: z.array(WeightedKeywordSchema).min(1).max(40),
  questions: z.array(z.string().min(3)).default([]),
});
export type PageAnalysis = z.infer<typeof PageAnalysisSchema>;

export const ExtractedPageSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().optional(),
  headings: z.array(z.string()).default([]),
  articleText: z.string().default(""),
  visibleText: z.string().default(""),
  domOutline: z.string().default(""),
});
export type ExtractedPage = z.infer<typeof ExtractedPageSchema>;

export type ProviderModel = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export type BookmarkPageRecord = {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly domain: string;
  readonly description?: string;
  readonly summary: string;
  readonly savedAt: string;
  readonly updatedAt: string;
};

export const ConceptRecordSchema = z.object({
  id: z.string().min(1),
  term: z.string().min(1),
  normalizedTerm: z.string().min(1),
  kind: ConceptKindSchema,
  aliases: z.array(z.string()).default([]),
  lastSeenAt: z.string().min(1),
});
export type ConceptRecord = z.infer<typeof ConceptRecordSchema>;

export type PageConceptEdgeRecord = {
  readonly id: string;
  readonly pageId: string;
  readonly conceptId: string;
  readonly normalizedTerm: string;
  readonly aiRelevance: number;
  readonly modelConfidence: number;
  readonly pageKeywordScore: number;
  readonly evidenceSpans: readonly EvidenceSpan[];
};

export type ProviderCallRecord = {
  readonly id: string;
  readonly pageId?: string;
  readonly provider: AIProvider;
  readonly model: string;
  readonly status: "succeeded" | "failed";
  readonly createdAt: string;
  readonly payloadBytes: number;
  readonly errorMessage?: string;
};

export type SavedBookmark = BookmarkPageRecord & {
  readonly concepts: ReadonlyArray<ConceptRecord & { readonly score: number }>;
};

export type AppSettings = {
  readonly theme: ThemePreference;
  readonly selectedAIProvider: AIProvider;
  readonly selectedOpenAIModel: string;
  readonly selectedProviderModels: Partial<Record<AIProvider, string>>;
  readonly configuredProviders: Partial<Record<AIProvider, boolean>>;
  readonly openAIKeyConfigured: boolean;
  readonly highlightHostAccessGranted: boolean;
  readonly highlightTrigger: HighlightTrigger;
  readonly highlightSiteRules: readonly HighlightSiteRule[];
};

export const defaultSettings: AppSettings = {
  theme: "system",
  selectedAIProvider: "openai",
  selectedOpenAIModel: "gpt-5.5",
  selectedProviderModels: {
    openai: "gpt-5.5",
    anthropic: "claude-haiku-4-5-20251001",
    groq: "llama-4-maverick",
    deepseek: "deepseek-chat",
    gemini: "models/gemini-2.5-flash",
    ollama: "llama3.2-vision",
  },
  configuredProviders: { ollama: true },
  openAIKeyConfigured: false,
  highlightHostAccessGranted: false,
  highlightTrigger: "click",
  highlightSiteRules: [],
};

export const PAGE_ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "summary", "keywords", "questions"],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    questions: { type: "array", items: { type: "string" } },
    keywords: {
      type: "array",
      minItems: 1,
      maxItems: 40,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "term",
          "normalizedTerm",
          "kind",
          "relevance",
          "confidence",
          "aliases",
          "evidenceSpans",
        ],
        properties: {
          term: { type: "string" },
          normalizedTerm: { type: "string" },
          kind: {
            type: "string",
            enum: [
              "topic",
              "entity",
              "method",
              "paper",
              "product",
              "person",
              "place",
              "organization",
              "metric",
              "other",
            ],
          },
          relevance: { type: "integer", minimum: 0, maximum: 100 },
          confidence: { type: "integer", minimum: 0, maximum: 100 },
          aliases: { type: "array", items: { type: "string" } },
          evidenceSpans: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["text", "source", "reason"],
              properties: {
                text: { type: "string" },
                source: {
                  type: "string",
                  enum: ["title", "heading", "article", "visibleText", "domOutline"],
                },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;
