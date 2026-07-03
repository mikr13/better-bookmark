import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

describe("extension manifest config", () => {
  it("declares all-urls host access for side-panel screenshot capture", async () => {
    const config = await readFile("wxt.config.ts", "utf8");

    expect(config).toContain('host_permissions: ["<all_urls>", "https://api.openai.com/*"]');
  });
});
