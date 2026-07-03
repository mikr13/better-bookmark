import type { HighlightSiteRuleScope } from "@/lib/domain";
import { HighlightSiteRuleScopeSchema } from "@/lib/domain";
import {
  createHighlightPopoverContent,
  HIGHLIGHT_DISMISS_SCOPE_ATTRIBUTE,
  type HighlightBookmarkPreview,
} from "@/lib/page/highlight-popover-view";
import type { ResolvedHighlightTheme } from "@/lib/page/highlight-settings";

import popoverCss from "@/lib/page/highlight-popover.css?inline";

export const HIGHLIGHT_CLASS = "better-bookmarks-highlight";
export type { HighlightBookmarkPreview };

export type LoadBookmarksForConcept = (
  term: string,
) => Promise<readonly HighlightBookmarkPreview[]>;

export type ShowHighlightPopoverParams = {
  readonly mark: HTMLElement;
  readonly term: string;
  readonly loadBookmarks: LoadBookmarksForConcept;
  readonly theme: ResolvedHighlightTheme;
  readonly onDismissSite?: (scope: HighlightSiteRuleScope) => Promise<void> | void;
};

const POPOVER_ID = "better-bookmarks-popover";
const POPOVER_EXIT_MS = 140;

let activePopoverAnchor: HTMLElement | null = null;
let closePopoverTimer: number | null = null;
let listenersAttached = false;
let positionPopoverFrame: number | null = null;

export function injectHighlightStyles(): void {
  if (document.getElementById("better-bookmarks-style")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "better-bookmarks-style";
  style.textContent = popoverCss;
  document.documentElement.append(style);
}

export function attachHighlightPopoverListeners(): void {
  if (listenersAttached) {
    return;
  }

  listenersAttached = true;
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeHighlightPopover();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover || event.composedPath().includes(popover)) {
      return;
    }

    closeHighlightPopover();
  });

  document.addEventListener("scroll", schedulePopoverPositionUpdate, {
    capture: true,
    passive: true,
  });
  window.addEventListener("resize", schedulePopoverPositionUpdate, { passive: true });
}

export async function showHighlightPopover({
  mark,
  term,
  loadBookmarks,
  theme,
  onDismissSite,
}: ShowHighlightPopoverParams): Promise<void> {
  closeHighlightPopover(false);
  const bookmarks = await loadBookmarks(term);
  if (!mark.isConnected || !viewportContains(mark.getBoundingClientRect())) {
    return;
  }

  const popover = document.createElement("div");
  popover.id = POPOVER_ID;
  popover.setAttribute("data-better-bookmarks", "popover");
  popover.setAttribute("data-state", "open");
  popover.setAttribute("data-theme", theme);
  popover.setAttribute("role", "dialog");
  popover.setAttribute("aria-labelledby", "better-bookmarks-popover-title");
  popover.setAttribute("aria-describedby", "better-bookmarks-popover-description");
  popover.append(
    ...createHighlightPopoverContent({
      term,
      bookmarks,
      dismissible: onDismissSite !== undefined,
    }),
  );
  bindPopoverControls(popover, onDismissSite);
  document.documentElement.append(popover);
  activePopoverAnchor = mark;
  positionPopover(popover, mark);
}

export function closeHighlightPopover(animated = true): void {
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
  const popoverWidth = popover.offsetWidth || 360;
  const popoverHeight = popover.offsetHeight || 220;
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
    closeHighlightPopover();
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

function bindPopoverControls(
  popover: HTMLElement,
  onDismissSite: ShowHighlightPopoverParams["onDismissSite"],
): void {
  const closeButton = popover.querySelector(".better-bookmarks-popover-close");
  if (closeButton instanceof HTMLButtonElement) {
    closeButton.addEventListener("click", (event) => {
      event.stopPropagation();
      closeHighlightPopover();
    });
  }

  bindDismissControls(popover, onDismissSite);
}

function bindDismissControls(
  popover: HTMLElement,
  onDismissSite: ShowHighlightPopoverParams["onDismissSite"],
): void {
  if (!onDismissSite) {
    return;
  }

  const dismissButton = popover.querySelector(".better-bookmarks-popover-dismiss");
  const dismissMenu = popover.querySelector(".better-bookmarks-dismiss-menu");
  if (!(dismissButton instanceof HTMLButtonElement) || !(dismissMenu instanceof HTMLElement)) {
    return;
  }

  dismissButton.addEventListener("click", (event) => {
    event.stopPropagation();
    dismissMenu.hidden = !dismissMenu.hidden;
    dismissButton.setAttribute("aria-expanded", String(!dismissMenu.hidden));
  });

  const dismissItems = popover.querySelectorAll(`[${HIGHLIGHT_DISMISS_SCOPE_ATTRIBUTE}]`);
  for (const item of dismissItems) {
    if (!(item instanceof HTMLButtonElement)) {
      continue;
    }

    const parsed = HighlightSiteRuleScopeSchema.safeParse(
      item.getAttribute(HIGHLIGHT_DISMISS_SCOPE_ATTRIBUTE),
    );
    if (!parsed.success) {
      continue;
    }

    item.addEventListener("click", (event) => {
      event.stopPropagation();
      void onDismissSite(parsed.data);
    });
  }
}
