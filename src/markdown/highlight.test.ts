import { describe, it, expect, vi } from "vitest";
import { highlightAllWith } from "./highlight";

function makeImporter() {
  const highlightElement = vi.fn((el: HTMLElement) => {
    el.classList.add("hljs");
  });
  const importer = vi.fn(async () => ({
    default: { highlightElement },
  }));
  return { importer, highlightElement };
}

describe("highlightAllWith", () => {
  it("does NOT import highlight.js when there are no code blocks", async () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>no code here</p>";
    const { importer } = makeImporter();
    await highlightAllWith(root, importer);
    expect(importer).not.toHaveBeenCalled();
  });

  it("imports once and highlights each pre>code element", async () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<pre><code class="language-js">1</code></pre>' +
      '<pre><code class="language-ts">2</code></pre>';
    const { importer, highlightElement } = makeImporter();
    await highlightAllWith(root, importer);
    expect(importer).toHaveBeenCalledTimes(1);
    expect(highlightElement).toHaveBeenCalledTimes(2);
    const blocks = root.querySelectorAll("pre code");
    blocks.forEach((b) => expect(b.classList.contains("hljs")).toBe(true));
  });
});
