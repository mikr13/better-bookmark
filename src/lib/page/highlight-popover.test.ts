import { describe, expect, it } from "vite-plus/test";

import { closeHighlightPopover, showHighlightPopover } from "@/lib/page/highlight-popover";

function requireHtmlElement(selector: string): HTMLElement {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Expected ${selector} to exist.`);
  }

  return element;
}

describe("showHighlightPopover", () => {
  it("renders a branded scrollable saved-source card layout", async () => {
    document.body.innerHTML = '<p><mark id="term">biotechnology</mark></p>';
    const mark = requireHtmlElement("#term");
    const currentYear = new Date().getFullYear();
    Object.defineProperty(mark, "getBoundingClientRect", {
      value: () => new DOMRect(24, 48, 160, 22),
    });

    let dismissedScope: string | null = null;

    await showHighlightPopover({
      mark,
      term: "biotechnology",
      theme: "dark",
      onDismissSite: (scope) => {
        dismissedScope = scope;
      },
      loadBookmarks: async () => [
        {
          title: "Biotechnology",
          url: "https://en.wikipedia.org/wiki/Biotechnology",
          domain: "en.wikipedia.org",
          summary: "A page about using living systems and organisms in science and industry.",
          savedAt: `${currentYear}-07-03T10:16:04.066Z`,
        },
        {
          title: "Industrial biotech notes",
          url: "https://example.com/industrial-biotech",
          domain: "example.com",
          summary: "A saved note that connects biotechnology with industrial processes.",
          savedAt: "2026-07-02T10:16:04.066Z",
        },
      ],
    });

    const popover = requireHtmlElement("#better-bookmarks-popover");
    const sourceList = requireHtmlElement(".better-bookmarks-source-list");

    expect(popover.getAttribute("role")).toBe("dialog");
    expect(popover.textContent).toContain("Better Bookmarks");
    expect(popover.textContent).toContain("Seen before: biotechnology");
    expect(sourceList.className).toContain("better-bookmarks-source-list");
    expect(document.querySelectorAll(".better-bookmarks-source-card")).toHaveLength(2);
    expect(requireHtmlElement(".better-bookmarks-card-date").textContent).toBe("July 3");
    expect(popover.textContent).toContain("en.wikipedia.org");
    expect(popover.textContent).toContain("using living systems");

    const dismissButton = requireHtmlElement(".better-bookmarks-popover-dismiss");
    dismissButton.click();
    expect(requireHtmlElement(".better-bookmarks-dismiss-menu").hidden).toBe(false);
    expect(popover.textContent).toContain("Do not show for today");
    requireHtmlElement('[data-dismiss-scope="today"]').click();
    expect(dismissedScope).toBe("today");

    closeHighlightPopover(false);
  });
});
