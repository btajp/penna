import { describe, it, expect } from "vitest";
import { sanitize } from "./sanitize";

describe("sanitize", () => {
  it("strips <script> tags entirely", () => {
    const out = sanitize('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain("<p>hi</p>");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("removes inline event handlers like onerror", () => {
    const out = sanitize('<img src="x" onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("drops javascript: hrefs", () => {
    const out = sanitize('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("strips <style> blocks", () => {
    const out = sanitize('<style>body{display:none}</style><p>ok</p>');
    expect(out.toLowerCase()).not.toContain("<style");
    expect(out).toContain("<p>ok</p>");
  });

  it("keeps standard markdown formatting", () => {
    const html =
      '<h1>T</h1><p><strong>b</strong> <em>i</em> <del>s</del> ' +
      '<a href="https://example.com">l</a></p>' +
      '<ul><li>x</li></ul><pre><code class="language-js">1</code></pre>' +
      '<table><thead><tr><th>h</th></tr></thead>' +
      '<tbody><tr><td>d</td></tr></tbody></table>';
    const out = sanitize(html);
    expect(out).toContain("<h1>T</h1>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<em>i</em>");
    expect(out).toContain("<del>s</del>");
    expect(out).toContain("<table>");
    expect(out).toContain('<code class="language-js">');
  });

  it("preserves anchor target/rel attributes", () => {
    const out = sanitize(
      '<a href="https://example.com" target="_blank" rel="noopener">x</a>',
    );
    expect(out).toContain('target="_blank"');
    // Hook 3 forces rel="noopener noreferrer" on target=_blank anchors.
    expect(out).toContain("noopener");
  });

  it("preserves disabled task-list checkboxes", () => {
    const out = sanitize('<input type="checkbox" disabled checked>');
    expect(out.toLowerCase()).toContain('type="checkbox"');
    expect(out.toLowerCase()).toContain("disabled");
  });

  // --- Security tests: each asserts a real gap closed by the deny-by-default allowlist + hooks. ---

  it("strips <form> and <button> entirely", () => {
    const out = sanitize(
      '<form action="https://evil.com"><button>go</button></form>',
    );
    expect(out.toLowerCase()).not.toContain("<form");
    expect(out.toLowerCase()).not.toContain("<button");
  });

  it("drops style attributes carrying javascript: payloads", () => {
    const out = sanitize('<p style="background:url(javascript:alert(1))">x</p>');
    expect(out.toLowerCase()).not.toContain("style=");
    expect(out.toLowerCase()).not.toContain("javascript:");
    expect(out).toContain("x");
  });

  it("keeps safe text-align style on table cells (GFM alignment)", () => {
    const out = sanitize(
      '<table><tbody><tr><td style="text-align:center">x</td></tr></tbody></table>',
    );
    expect(out).toContain("text-align:center");
  });

  it("removes non-checkbox <input> (e.g. type=image pixel tracker)", () => {
    const out = sanitize('<input type="image" src="https://evil.com/pixel">');
    expect(out.toLowerCase()).not.toContain("<input");
    expect(out.toLowerCase()).not.toContain('type="image"');
    expect(out.toLowerCase()).not.toContain("evil.com");
  });

  it("still keeps disabled checkbox inputs after restricting input", () => {
    const out = sanitize('<input type="checkbox" disabled checked>');
    expect(out.toLowerCase()).toContain('type="checkbox"');
  });

  it("strips <svg> and its children", () => {
    const out = sanitize("<svg><circle/></svg>");
    expect(out.toLowerCase()).not.toContain("<svg");
    expect(out.toLowerCase()).not.toContain("<circle");
  });

  it("strips <math> elements", () => {
    const out = sanitize("<math><mi>x</mi></math>");
    expect(out.toLowerCase()).not.toContain("<math");
  });

  it("enforces rel=noopener noreferrer on target=_blank anchors", () => {
    const out = sanitize('<a href="https://e.com" target="_blank">x</a>');
    const doc = new DOMParser().parseFromString(out, "text/html");
    const rel = doc.querySelector("a")?.getAttribute("rel") ?? "";
    const tokens = new Set(rel.split(/\s+/).filter(Boolean));
    expect(tokens.has("noopener")).toBe(true);
    expect(tokens.has("noreferrer")).toBe(true);
  });
});
