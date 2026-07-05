import { beforeEach, describe, expect, it } from "vite-plus/test";

import { conceptsTable, edgesTable, providerCallsTable } from "@/lib/bookmarks/database";
import {
  createManualBookmark,
  deleteAllBookmarks,
  deleteBookmark,
  listBookmarks,
  updateManualBookmark,
} from "@/lib/bookmarks/repository";

describe("bookmark repository manual CRUD", () => {
  beforeEach(async () => {
    await deleteAllBookmarks();
  });

  it("creates a manual bookmark with tags and URL-derived domain", async () => {
    // Given: a manually entered URL and duplicate tag spellings.
    const input = {
      url: "https://example.com/research/local-first",
      title: "Local-first research",
      summary: "A source worth saving without AI analysis.",
      tags: ["Notebook graph", " local-first ", "notebook graph"],
    };

    // When: the bookmark is saved manually.
    const saved = await createManualBookmark(input);

    // Then: the page and tag concepts are persisted for list, graph, and highlighting flows.
    expect(saved.domain).toBe("example.com");
    expect(saved.tags).toEqual(["Notebook graph", "local-first"]);
    expect(saved.concepts.map((concept) => concept.normalizedTerm).sort()).toEqual([
      "local-first",
      "notebook graph",
    ]);
  });

  it("updates editable bookmark data and replaces stale tag edges", async () => {
    // Given: a manual bookmark tagged with an old concept.
    const saved = await createManualBookmark({
      url: "https://example.com/old",
      title: "Old title",
      summary: "Old summary",
      tags: ["old-tag"],
    });

    // When: the bookmark URL, copy, and tags are edited.
    const updated = await updateManualBookmark(saved.id, {
      url: "https://docs.example.dev/new",
      title: "New title",
      summary: "New summary",
      tags: ["new-tag"],
    });

    // Then: page metadata is updated and old tag graph data is removed.
    expect(updated.url).toBe("https://docs.example.dev/new");
    expect(updated.domain).toBe("docs.example.dev");
    expect(updated.title).toBe("New title");
    expect(updated.summary).toBe("New summary");
    expect(updated.tags).toEqual(["new-tag"]);
    expect(updated.savedAt).toBe(saved.savedAt);
    expect(await edgesTable().where("pageId").equals(saved.id).count()).toBe(1);
    expect(await conceptsTable().get("concept:old-tag")).toBeUndefined();
  });

  it("updates the existing bookmark when a manual URL is saved again", async () => {
    // Given: a manually saved URL.
    const saved = await createManualBookmark({
      url: "https://example.com/repeat",
      title: "First save",
      summary: "Original summary.",
      tags: ["first-tag"],
    });

    // When: the same URL is saved again through the manual form.
    const updated = await createManualBookmark({
      url: "https://example.com/repeat",
      title: "Second save",
      summary: "Updated summary.",
      tags: ["second-tag"],
    });

    // Then: the existing bookmark is updated instead of duplicating the URL.
    const bookmarks = await listBookmarks();
    expect(updated.id).toBe(saved.id);
    expect(updated.title).toBe("Second save");
    expect(updated.tags).toEqual(["second-tag"]);
    expect(bookmarks).toHaveLength(1);
  });

  it("deletes a single bookmark with its edges and provider-call data", async () => {
    // Given: two saved bookmarks and provider-call data for one of them.
    const first = await createManualBookmark({
      url: "https://example.com/delete-me",
      title: "Delete me",
      summary: "This record should disappear.",
      tags: ["shared", "private"],
    });
    const second = await createManualBookmark({
      url: "https://example.com/keep-me",
      title: "Keep me",
      summary: "This record should remain.",
      tags: ["shared"],
    });
    await providerCallsTable().put({
      id: "provider-call:delete-me",
      pageId: first.id,
      provider: "openai",
      model: "gpt-5.5",
      status: "succeeded",
      createdAt: new Date().toISOString(),
      payloadBytes: 128,
    });

    // When: one bookmark is deleted.
    await deleteBookmark(first.id);

    // Then: only that bookmark's page-scoped data is removed.
    const bookmarks = await listBookmarks();
    expect(bookmarks.map((bookmark) => bookmark.id)).toEqual([second.id]);
    expect(await edgesTable().where("pageId").equals(first.id).count()).toBe(0);
    expect(await providerCallsTable().where("pageId").equals(first.id).count()).toBe(0);
    expect(await conceptsTable().get("concept:private")).toBeUndefined();
    expect(await conceptsTable().get("concept:shared")).toBeDefined();
  });
});
