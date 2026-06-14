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
    expect(out).toContain('rel="noopener"');
  });

  it("preserves disabled task-list checkboxes", () => {
    const out = sanitize('<input type="checkbox" disabled checked>');
    expect(out.toLowerCase()).toContain('type="checkbox"');
    expect(out.toLowerCase()).toContain("disabled");
  });
});
