import { classifyLink } from "../markdown/links";

interface ClickDeps {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
}

/** Join baseDir and a relative href using baseDir's separator convention. */
function resolveLocalPath(baseDir: string, rel: string): string {
  const sep = baseDir.includes("\\") ? "\\" : "/";
  let cleaned = rel.replace(/[\\/]+/g, sep);
  if (cleaned.startsWith(`.${sep}`)) cleaned = cleaned.slice(2);
  const base = baseDir.endsWith(sep) ? baseDir.slice(0, -1) : baseDir;
  return `${base}${sep}${cleaned}`;
}

/**
 * Delegated click handler for #content. Routes anchor clicks:
 * external => open_external, local-file => open_in_new_window, anchor => scroll.
 */
export function handleContentClick(
  event: MouseEvent,
  baseDir: string,
  deps: ClickDeps,
): void {
  const target = event.target as HTMLElement | null;
  const anchor = target?.closest?.("a") as HTMLAnchorElement | null;
  if (!anchor) return;
  const href = anchor.getAttribute("href");
  if (href === null) return;

  const kind = classifyLink(href);
  if (kind === "external") {
    event.preventDefault();
    void deps.invoke("open_external", { url: anchor.href });
    return;
  }
  if (kind === "local-file") {
    event.preventDefault();
    void deps.invoke("open_in_new_window", {
      path: resolveLocalPath(baseDir, href),
    });
    return;
  }
  // anchor
  event.preventDefault();
  const id = href.slice(1);
  const el = id ? document.getElementById(id) : null;
  el?.scrollIntoView();
}
