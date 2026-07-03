import { ExtractedPageSchema, type ExtractedPage } from "@/lib/domain";

const TEXT_BLOCK_SELECTOR = "article, main, section, h1, h2, h3, p, li, blockquote";

function text(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function canonicalUrl(): string {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return canonical?.href || window.location.href;
}

function metaDescription(): string | undefined {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
  const content = text(meta?.content);
  return content.length > 0 ? content : undefined;
}

function visibleText(): string {
  const blocks = Array.from(document.querySelectorAll<HTMLElement>(TEXT_BLOCK_SELECTOR));
  return blocks
    .filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== "none" && style.visibility !== "hidden";
    })
    .map((element) => text(element.innerText))
    .filter((value) => value.length > 0)
    .join("\n")
    .slice(0, 24000);
}

function headings(): readonly string[] {
  return Array.from(document.querySelectorAll("h1, h2, h3"))
    .map((element) => text(element.textContent))
    .filter((value) => value.length > 0)
    .slice(0, 32);
}

function domOutline(): string {
  return Array.from(document.querySelectorAll("main h1, main h2, main h3, article h1, article h2"))
    .map((element) => `${element.tagName.toLocaleLowerCase()}: ${text(element.textContent)}`)
    .filter((value) => value.length > 4)
    .join("\n")
    .slice(0, 5000);
}

export function extractCurrentPage(): ExtractedPage {
  const payload = {
    url: canonicalUrl(),
    title: text(document.title) || window.location.hostname,
    domain: window.location.hostname,
    description: metaDescription(),
    headings: headings(),
    articleText: text(document.querySelector("article")?.textContent).slice(0, 20000),
    visibleText: visibleText(),
    domOutline: domOutline(),
  };

  return ExtractedPageSchema.parse(payload);
}
