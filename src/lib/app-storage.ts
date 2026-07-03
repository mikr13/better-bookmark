import { browser } from "wxt/browser";
import { storage } from "wxt/utils/storage";

import {
  defaultSettings,
  type AIProvider,
  type AppSettings,
  type HighlightSiteRuleScope,
} from "@/lib/domain";
import { createHighlightSiteRule, normalizedHighlightHost } from "@/lib/page/highlight-settings";

export type EncryptedSecret = {
  readonly encrypted: string;
  readonly salt: string;
};

type KeyVaultState = Partial<Record<AIProvider, EncryptedSecret>>;

type AppSettingsV1 = Omit<
  AppSettings,
  | "highlightTrigger"
  | "highlightSiteRules"
  | "selectedAIProvider"
  | "selectedProviderModels"
  | "configuredProviders"
>;
type AppSettingsV2 = Omit<
  AppSettings,
  "selectedAIProvider" | "selectedProviderModels" | "configuredProviders"
>;
type AppSettingsV3 = Omit<AppSettings, "configuredProviders">;

export const appSettingsItem = storage.defineItem<AppSettings>("local:better-bookmarks:settings", {
  fallback: defaultSettings,
  version: 4,
  migrations: {
    2: (settings: AppSettingsV1): AppSettingsV2 => ({
      ...settings,
      highlightTrigger: defaultSettings.highlightTrigger,
      highlightSiteRules: defaultSettings.highlightSiteRules,
    }),
    3: (settings: AppSettingsV2): AppSettingsV3 => ({
      ...settings,
      selectedAIProvider: defaultSettings.selectedAIProvider,
      selectedProviderModels: {
        ...defaultSettings.selectedProviderModels,
        openai: settings.selectedOpenAIModel,
      },
    }),
    4: (settings: AppSettingsV3): AppSettings => ({
      ...settings,
      selectedProviderModels: {
        ...defaultSettings.selectedProviderModels,
        ...settings.selectedProviderModels,
        openai: settings.selectedOpenAIModel,
      },
      configuredProviders: {
        ...defaultSettings.configuredProviders,
        openai: settings.openAIKeyConfigured,
      },
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
