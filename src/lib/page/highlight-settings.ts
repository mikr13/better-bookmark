import { z } from "zod";

import type {
  AppSettings,
  HighlightSiteRule,
  HighlightSiteRuleScope,
  ThemePreference,
} from "@/lib/domain";
import { HighlightSiteRuleSchema, HighlightTriggerSchema, ThemeSchema } from "@/lib/domain";
import { HIGHLIGHT_SETTINGS_CHANGED_MESSAGE } from "@/lib/page/highlight-messages";

export type PublicHighlightSettings = Pick<
  AppSettings,
  "theme" | "highlightTrigger" | "highlightSiteRules"
>;

export type ResolvedHighlightTheme = "light" | "dark";

export const PublicHighlightSettingsSchema = z.object({
  theme: ThemeSchema,
  highlightTrigger: HighlightTriggerSchema,
  highlightSiteRules: z.array(HighlightSiteRuleSchema),
});

export const HighlightSettingsChangedMessageSchema = z.object({
  type: z.literal(HIGHLIGHT_SETTINGS_CHANGED_MESSAGE),
  settings: PublicHighlightSettingsSchema,
});

const DAY_MS = 86_400_000;

export function normalizedHighlightHost(host: string): string {
  return host.trim().toLocaleLowerCase();
}

export function expiresAtEndOfToday(now = new Date()): string {
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.toISOString();
}

export function createHighlightSiteRule(
  host: string,
  scope: HighlightSiteRuleScope,
  now = new Date(),
): HighlightSiteRule {
  const normalizedHost = normalizedHighlightHost(host);
  const createdAt = now.toISOString();

  if (scope === "today") {
    return {
      host: normalizedHost,
      scope,
      createdAt,
      expiresAt: expiresAtEndOfToday(now),
    };
  }

  return {
    host: normalizedHost,
    scope,
    createdAt,
  };
}

export function activeHighlightSiteRules(
  rules: readonly HighlightSiteRule[],
  now = new Date(),
): readonly HighlightSiteRule[] {
  const nowMs = now.getTime();
  return rules.filter((rule) => rule.scope === "forever" || activeUntil(rule, nowMs));
}

export function highlightHostIsSuppressed(
  host: string,
  rules: readonly HighlightSiteRule[],
  now = new Date(),
): boolean {
  const normalizedHost = normalizedHighlightHost(host);
  return activeHighlightSiteRules(rules, now).some((rule) => rule.host === normalizedHost);
}

export function resolveHighlightTheme(theme: ThemePreference): ResolvedHighlightTheme {
  if (theme !== "system") {
    return theme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function highlightSettingsForContent(settings: AppSettings): PublicHighlightSettings {
  return {
    theme: settings.theme,
    highlightTrigger: settings.highlightTrigger,
    highlightSiteRules: activeHighlightSiteRules(settings.highlightSiteRules),
  };
}

function activeUntil(rule: HighlightSiteRule, nowMs: number): boolean {
  if (!rule.expiresAt) {
    return nowMs < new Date(rule.createdAt).getTime() + DAY_MS;
  }

  return nowMs < new Date(rule.expiresAt).getTime();
}
