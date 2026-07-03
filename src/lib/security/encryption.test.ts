import { describe, expect, it } from "vite-plus/test";

import { decryptText, encryptText, generateSalt } from "@/lib/security/encryption";

describe("encryption", () => {
  it("decrypts encrypted text when the same secret and salt are used", async () => {
    const salt = await generateSalt();
    const encrypted = await encryptText("sk-test-secret", "browser-fingerprint", salt);

    await expect(decryptText(encrypted, "browser-fingerprint", salt)).resolves.toBe(
      "sk-test-secret",
    );
  });

  it("rejects decryption when the secret changes", async () => {
    const salt = await generateSalt();
    const encrypted = await encryptText("sk-test-secret", "browser-fingerprint", salt);

    await expect(decryptText(encrypted, "other-fingerprint", salt)).rejects.toThrow(
      "Decryption failed",
    );
  });
});
