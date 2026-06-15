import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sanitize", () => ({
  sanitize: (html: string) => html,
}));
vi.mock("./links", () => ({
  resolveImageSrc: (src: string, baseDir: string) =>
    src.startsWith("http") ? src : `RESOLVED(${baseDir}|${src})`,
  classifyLink: (href: string) =>
    href.startsWith("http") ? "external" : href.startsWith("#") ? "anchor" : "local-file",
}));

import { renderDocument } from "./renderer";
import type { LoadedFile } from "../types";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function md(text: string): LoadedFile {
  return { path: "/docs/a.md", text, encoding: "UTF-8", kind: "Markdown" };
}

describe("renderDocument (Markdown)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wraps the rendered Markdown in a .markdown-body element", () => {
    const doc = parse(renderDocument(md("# Hello"), "/docs"));
    const body = doc.querySelector(".markdown-body");
    expect(body).not.toBeNull();
    // The heading lives inside the wrapper.
    expect(body?.querySelector("h1")?.textContent).toBe("Hello");
  });

  it("renders a heading to <h1>", () => {
    const doc = parse(renderDocument(md("# Hello"), "/docs"));
    const h1 = doc.querySelector("h1");
    expect(h1?.textContent).toBe("Hello");
  });

  it("renders a GFM table to <table> with <th> and <td>", () => {
    const src = "| A | B |\n| - | - |\n| 1 | 2 |";
    const doc = parse(renderDocument(md(src), "/docs"));
    expect(doc.querySelector("table")).not.toBeNull();
    expect(doc.querySelector("th")?.textContent).toBe("A");
    expect(doc.querySelector("td")?.textContent).toBe("1");
  });

  it("renders a task list with checkbox inputs", () => {
    const src = "- [ ] todo\n- [x] done";
    const doc = parse(renderDocument(md(src), "/docs"));
    const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[1] as HTMLInputElement).hasAttribute("checked")).toBe(true);
  });

  it("renders a footnote reference and definition", () => {
    const src = "Text with a note.[^1]\n\n[^1]: the note";
    const doc = parse(renderDocument(md(src), "/docs"));
    expect(doc.querySelector("sup.footnote-ref")).not.toBeNull();
    expect(doc.querySelector(".footnotes")).not.toBeNull();
  });

  it("rewrites local image src via resolveImageSrc with baseDir", () => {
    const doc = parse(renderDocument(md("![alt](pic.png)"), "/docs"));
    const img = doc.querySelector("img");
    expect(img?.getAttribute("src")).toBe("RESOLVED(/docs|pic.png)");
    expect(img?.getAttribute("alt")).toBe("alt");
  });

  it("leaves remote image src unchanged through resolveImageSrc", () => {
    const doc = parse(renderDocument(md("![r](https://x.test/p.png)"), "/docs"));
    expect(doc.querySelector("img")?.getAttribute("src")).toBe("https://x.test/p.png");
  });
});

function txt(text: string): LoadedFile {
  return { path: "/docs/a.txt", text, encoding: "UTF-8", kind: "PlainText" };
}

describe("renderDocument (PlainText)", () => {
  it("wraps text in <pre class=plaintext>", () => {
    const doc = parse(renderDocument(txt("hello\nworld"), "/docs"));
    const pre = doc.querySelector("pre.plaintext");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe("hello\nworld");
  });

  it("escapes script tags so they are shown literally, not executed", () => {
    const html = renderDocument(txt("<script>alert(1)</script>"), "/docs");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    const doc = parse(html);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("pre.plaintext")?.textContent).toBe(
      "<script>alert(1)</script>",
    );
  });

  it("escapes ampersands and angle brackets", () => {
    const html = renderDocument(txt("a & b < c > d"), "/docs");
    expect(html).toContain("a &amp; b &lt; c &gt; d");
  });
});
