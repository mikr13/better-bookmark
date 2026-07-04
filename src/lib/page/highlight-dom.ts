import { planHighlightMatches, type HighlightCandidate } from "@/lib/page/highlight-matching";
import type { HighlightTerm } from "@/lib/page/highlight-term";

const DEFAULT_HIGHLIGHT_SELECTOR = "mark.better-bookmarks-highlight";
const DEFAULT_SKIP_SELECTOR =
  "script, style, textarea, input, select, option, button, a, [contenteditable='true'], [data-better-bookmarks]";
const DEFAULT_MAX_TOTAL_HIGHLIGHTS = 160;
const DEFAULT_MAX_HIGHLIGHTS_PER_TERM = 32;

export type ApplyHighlightTermsOptions = {
  readonly terms: readonly HighlightTerm[];
  readonly className: string;
  readonly root?: HTMLElement;
  readonly skipSelector?: string;
  readonly maxTotalHighlights?: number;
  readonly maxHighlightsPerTerm?: number;
  readonly onHighlight?: (mark: HTMLElement, term: HighlightTerm) => void;
};

export function resetHighlightElements(selector = DEFAULT_HIGHLIGHT_SELECTOR): number {
  const marks = Array.from(document.querySelectorAll<HTMLElement>(selector));

  for (const mark of marks) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
    parent?.normalize();
  }

  return marks.length;
}

export function applyHighlightTerms(options: ApplyHighlightTermsOptions): number {
  const root = options.root ?? document.body;

  if (!root) {
    return 0;
  }

  const selected = planHighlightMatches({
    nodes: candidateTextNodes(root, options.skipSelector ?? DEFAULT_SKIP_SELECTOR),
    terms: options.terms,
    maxHighlightsPerTerm: options.maxHighlightsPerTerm ?? DEFAULT_MAX_HIGHLIGHTS_PER_TERM,
    maxTotalHighlights: options.maxTotalHighlights ?? DEFAULT_MAX_TOTAL_HIGHLIGHTS,
  });

  applyMatches({
    matches: selected,
    className: options.className,
    onHighlight: options.onHighlight,
  });

  return selected.length;
}

function candidateTextNodes(root: HTMLElement, skipSelector: string): readonly Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current = walker.nextNode();

  while (current) {
    if (current.nodeType === Node.TEXT_NODE && current instanceof Text) {
      const parent = current.parentElement;
      const text = current.textContent ?? "";
      if (
        text.trim().length > 2 &&
        parent &&
        !parent.closest(skipSelector) &&
        !parent.hasAttribute("data-better-bookmarks")
      ) {
        nodes.push(current);
      }
    }
    current = walker.nextNode();
  }

  return nodes;
}

function applyMatches({
  matches,
  className,
  onHighlight,
}: {
  readonly matches: readonly HighlightCandidate[];
  readonly className: string;
  readonly onHighlight: ((mark: HTMLElement, term: HighlightTerm) => void) | undefined;
}): void {
  const byNode = new Map<Text, HighlightCandidate[]>();

  for (const match of matches) {
    const existing = byNode.get(match.node);
    if (existing) {
      existing.push(match);
      continue;
    }
    byNode.set(match.node, [match]);
  }

  for (const [node, nodeMatches] of byNode) {
    const descending = [...nodeMatches].sort((left, right) => right.start - left.start);
    for (const match of descending) {
      const selected = Text.prototype.splitText.call(node, match.start);
      Text.prototype.splitText.call(selected, match.length);
      const mark = document.createElement("mark");
      mark.className = className;
      mark.setAttribute("data-better-bookmarks", "highlight");
      mark.setAttribute("data-term", match.term.normalizedTerm);
      mark.tabIndex = 0;
      mark.textContent = selected.textContent;
      selected.replaceWith(mark);
      onHighlight?.(mark, match.term);
    }
  }
}
