import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { z } from "zod";

import {
  appSettingsItem,
  restrictLocalStorageToTrustedContexts,
  setHighlightSiteRule,
} from "@/lib/app-storage";
import { bookmarksForHighlightTerm, listHighlightTerms } from "@/lib/bookmarks/highlight-index";
import { HighlightSiteRuleScopeSchema } from "@/lib/domain";
import {
  APPLY_HIGHLIGHTS_MESSAGE,
  GET_HIGHLIGHT_SETTINGS_MESSAGE,
  HIGHLIGHT_SETTINGS_CHANGED_MESSAGE,
  REFRESH_HIGHLIGHTS_MESSAGE,
  SET_HIGHLIGHT_SITE_RULE_MESSAGE,
} from "@/lib/page/highlight-messages";
import {
  highlightSettingsForContent,
  type PublicHighlightSettings,
} from "@/lib/page/highlight-settings";

type RuntimeSendResponse = (response?: unknown) => void;

const SetHighlightSiteRuleMessageSchema = z.object({
  type: z.literal(SET_HIGHLIGHT_SITE_RULE_MESSAGE),
  host: z.string().min(1),
  scope: HighlightSiteRuleScopeSchema,
});

function runtimeMessageType(message: unknown): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const type = Reflect.get(message, "type");
  return typeof type === "string" ? type : null;
}

function isOpenSidePanelMessage(message: unknown): message is { readonly type: string } {
  return runtimeMessageType(message) === "BETTER_BOOKMARKS_OPEN_SIDE_PANEL";
}

function isRefreshHighlightsMessage(message: unknown): message is { readonly type: string } {
  return runtimeMessageType(message) === REFRESH_HIGHLIGHTS_MESSAGE;
}

function isGetHighlightSettingsMessage(message: unknown): message is { readonly type: string } {
  return runtimeMessageType(message) === GET_HIGHLIGHT_SETTINGS_MESSAGE;
}

function messageStringField(message: unknown, field: string): string | null {
  if (!message || typeof message !== "object") {
    return null;
  }

  const value = Reflect.get(message, field);
  return typeof value === "string" ? value : null;
}

function responseError(error: unknown): { readonly error: string } {
  return {
    error: error instanceof Error ? error.message : "Unknown extension failure.",
  };
}

function sendAsyncResponse(operation: Promise<unknown>, sendResponse: RuntimeSendResponse): void {
  void operation.then(sendResponse).catch((error: unknown) => {
    sendResponse(responseError(error));
  });
}

async function bookmarkPreviewsForTerm(term: string): Promise<
  readonly {
    readonly title: string;
    readonly url: string;
    readonly domain: string;
    readonly summary: string;
    readonly savedAt: string;
  }[]
> {
  const bookmarks = await bookmarksForHighlightTerm(term);
  return bookmarks.slice(0, 8).map((bookmark) => ({
    title: bookmark.title,
    url: bookmark.url,
    domain: bookmark.domain,
    summary: bookmark.summary,
    savedAt: bookmark.savedAt,
  }));
}

async function openSidePanel(tabId?: number): Promise<void> {
  if (!browser.sidePanel?.open) {
    await browser.runtime.openOptionsPage();
    return;
  }

  if (tabId === undefined) {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const active = tabs[0];
    if (active?.id === undefined) {
      await browser.runtime.openOptionsPage();
      return;
    }
    await browser.sidePanel.open({ tabId: active.id });
    return;
  }

  await browser.sidePanel.open({ tabId });
}

async function refreshHighlightTabs(): Promise<void> {
  await sendMessageToHighlightTabs({ type: APPLY_HIGHLIGHTS_MESSAGE });
}

async function sendHighlightSettingsChanged(settings: PublicHighlightSettings): Promise<void> {
  await sendMessageToHighlightTabs({
    type: HIGHLIGHT_SETTINGS_CHANGED_MESSAGE,
    settings,
  });
}

async function sendMessageToHighlightTabs(message: unknown): Promise<void> {
  const tabs = await browser.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.allSettled(
    tabs.map((tab) =>
      tab.id === undefined ? Promise.resolve() : browser.tabs.sendMessage(tab.id, message),
    ),
  );
}

async function currentHighlightSettings(): Promise<PublicHighlightSettings> {
  const settings = await appSettingsItem.getValue();
  return highlightSettingsForContent(settings);
}

async function suppressHighlightSite(message: unknown): Promise<PublicHighlightSettings> {
  const parsed = SetHighlightSiteRuleMessageSchema.parse(message);
  const settings = await setHighlightSiteRule(parsed.host, parsed.scope);
  return highlightSettingsForContent(settings);
}

export default defineBackground(() => {
  void restrictLocalStorageToTrustedContexts();
  appSettingsItem.watch((settings) => {
    void sendHighlightSettingsChanged(highlightSettingsForContent(settings));
  });

  if (browser.sidePanel?.setPanelBehavior) {
    void browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const type = runtimeMessageType(message);

    if (isOpenSidePanelMessage(message)) {
      void openSidePanel(sender.tab?.id);
      return true;
    }

    if (isRefreshHighlightsMessage(message)) {
      sendAsyncResponse(refreshHighlightTabs(), sendResponse);
      return true;
    }

    if (isGetHighlightSettingsMessage(message)) {
      sendAsyncResponse(currentHighlightSettings(), sendResponse);
      return true;
    }

    if (type === SET_HIGHLIGHT_SITE_RULE_MESSAGE) {
      sendAsyncResponse(suppressHighlightSite(message), sendResponse);
      return true;
    }

    if (type === "BETTER_BOOKMARKS_LIST_HIGHLIGHT_TERMS") {
      sendAsyncResponse(listHighlightTerms(), sendResponse);
      return true;
    }

    if (type === "BETTER_BOOKMARKS_BOOKMARKS_FOR_HIGHLIGHT_TERM") {
      const term = messageStringField(message, "term");

      if (!term) {
        sendResponse({ error: "Missing highlight term." });
        return false;
      }

      sendAsyncResponse(bookmarkPreviewsForTerm(term), sendResponse);
      return true;
    }

    return false;
  });

  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
      void browser.runtime.openOptionsPage();
    }
  });
});
