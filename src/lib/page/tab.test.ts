import { describe, expect, it } from "vite-plus/test";

import { pageSaveFailureMessage, saveablePageUrl } from "@/lib/page/tab";

describe("saveablePageUrl", () => {
  it("accepts http and https pages when saving a bookmark", () => {
    expect(saveablePageUrl("https://example.com/research")).toBe("https://example.com/research");
    expect(saveablePageUrl("http://localhost:5173/demo")).toBe("http://localhost:5173/demo");
  });

  it("rejects browser and extension pages before screenshot capture", () => {
    expect(saveablePageUrl("chrome-extension://abc/options.html")).toBeNull();
    expect(saveablePageUrl("edge://extensions")).toBeNull();
    expect(saveablePageUrl(undefined)).toBeNull();
    expect(saveablePageUrl("not a url")).toBeNull();
  });
});

describe("pageSaveFailureMessage", () => {
  it("turns screenshot permission failures into an actionable sidebar message", () => {
    expect(
      pageSaveFailureMessage(
        new Error("Either the '<all_urls>' or 'activeTab' permission is required."),
      ),
    ).toBe(
      "Open a normal webpage before saving. Browser settings and extension pages cannot be saved.",
    );
  });
});
