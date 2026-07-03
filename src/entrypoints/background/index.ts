import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

import { restrictLocalStorageToTrustedContexts } from "@/lib/app-storage";
import { bookmarksForConcept, listHighlightConcepts } from "@/lib/bookmarks/repository";
import {
  APPLY_HIGHLIGHTS_MESSAGE,
  REFRESH_HIGHLIGHTS_MESSAGE,
} from "@/lib/page/highlight-messages";

type RuntimeSendResponse = (response?: unknown) => void;

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

async function bookmarkPreviewsForConcept(
  term: string,
): Promise<readonly { readonly title: string; readonly url: string }[]> {
  const bookmarks = await bookmarksForConcept(term);
  return bookmarks.slice(0, 3).map((bookmark) => ({
    title: bookmark.title,
    url: bookmark.url,
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
  const tabs = await browser.tabs.query({ url: ["http://*/*", "https://*/*"] });
  await Promise.allSettled(
    tabs.map((tab) =>
      tab.id === undefined
        ? Promise.resolve()
        : browser.tabs.sendMessage(tab.id, { type: APPLY_HIGHLIGHTS_MESSAGE }),
    ),
  );
}

export default defineBackground(() => {
  void restrictLocalStorageToTrustedContexts();

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

    if (type === "BETTER_BOOKMARKS_LIST_HIGHLIGHT_CONCEPTS") {
      sendAsyncResponse(listHighlightConcepts(), sendResponse);
      return true;
    }

    if (type === "BETTER_BOOKMARKS_BOOKMARKS_FOR_CONCEPT") {
      const term = messageStringField(message, "term");

      if (!term) {
        sendResponse({ error: "Missing concept term." });
        return false;
      }

      sendAsyncResponse(bookmarkPreviewsForConcept(term), sendResponse);
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
