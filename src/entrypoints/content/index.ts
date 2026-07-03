import { browser } from "wxt/browser";
import { defineContentScript } from "wxt/utils/define-content-script";
import { z } from "zod";

import { type ConceptRecord, ConceptRecordSchema } from "@/lib/domain";
import { extractCurrentPage } from "@/lib/page/extract";
import { resetHighlightElements } from "@/lib/page/highlight-dom";
import { APPLY_HIGHLIGHTS_MESSAGE } from "@/lib/page/highlight-messages";

const HIGHLIGHT_CLASS = "better-bookmarks-highlight";
const POPOVER_ID = "better-bookmarks-popover";
const POPOVER_EXIT_MS = 140;
const SKIP_SELECTOR =
  "script, style, textarea, input, select, option, button, a, [contenteditable='true'], [data-better-bookmarks]";

let activePopoverAnchor: HTMLElement | null = null;
let closePopoverTimer: number | null = null;
let positionPopoverFrame: number | null = null;

const ErrorResponseSchema = z.object({
  error: z.string(),
});

const BookmarkPreviewSchema = z.object({
  title: z.string().min(1),
  url: z.string().url(),
});
type BookmarkPreview = z.infer<typeof BookmarkPreviewSchema>;

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

async function requestBookmarksForConcept(term: string): Promise<readonly BookmarkPreview[]> {
  const response: unknown = await browser.runtime.sendMessage({
    type: "BETTER_BOOKMARKS_BOOKMARKS_FOR_CONCEPT",
    term,
  });
  throwIfErrorResponse(response);
  return z.array(BookmarkPreviewSchema).parse(response);
}

function injectStyles(): void {
  if (document.getElementById("better-bookmarks-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "better-bookmarks-style";
  style.textContent = `
    .${HIGHLIGHT_CLASS} {
      background: transparent;
      border-bottom: 2px solid color-mix(in oklab, currentColor 42%, transparent);
      color: inherit;
      cursor: pointer;
      padding-bottom: 1px;
    }
    .${HIGHLIGHT_CLASS}:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 3px;
    }
    #${POPOVER_ID} {
      position: fixed;
      z-index: 2147483647;
      max-width: 320px;
      border-radius: 14px;
      border: 1px solid color-mix(in oklab, CanvasText 16%, transparent);
      background: Canvas;
      box-shadow: 0 18px 40px oklch(0 0 0 / 0.28);
      color: CanvasText;
      font: 13px/1.45 "Geist Variable", ui-sans-serif, system-ui, sans-serif;
      opacity: 1;
      padding: 12px;
      transform: translateY(0) scale(1);
      transform-origin: top left;
      transition:
        opacity 140ms ease,
        transform 140ms ease;
    }
    #${POPOVER_ID}[data-state="closing"] {
      opacity: 0;
      pointer-events: none;
      transform: translateY(-4px) scale(0.98);
    }
    #${POPOVER_ID} a {
      color: LinkText;
    }
    #${POPOVER_ID} .better-bookmarks-popover-header {
      align-items: center;
      display: flex;
      gap: 12px;
      justify-content: space-between;
    }
    #${POPOVER_ID} .better-bookmarks-popover-close {
      align-items: center;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 999px;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      flex: 0 0 auto;
      font: 18px/1 ui-sans-serif, system-ui, sans-serif;
      height: 28px;
      justify-content: center;
      margin: -4px -4px 0 0;
      padding: 0;
      width: 28px;
    }
    #${POPOVER_ID} .better-bookmarks-popover-close:hover {
      background: color-mix(in oklab, CanvasText 10%, transparent);
    }
    #${POPOVER_ID} .better-bookmarks-popover-close:focus-visible {
      border-color: currentColor;
      outline: none;
    }
  `;
  document.documentElement.append(style);
}

function viewportContains(rect: DOMRect): boolean {
  return (
    rect.bottom > 0 &&
    rect.right > 0 &&
    rect.top < window.innerHeight &&
    rect.left < window.innerWidth
  );
}

function boundedPosition(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function positionPopover(popover: HTMLElement, anchor: HTMLElement): boolean {
  if (!anchor.isConnected) {
    return false;
  }

  const rect = anchor.getBoundingClientRect();
  if (!viewportContains(rect)) {
    return false;
  }

  const margin = 8;
  const popoverWidth = popover.offsetWidth || 320;
  const popoverHeight = popover.offsetHeight || 140;
  const left = boundedPosition(rect.left, margin, window.innerWidth - popoverWidth - margin);
  const below = rect.bottom + margin;
  const above = rect.top - popoverHeight - margin;
  const top =
    below + popoverHeight + margin <= window.innerHeight
      ? below
      : boundedPosition(above, margin, window.innerHeight - popoverHeight - margin);

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
  return true;
}

function updatePopoverPosition(): void {
  const popover = document.getElementById(POPOVER_ID);
  if (!popover || !activePopoverAnchor) {
    return;
  }

  if (!positionPopover(popover, activePopoverAnchor)) {
    closePopover();
  }
}

function schedulePopoverPositionUpdate(): void {
  if (positionPopoverFrame !== null) {
    return;
  }

  positionPopoverFrame = window.requestAnimationFrame(() => {
    positionPopoverFrame = null;
    updatePopoverPosition();
  });
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
): { readonly concept: ConceptRecord; readonly index: number; readonly length: number } | null {
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

function clearPopoverTimers(): void {
  if (closePopoverTimer !== null) {
    window.clearTimeout(closePopoverTimer);
    closePopoverTimer = null;
  }

  if (positionPopoverFrame !== null) {
    window.cancelAnimationFrame(positionPopoverFrame);
    positionPopoverFrame = null;
  }
}

function closePopover(animated = true): void {
  const popover = document.getElementById(POPOVER_ID);
  activePopoverAnchor = null;
  clearPopoverTimers();

  if (!popover) {
    return;
  }

  if (!animated) {
    popover.remove();
    return;
  }

  popover.setAttribute("data-state", "closing");
  closePopoverTimer = window.setTimeout(() => {
    popover.remove();
    closePopoverTimer = null;
  }, POPOVER_EXIT_MS);
}

function createCloseButton(): HTMLButtonElement {
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "better-bookmarks-popover-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closePopover();
  });
  return closeButton;
}

async function showPopover(mark: HTMLElement, term: string): Promise<void> {
  closePopover(false);
  const bookmarks = await requestBookmarksForConcept(term);
  if (!mark.isConnected) {
    return;
  }

  const rect = mark.getBoundingClientRect();
  if (!viewportContains(rect)) {
    return;
  }

  const popover = document.createElement("div");
  popover.id = POPOVER_ID;
  popover.setAttribute("data-better-bookmarks", "popover");
  popover.setAttribute("data-state", "open");
  const header = document.createElement("div");
  header.className = "better-bookmarks-popover-header";
  const title = document.createElement("strong");
  title.textContent = "Seen before";
  header.append(title, createCloseButton());

  const count = document.createElement("div");
  count.style.marginTop = "4px";
  count.style.color = "color-mix(in oklab, CanvasText 70%, transparent)";
  count.textContent = `${bookmarks.length} saved source${
    bookmarks.length === 1 ? "" : "s"
  } for ${term}`;

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "8px";
  list.style.marginTop = "10px";

  for (const bookmark of bookmarks.slice(0, 3)) {
    const link = document.createElement("a");
    link.href = bookmark.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = bookmark.title;
    list.append(link);
  }

  popover.append(header, count, list);
  document.documentElement.append(popover);
  activePopoverAnchor = mark;
  positionPopover(popover, mark);
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
  mark.addEventListener("click", () => showPopover(mark, match.concept.normalizedTerm));
  mark.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void showPopover(mark, match.concept.normalizedTerm);
    }
  });
  return true;
}

async function applyHighlights(): Promise<void> {
  if (!document.body) {
    return;
  }

  injectStyles();
  const concepts = await requestHighlightConcepts();
  resetHighlightElements();

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
        if (isApplyHighlightsMessage(message)) {
          void applyHighlights();
        }

        return false;
      }

      sendResponse(extractCurrentPage());
      return false;
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closePopover();
      }
    });

    document.addEventListener("pointerdown", (event) => {
      const popover = document.getElementById(POPOVER_ID);
      if (!popover || event.composedPath().includes(popover)) {
        return;
      }

      closePopover();
    });
    document.addEventListener("scroll", schedulePopoverPositionUpdate, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedulePopoverPositionUpdate, { passive: true });

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        void applyHighlights();
      });
      return;
    }

    void applyHighlights();
  },
});
