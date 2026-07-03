import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

import { defaultSettings, type AppSettings, type HighlightSiteRuleScope } from "@/lib/domain";
import { createHighlightSiteRule, normalizedHighlightHost } from "@/lib/page/highlight-settings";

export type EncryptedSecret = {
  readonly encrypted: string;
  readonly salt: string;
};

type KeyVaultState = {
  readonly openai?: EncryptedSecret;
};

type AppSettingsV1 = Omit<AppSettings, "highlightTrigger" | "highlightSiteRules">;

export const appSettingsItem = storage.defineItem<AppSettings>("local:better-bookmarks:settings", {
  fallback: defaultSettings,
  version: 2,
  migrations: {
    2: (settings: AppSettingsV1): AppSettings => ({
      ...settings,
      highlightTrigger: defaultSettings.highlightTrigger,
      highlightSiteRules: defaultSettings.highlightSiteRules,
    }),
  },
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

export async function setHighlightTrigger(
  highlightTrigger: AppSettings["highlightTrigger"],
): Promise<AppSettings> {
  return setSettings({ highlightTrigger });
}

export async function setHighlightSiteRule(
  host: string,
  scope: HighlightSiteRuleScope,
): Promise<AppSettings> {
  const current = await appSettingsItem.getValue();
  const normalizedHost = normalizedHighlightHost(host);
  const nextRule = createHighlightSiteRule(normalizedHost, scope);
  const highlightSiteRules = [
    nextRule,
    ...current.highlightSiteRules.filter((rule) => rule.host !== normalizedHost),
  ];
  return setSettings({ highlightSiteRules });
}

export async function removeHighlightSiteRule(host: string): Promise<AppSettings> {
  const current = await appSettingsItem.getValue();
  const normalizedHost = normalizedHighlightHost(host);
  return setSettings({
    highlightSiteRules: current.highlightSiteRules.filter((rule) => rule.host !== normalizedHost),
  });
}
