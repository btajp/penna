import DOMPurify from "dompurify";

/**
 * Sanitize rendered HTML before injecting into the document.
 * - Forbids <script>/<style> and all inline on* event handlers.
 * - Allows standard markdown tags, a[target,rel], img[src,alt,title],
 *   code/pre[class], and disabled task-list checkboxes.
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    ADD_TAGS: ["input"],
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}
