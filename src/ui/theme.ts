// src/ui/theme.ts
export type Theme = "system" | "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

let mediaQuery: MediaQueryList | null = null;
let mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

export function resolveTheme(t: Theme): "light" | "dark" {
  if (t === "light" || t === "dark") {
    return t;
  }
  if (typeof matchMedia === "function" && matchMedia(DARK_QUERY).matches) {
    return "dark";
  }
  return "light";
}

export function applyTheme(t: Theme): void {
  document.documentElement.setAttribute("data-theme", resolveTheme(t));
  detachMediaListener();
  if (t === "system" && typeof matchMedia === "function") {
    mediaQuery = matchMedia(DARK_QUERY);
    mediaListener = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme("system"));
    };
    mediaQuery.addEventListener("change", mediaListener);
  }
}

/**
 * Apply the body font-family by setting/clearing the --app-font CSS variable
 * on <html>. The body CSS uses `font-family: var(--app-font, <default stack>)`,
 * so clearing the variable falls back to the default stack.
 */
export function applyFont(family: string | null): void {
  const el = document.documentElement;
  if (family) {
    el.style.setProperty("--app-font", family);
  } else {
    el.style.removeProperty("--app-font");
  }
}

function detachMediaListener(): void {
  if (mediaQuery && mediaListener) {
    mediaQuery.removeEventListener("change", mediaListener);
  }
  mediaQuery = null;
  mediaListener = null;
}
