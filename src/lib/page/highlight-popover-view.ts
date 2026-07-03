import { formatBookmarkDate } from "@/lib/bookmarks/display-date";
import type { HighlightSiteRuleScope } from "@/lib/domain";

export type HighlightBookmarkPreview = {
  readonly title: string;
  readonly url: string;
  readonly domain: string;
  readonly summary: string;
  readonly savedAt: string;
};

export type HighlightPopoverContentParams = {
  readonly term: string;
  readonly bookmarks: readonly HighlightBookmarkPreview[];
  readonly dismissible: boolean;
};

export const HIGHLIGHT_DISMISS_SCOPE_ATTRIBUTE = "data-dismiss-scope";

const BRAND_MARK_TEXT = "BB";
const SVG_NS = "http://www.w3.org/2000/svg";

export function createHighlightPopoverContent({
  term,
  bookmarks,
  dismissible,
}: HighlightPopoverContentParams): readonly Node[] {
  return [
    createHeader(term, bookmarks.length, dismissible),
    createBookmarkList(bookmarks),
    createFooter(bookmarks.length),
  ];
}

function createHeader(term: string, sourceCount: number, dismissible: boolean): HTMLElement {
  const header = document.createElement("div");
  header.className = "better-bookmarks-popover-header";
  const brand = document.createElement("div");
  brand.className = "better-bookmarks-brand";
  brand.append(createBrandMark(), createHeaderCopy(term, sourceCount));
  header.append(brand, createHeaderActions(dismissible));
  return header;
}

function createBrandMark(): HTMLElement {
  const mark = document.createElement("span");
  mark.className = "better-bookmarks-brand-mark";
  mark.textContent = BRAND_MARK_TEXT;
  return mark;
}

function createHeaderCopy(term: string, sourceCount: number): HTMLElement {
  const copy = document.createElement("div");
  const titleRow = document.createElement("div");
  titleRow.className = "better-bookmarks-title-row";
  titleRow.append(createTitle(), createCountBadge(sourceCount));
  const description = document.createElement("p");
  description.id = "better-bookmarks-popover-description";
  description.className = "better-bookmarks-kicker";
  description.textContent = `Seen before: ${term}`;
  copy.append(titleRow, description);
  return copy;
}

function createTitle(): HTMLElement {
  const title = document.createElement("p");
  title.id = "better-bookmarks-popover-title";
  title.className = "better-bookmarks-popover-title";
  title.textContent = "Better Bookmarks";
  return title;
}

function createCountBadge(sourceCount: number): HTMLElement {
  const count = document.createElement("span");
  count.className = "better-bookmarks-count-badge";
  count.textContent = `${sourceCount} saved`;
  return count;
}

function createHeaderActions(dismissible: boolean): HTMLElement {
  const actions = document.createElement("div");
  actions.className = "better-bookmarks-popover-actions";

  if (dismissible) {
    actions.append(createDismissButton(), createDismissMenu());
  }

  actions.append(createCloseButton());
  return actions;
}

function createDismissButton(): HTMLButtonElement {
  const dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "better-bookmarks-popover-dismiss";
  dismissButton.setAttribute("aria-label", "Hide highlights on this site");
  dismissButton.setAttribute("aria-expanded", "false");
  dismissButton.append(createEyeOffIcon());
  return dismissButton;
}

function createDismissMenu(): HTMLElement {
  const menu = document.createElement("div");
  menu.className = "better-bookmarks-dismiss-menu";
  menu.hidden = true;
  menu.setAttribute("role", "menu");
  menu.append(
    createDismissMenuItem("today", "Do not show for today"),
    createDismissMenuItem("forever", "Do not show ever"),
  );
  return menu;
}

function createDismissMenuItem(scope: HighlightSiteRuleScope, label: string): HTMLButtonElement {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "better-bookmarks-dismiss-menu-item";
  item.setAttribute("role", "menuitem");
  item.setAttribute(HIGHLIGHT_DISMISS_SCOPE_ATTRIBUTE, scope);
  item.textContent = label;
  return item;
}

function createCloseButton(): HTMLButtonElement {
  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "better-bookmarks-popover-close";
  closeButton.setAttribute("aria-label", "Close");
  closeButton.append(createXIcon());
  return closeButton;
}

function createIcon(paths: readonly string[]): SVGSVGElement {
  const icon = document.createElementNS(SVG_NS, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "2");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");

  for (const pathData of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", pathData);
    icon.append(path);
  }

  return icon;
}

function createEyeOffIcon(): SVGSVGElement {
  return createIcon([
    "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
    "M14.084 14.158a3 3 0 0 1-4.242-4.242",
    "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
    "m2 2 20 20",
  ]);
}

function createXIcon(): SVGSVGElement {
  return createIcon(["M18 6 6 18", "m6 6 12 12"]);
}

function createBookmarkList(bookmarks: readonly HighlightBookmarkPreview[]): HTMLElement {
  const list = document.createElement("div");
  list.className = "better-bookmarks-source-list";

  for (const bookmark of bookmarks) {
    list.append(createBookmarkCard(bookmark));
  }

  return list;
}

function createBookmarkCard(bookmark: HighlightBookmarkPreview): HTMLAnchorElement {
  const card = document.createElement("a");
  card.className = "better-bookmarks-source-card";
  card.href = bookmark.url;
  card.target = "_blank";
  card.rel = "noreferrer";
  card.append(createCardMeta(bookmark), createCardTitle(bookmark), createCardSummary(bookmark));
  return card;
}

function createCardMeta(bookmark: HighlightBookmarkPreview): HTMLElement {
  const meta = document.createElement("div");
  meta.className = "better-bookmarks-source-meta";
  const domain = document.createElement("span");
  domain.className = "better-bookmarks-domain";
  domain.textContent = bookmark.domain;
  const savedAt = document.createElement("span");
  savedAt.className = "better-bookmarks-card-date";
  savedAt.textContent = formatBookmarkDate(bookmark.savedAt) ?? "Saved source";
  meta.append(domain, savedAt);
  return meta;
}

function createCardTitle(bookmark: HighlightBookmarkPreview): HTMLElement {
  const title = document.createElement("p");
  title.className = "better-bookmarks-source-title";
  title.textContent = bookmark.title;
  return title;
}

function createCardSummary(bookmark: HighlightBookmarkPreview): HTMLElement {
  const summary = document.createElement("p");
  summary.className = "better-bookmarks-source-summary";
  summary.textContent = bookmark.summary;
  return summary;
}

function createFooter(sourceCount: number): HTMLElement {
  const footer = document.createElement("div");
  footer.className = "better-bookmarks-popover-footer";
  const label = document.createElement("span");
  label.textContent = "Local memory";
  const pill = document.createElement("span");
  pill.className = "better-bookmarks-footer-pill";
  pill.textContent = sourceCount === 1 ? "1 match" : `${sourceCount} matches`;
  footer.append(label, pill);
  return footer;
}
