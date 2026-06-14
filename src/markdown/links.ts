import { convertFileSrc } from "@tauri-apps/api/core";

/** Classify a link href into how the app should handle it. */
export function classifyLink(href: string): "external" | "anchor" | "local-file" {
  if (href.startsWith("#")) return "anchor";
  if (/^https?:\/\//i.test(href) || href.startsWith("//") || href.startsWith("mailto:")) return "external";
  return "local-file";
}

/** Join baseDir and a relative path using baseDir's separator convention. */
function joinPath(baseDir: string, rel: string): string {
  const sep = baseDir.includes("\\") ? "\\" : "/";
  // Normalize the relative part's separators and drop a leading "./".
  let cleaned = rel.replace(/[\\/]+/g, sep);
  if (cleaned.startsWith(`.${sep}`)) cleaned = cleaned.slice(2);
  const base = baseDir.endsWith(sep) ? baseDir.slice(0, -1) : baseDir;
  return `${base}${sep}${cleaned}`;
}

/**
 * Resolve an <img> src for display.
 * - http(s):// and data: URLs are returned unchanged.
 * - Anything else is joined onto baseDir and wrapped with convertFileSrc,
 *   scoping local assets to the opened file's directory.
 */
export function resolveImageSrc(src: string, baseDir: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  return convertFileSrc(joinPath(baseDir, src));
}
