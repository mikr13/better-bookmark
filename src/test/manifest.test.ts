import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

describe("extension manifest config", () => {
  it("declares page and provider host access", async () => {
    const config = await readFile("wxt.config.ts", "utf8");

    expect(config).toContain('"<all_urls>"');
    expect(config).toContain('"https://api.openai.com/*"');
    expect(config).toContain('"https://api.anthropic.com/*"');
    expect(config).toContain('"https://api.groq.com/*"');
    expect(config).toContain('"https://api.deepseek.com/*"');
    expect(config).toContain('"https://generativelanguage.googleapis.com/*"');
    expect(config).toContain('"http://localhost:11434/*"');
  });
});
