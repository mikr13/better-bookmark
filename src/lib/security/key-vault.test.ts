import { afterEach, describe, expect, it } from "vite-plus/test";

import { appSettingsItem, keyVaultItem } from "@/lib/app-storage";
import { defaultSettings } from "@/lib/domain";
import { getProviderApiKey, storeProviderKey } from "@/lib/security/key-vault";

describe("key vault", () => {
  afterEach(async () => {
    await keyVaultItem.setValue({});
    await appSettingsItem.setValue(defaultSettings);
  });

  it("stores API keys without enforcing provider-specific key prefixes", async () => {
    const apiKey = "locally-managed-provider-token";

    await storeProviderKey("openai", apiKey);

    await expect(getProviderApiKey("openai")).resolves.toBe(apiKey);
  });
});
