import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { z } from "zod";

import {
  ConceptRecordSchema,
  defaultSettings,
  type ConceptRecord,
  type HighlightSiteRuleScope,
} from "@/lib/domain";
import { extractCurrentPage } from "@/lib/page/extract";
import { resetHighlightElements } from "@/lib/page/highlight-dom";
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

const SKIP_SELECTOR =
  "script, style, textarea, input, select, option, button, a, [contenteditable='true'], [data-better-bookmarks]";

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

async function requestHighlightConcepts(): Promise<readonly ConceptRecord[]> {
  const response: unknown = await browser.runtime.sendMessage({
    type: "BETTER_BOOKMARKS_LIST_HIGHLIGHT_CONCEPTS",
  });
  throwIfErrorResponse(response);
  return z.array(ConceptRecordSchema).parse(response);
}

async function requestHighlightSettings(): Promise<PublicHighlightSettings> {
  const response: unknown = await browser.runtime.sendMessage({
    type: GET_HIGHLIGHT_SETTINGS_MESSAGE,
  });
  throwIfErrorResponse(response);
  return PublicHighlightSettingsSchema.parse(response);
}

async function requestBookmarksForConcept(term: string): Promise<readonly BookmarkPreview[]> {
  const response: unknown = await browser.runtime.sendMessage({
    type: "BETTER_BOOKMARKS_BOOKMARKS_FOR_CONCEPT",
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

function candidateTextNodes(): readonly Node[] {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Node[] = [];
  let current = walker.nextNode();

  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      const text = current.textContent ?? "";
      const parent = current.parentElement;
      if (
        text.trim().length > 24 &&
        parent &&
        !parent.closest(SKIP_SELECTOR) &&
        !parent.hasAttribute("data-better-bookmarks")
      ) {
        nodes.push(current);
      }
    }
    current = walker.nextNode();
  }

  return nodes;
}

function termsForConcept(concept: ConceptRecord): readonly string[] {
  return [concept.normalizedTerm, ...concept.aliases]
    .filter((term) => term.length > 2)
    .sort((left, right) => right.length - left.length);
}

function findMatch(
  text: string,
  concepts: readonly ConceptRecord[],
): {
  readonly concept: ConceptRecord;
  readonly index: number;
  readonly length: number;
} | null {
  const lower = text.toLocaleLowerCase();

  for (const concept of concepts) {
    for (const term of termsForConcept(concept)) {
      const index = lower.indexOf(term);
      if (index >= 0) {
        return { concept, index, length: term.length };
      }
    }
  }

  return null;
}

function wrapMatch(node: Node, concepts: readonly ConceptRecord[]): boolean {
  const text = node.textContent ?? "";
  const match = findMatch(text, concepts);

  if (!match || node.nodeType !== Node.TEXT_NODE) {
    return false;
  }

  const selected = Text.prototype.splitText.call(node, match.index);
  Text.prototype.splitText.call(selected, match.length);
  const mark = document.createElement("mark");
  mark.className = HIGHLIGHT_CLASS;
  mark.setAttribute("data-better-bookmarks", "highlight");
  mark.setAttribute("data-term", match.concept.normalizedTerm);
  mark.tabIndex = 0;
  mark.textContent = selected.textContent;
  selected.replaceWith(mark);
  attachHighlightTrigger(mark, match.concept.normalizedTerm);
  return true;
}

function attachHighlightTrigger(mark: HTMLElement, term: string): void {
  const openPopover = (): void => {
    void showHighlightPopover({
      mark,
      term,
      loadBookmarks: requestBookmarksForConcept,
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

  const concepts = await requestHighlightConcepts();

  if (concepts.length === 0) {
    return;
  }

  let count = 0;
  for (const node of candidateTextNodes()) {
    if (count >= 12) {
      break;
    }

    if (wrapMatch(node, concepts)) {
      count += 1;
    }
  }
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
