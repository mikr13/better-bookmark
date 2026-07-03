import { describe, expect, it } from "vite-plus/test";

import { formatBookmarkDate } from "@/lib/bookmarks/display-date";

describe("formatBookmarkDate", () => {
  it("omits the year for bookmarks saved in the current year", () => {
    expect(
      formatBookmarkDate("2026-07-03T10:16:04.066Z", new Date("2026-12-01T00:00:00.000Z")),
    ).toBe("July 3");
  });

  it("includes the year for bookmarks saved outside the current year", () => {
    expect(
      formatBookmarkDate("2025-07-03T10:16:04.066Z", new Date("2026-12-01T00:00:00.000Z")),
    ).toBe("July 3, 2025");
  });

  it("returns null for invalid values", () => {
    expect(formatBookmarkDate("not a date")).toBeNull();
  });
});
