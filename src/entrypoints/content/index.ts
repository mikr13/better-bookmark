import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { z } from "zod";

import { defaultSettings, type HighlightSiteRuleScope } from "@/lib/domain";
import { extractCurrentPage } from "@/lib/page/extract";
import { applyHighlightTerms, resetHighlightElements } from "@/lib/page/highlight-dom";
import {
  APPLY_HIGHLIGHTS_MESSAGE,
  GET_HIGHLIGHT_SETTINGS_MESSAGE,
  SET_HIGHLIGHT_SITE_RULE_MESSAGE,
} from "@/lib/page/highlight-messages";
import {
  attachHighlightPopoverListeners,
  closeHighlightPopover,
  HIGHLIGHT_CLASS,
  injectHighlightStyles,
  showHighlightPopover,
} from "@/lib/page/highlight-popover";
import {
  HighlightSettingsChangedMessageSchema,
  highlightHostIsSuppressed,
  highlightSettingsForContent,
  PublicHighlightSettingsSchema,
  resolveHighlightTheme,
  type PublicHighlightSettings,
} from "@/lib/page/highlight-settings";
import { HighlightTermSchema, type HighlightTerm } from "@/lib/page/highlight-term";

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const BookmarkPreviewSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  domain: z.string().min(1),
  summary: z.string().min(1),
  savedAt: z.string().min(1),
});
type BookmarkPreview = z.infer<typeof BookmarkPreviewSchema>;

let activeHighlightSettings: PublicHighlightSettings = highlightSettingsForContent(defaultSettings);

function runtimeMessageType(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const type = Reflect.get(message, "type");
  return typeof type === "string" ? type : null;
}

function isExtractMessage(message: unknown): boolean {
  return runtimeMessageType(message) === "BETTER_BOOKMARKS_EXTRACT_PAGE";
}

function isApplyHighlightsMessage(message: unknown): boolean {
  return runtimeMessageType(message) === APPLY_HIGHLIGHTS_MESSAGE;
}

function highlightSettingsFromChangeMessage(message: unknown): PublicHighlightSettings | null {
  const parsed = HighlightSettingsChangedMessageSchema.safeParse(message);
  return parsed.success ? parsed.data.settings : null;
}

function throwIfErrorResponse(response: unknown): void {
  const parsed = ErrorResponseSchema.safeParse(response);

  if (parsed.success) {
    throw new Error(parsed.data.error);
  }
}

async function requestHighlightTerms(): Promise<readonly HighlightTerm[]> {
  const response: unknown = await browser.runtime.sendMessage({
    type: "BETTER_BOOKMARKS_LIST_HIGHLIGHT_TERMS",
  });
  throwIfErrorResponse(response);
  return z.array(HighlightTermSchema).parse(response);
}

async function requestHighlightSettings(): Promise<PublicHighlightSettings> {
  const response: unknown = await browser.runtime.sendMessage({
    type: GET_HIGHLIGHT_SETTINGS_MESSAGE,
  });
  throwIfErrorResponse(response);
  return PublicHighlightSettingsSchema.parse(response);
}

async function requestBookmarksForTerm(term: string): Promise<readonly BookmarkPreview[]> {
  const response: unknown = await browser.runtime.sendMessage({
    type: "BETTER_BOOKMARKS_BOOKMARKS_FOR_HIGHLIGHT_TERM",
    term,
  });
  throwIfErrorResponse(response);
  return z.array(BookmarkPreviewSchema).parse(response);
}

async function suppressCurrentHighlightSite(scope: HighlightSiteRuleScope): Promise<void> {
  const response: unknown = await browser.runtime.sendMessage({
    type: SET_HIGHLIGHT_SITE_RULE_MESSAGE,
    host: window.location.hostname,
    scope,
  });
  throwIfErrorResponse(response);
  const settings = PublicHighlightSettingsSchema.parse(response);
  await applyHighlights(settings);
}

function attachHighlightTrigger(mark: HTMLElement, term: string): void {
  const openPopover = (): void => {
    void showHighlightPopover({
      mark,
      term,
      loadBookmarks: requestBookmarksForTerm,
      theme: resolveHighlightTheme(activeHighlightSettings.theme),
      onDismissSite: suppressCurrentHighlightSite,
    });
  };

  if (activeHighlightSettings.highlightTrigger === "hover") {
    mark.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") {
        openPopover();
      }
    });
  } else {
    mark.addEventListener("click", openPopover);
  }

  mark.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPopover();
    }
  });
}

async function applyHighlights(settings?: PublicHighlightSettings): Promise<void> {
  if (!document.body) {
    return;
  }

  injectHighlightStyles();
  activeHighlightSettings = settings ?? (await requestHighlightSettings());
  closeHighlightPopover(false);
  resetHighlightElements();

  if (
    highlightHostIsSuppressed(window.location.hostname, activeHighlightSettings.highlightSiteRules)
  ) {
    return;
  }

  const terms = await requestHighlightTerms();

  if (terms.length === 0) {
    return;
  }

  applyHighlightTerms({
    terms,
    className: HIGHLIGHT_CLASS,
    onHighlight: (mark, term) => {
      attachHighlightTrigger(mark, term.normalizedTerm);
    },
  });
}

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (!isExtractMessage(message)) {
        const settings = highlightSettingsFromChangeMessage(message);
        if (settings) {
          void applyHighlights(settings);
          return false;
        }

        if (isApplyHighlightsMessage(message)) {
          void applyHighlights();
        }

        return false;
      }

      sendResponse(extractCurrentPage());
      return false;
    });

    attachHighlightPopoverListeners();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      const popover = document.getElementById("better-bookmarks-popover");
      if (popover) {
        popover.setAttribute("data-theme", resolveHighlightTheme(activeHighlightSettings.theme));
      }
    });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        void applyHighlights();
      });
      return;
    }

    void applyHighlights();
  },
});
