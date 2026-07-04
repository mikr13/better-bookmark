import { describe, expect, it } from "vite-plus/test";

import { applyHighlightTerms, resetHighlightElements } from "@/lib/page/highlight-dom";
import type { HighlightTerm } from "@/lib/page/highlight-term";

function term(normalizedTerm: string, aliases: readonly string[] = []): HighlightTerm {
  return {
    term: normalizedTerm,
    normalizedTerm,
    aliases: [...aliases],
  };
}

describe("resetHighlightElements", () => {
  it("restores marked text so highlight refreshes are idempotent", () => {
    document.body.innerHTML =
      '<p>industrial <mark class="better-bookmarks-highlight">biotechnology</mark>.</p>';

    const resetCount = resetHighlightElements();

    expect(resetCount).toBe(1);
    expect(document.querySelector("mark.better-bookmarks-highlight")).toBeNull();
    expect(document.body.textContent).toBe("industrial biotechnology.");
  });
});

describe("applyHighlightTerms", () => {
  it("distributes matches through the full page instead of only the first matches", () => {
    document.body.innerHTML = Array.from(
      { length: 40 },
      (_, index) => `<p data-row="${index}">This row mentions a gene in passing.</p>`,
    ).join("");

    const count = applyHighlightTerms({
      terms: [term("gene")],
      className: "better-bookmarks-highlight",
      maxHighlightsPerTerm: 5,
      maxTotalHighlights: 5,
    });
    const rows = Array.from(document.querySelectorAll("mark.better-bookmarks-highlight")).map(
      (mark) => mark.closest("p")?.getAttribute("data-row"),
    );

    expect(count).toBe(5);
    expect(rows).toContain("0");
    expect(rows).toContain("39");
  });

  it("highlights late page title terms such as biotechnology", () => {
    document.body.innerHTML = [
      "<p>Early article text mentions genetics and genes.</p>",
      ...Array.from({ length: 28 }, (_, index) => `<p>Filler paragraph ${index}.</p>`),
      '<p data-target="true">Genetic engineering has applications in biotechnology.</p>',
    ].join("");

    const count = applyHighlightTerms({
      terms: [term("gene"), term("biotechnology")],
      className: "better-bookmarks-highlight",
      maxHighlightsPerTerm: 4,
      maxTotalHighlights: 8,
    });
    const target = document.querySelector('[data-target="true"] mark.better-bookmarks-highlight');

    expect(count).toBeGreaterThan(0);
    expect(target?.textContent).toBe("biotechnology");
  });

  it("prefers longer saved phrases over nested shorter terms", () => {
    document.body.innerHTML = "<p>Molecular gene definitions mention a gene.</p>";

    applyHighlightTerms({
      terms: [term("gene"), term("molecular gene")],
      className: "better-bookmarks-highlight",
    });
    const marks = Array.from(document.querySelectorAll("mark.better-bookmarks-highlight"));

    expect(marks.map((mark) => mark.textContent)).toEqual(["Molecular gene", "gene"]);
    expect(marks.map((mark) => mark.getAttribute("data-term"))).toEqual(["molecular gene", "gene"]);
  });

  it("does not match saved short terms inside larger words", () => {
    document.body.innerHTML = "<p>Genetics is related to gene expression.</p>";

    applyHighlightTerms({
      terms: [term("gene")],
      className: "better-bookmarks-highlight",
    });

    expect(Array.from(document.querySelectorAll("mark")).map((mark) => mark.textContent)).toEqual([
      "gene",
    ]);
  });
});
