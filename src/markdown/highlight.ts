interface HljsModule {
  default: { highlightElement: (el: HTMLElement) => void };
}

type HljsImporter = () => Promise<HljsModule>;

const defaultImporter: HljsImporter = () =>
  import("highlight.js") as unknown as Promise<HljsModule>;

/**
 * Test seam: highlight all `pre code` blocks under root using the given importer.
 * Returns immediately (without calling the importer) when there are none,
 * to keep startup light for documents with no code.
 */
export async function highlightAllWith(
  root: HTMLElement,
  importer: HljsImporter,
): Promise<void> {
  const blocks = root.querySelectorAll<HTMLElement>("pre code");
  if (blocks.length === 0) return;
  let hljs: HljsModule["default"];
  try {
    hljs = (await importer()).default;
  } catch {
    // highlight.js failed to load — skip silently, leave code unhighlighted.
    return;
  }
  blocks.forEach((block) => {
    try {
      hljs.highlightElement(block);
    } catch {
      // A single malformed block must not abort highlighting the rest.
    }
  });
}

/**
 * Public contract: highlight all `pre code` blocks under root, lazy-loading
 * highlight.js only when code blocks exist. Delegates to highlightAllWith.
 */
export function highlightAll(root: HTMLElement): Promise<void> {
  return highlightAllWith(root, defaultImporter);
}
