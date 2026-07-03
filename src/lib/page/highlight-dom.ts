const DEFAULT_HIGHLIGHT_SELECTOR = "mark.better-bookmarks-highlight";

export function resetHighlightElements(selector = DEFAULT_HIGHLIGHT_SELECTOR): number {
  const marks = Array.from(document.querySelectorAll<HTMLElement>(selector));

  for (const mark of marks) {
    const parent = mark.parentNode;
    mark.replaceWith(document.createTextNode(mark.textContent ?? ""));
    parent?.normalize();
  }

  return marks.length;
}
