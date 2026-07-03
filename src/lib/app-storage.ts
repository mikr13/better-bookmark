import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

import { defaultSettings, type AppSettings } from "@/lib/domain";

export type EncryptedSecret = {
  readonly encrypted: string;
  readonly salt: string;
};

type KeyVaultState = {
  readonly openai?: EncryptedSecret;
};

export const appSettingsItem = storage.defineItem<AppSettings>("local:better-bookmarks:settings", {
  fallback: defaultSettings,
  version: 1,
});

export const keyVaultItem = storage.defineItem<KeyVaultState>("local:better-bookmarks:key-vault", {
  fallback: {},
  version: 1,
});

export async function restrictLocalStorageToTrustedContexts(): Promise<void> {
  if (!browser.storage.local.setAccessLevel) {
    return;
  }

  await browser.storage.local.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" });
}

export async function setSettings(update: Partial<AppSettings>): Promise<AppSettings> {
  const current = await appSettingsItem.getValue();
  const next = { ...current, ...update };
  await appSettingsItem.setValue(next);
  return next;
}
