import { describe, expect, it } from "vite-plus/test";

import {
  activeHighlightSiteRules,
  createHighlightSiteRule,
  highlightHostIsSuppressed,
} from "@/lib/page/highlight-settings";

describe("highlight site rules", () => {
  it("expires today rules at the next local midnight", () => {
    const rule = createHighlightSiteRule("EN.WIKIPEDIA.ORG", "today", new Date(2026, 6, 3, 10));

    expect(rule.host).toBe("en.wikipedia.org");
    expect(highlightHostIsSuppressed("en.wikipedia.org", [rule], new Date(2026, 6, 3, 23))).toBe(
      true,
    );
    expect(highlightHostIsSuppressed("en.wikipedia.org", [rule], new Date(2026, 6, 4, 0, 1))).toBe(
      false,
    );
  });

  it("keeps forever rules active and filters expired rules", () => {
    const foreverRule = createHighlightSiteRule("example.com", "forever", new Date(2026, 6, 3));
    const todayRule = createHighlightSiteRule("wikipedia.org", "today", new Date(2026, 6, 3));

    expect(activeHighlightSiteRules([foreverRule, todayRule], new Date(2026, 6, 4, 8))).toEqual([
      foreverRule,
    ]);
    expect(highlightHostIsSuppressed("example.com", [foreverRule], new Date(2027, 6, 3))).toBe(
      true,
    );
  });
});
