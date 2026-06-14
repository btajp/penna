import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";
import type { LoadedFile } from "../types";
import { sanitize } from "./sanitize";
import { resolveImageSrc } from "./links";

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
})
  .use(taskLists, { enabled: true, label: true })
  .use(footnote);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rewriteImageSources(html: string, baseDir: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (src !== null) {
      img.setAttribute("src", resolveImageSrc(src, baseDir));
    }
  }
  return doc.body.innerHTML;
}

export function renderDocument(file: LoadedFile, baseDir: string): string {
  if (file.kind === "Markdown") {
    const rendered = md.render(file.text);
    const rewritten = rewriteImageSources(rendered, baseDir);
    // Wrap in .markdown-body so Task 16 CSS (`.markdown-body ...`) applies.
    return `<div class="markdown-body">${sanitize(rewritten)}</div>`;
  }
  return sanitize(`<pre class="plaintext">${escapeHtml(file.text)}</pre>`);
}
