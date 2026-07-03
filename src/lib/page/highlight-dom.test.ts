import { describe, expect, it } from "vite-plus/test";

import { resetHighlightElements } from "@/lib/page/highlight-dom";

describe("resetHighlightElements", () => {
  it("restores marked text so highlight refreshes are idempotent", () => {
    document.body.innerHTML =
      '<p>industrial <mark class="better-bookmarks-highlight">biotechnology</mark>.</p>';

    const resetCount = resetHighlightElements();

    expect(resetCount).toBe(1);
    expect(document.querySelector("mark.better-bookmarks-highlight")).toBeNull();
    expect(document.body.textContent).toBe("industrial biotechnology.");
  });
});
