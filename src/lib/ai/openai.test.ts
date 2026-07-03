import { describe, expect, it } from "vite-plus/test";

import {
  FALLBACK_OPENAI_MODELS,
  isMultimodalOpenAIModel,
  listOpenAIModels,
  validateOpenAIKey,
} from "@/lib/ai/openai";

describe("isMultimodalOpenAIModel", () => {
  it("accepts latest text and screenshot capable GPT models", () => {
    expect(isMultimodalOpenAIModel("gpt-5.5")).toBe(true);
    expect(isMultimodalOpenAIModel("gpt-5.4-mini")).toBe(true);
    expect(isMultimodalOpenAIModel("gpt-4o")).toBe(true);
  });

  it("rejects specialized non-LLM or non-vision model ids", () => {
    expect(isMultimodalOpenAIModel("text-embedding-3-large")).toBe(false);
    expect(isMultimodalOpenAIModel("gpt-image-2")).toBe(false);
    expect(isMultimodalOpenAIModel("gpt-4o-transcribe")).toBe(false);
  });

  it("returns fallback models when the model list request is unauthorized", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });

    try {
      await expect(listOpenAIModels("sk-invalid-but-shaped-like-a-key")).resolves.toEqual(
        FALLBACK_OPENAI_MODELS,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports invalid OpenAI keys when validation is unauthorized", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: { message: "Unauthorized" } }), { status: 401 });

    try {
      await expect(validateOpenAIKey("sk-invalid-but-shaped-like-a-key")).resolves.toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("reports valid OpenAI keys when validation succeeds", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ data: [{ id: "gpt-5.5" }] }), { status: 200 });

    try {
      await expect(validateOpenAIKey("sk-valid-looking-key-for-test")).resolves.toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
