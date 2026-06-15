// src/ui/theme.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyFont, applyTheme, resolveTheme } from "./theme";

function mockMatchMedia(prefersDark: boolean): void {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("dark") ? prefersDark : !prefersDark,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.removeProperty("--app-font");
});

describe("resolveTheme", () => {
  it("returns the explicit value for light and dark", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
  });

  it("follows matchMedia when system prefers dark", () => {
    mockMatchMedia(true);
    expect(resolveTheme("system")).toBe("dark");
  });

  it("follows matchMedia when system prefers light", () => {
    mockMatchMedia(false);
    expect(resolveTheme("system")).toBe("light");
  });
});

describe("applyTheme", () => {
  it("sets data-theme on <html> to the resolved value", () => {
    mockMatchMedia(true);
    applyTheme("system");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    applyTheme("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("subscribes to OS changes only when theme is system", () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("matchMedia", () => ({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addEventListener,
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    applyTheme("system");
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));

    addEventListener.mockClear();
    applyTheme("dark");
    expect(addEventListener).not.toHaveBeenCalled();
  });
});

describe("applyFont", () => {
  it("sets --app-font on <html> when a family is given", () => {
    applyFont("Inter");
    expect(document.documentElement.style.getPropertyValue("--app-font")).toBe("Inter");
  });

  it("clears --app-font when family is null", () => {
    applyFont("Inter");
    applyFont(null);
    expect(document.documentElement.style.getPropertyValue("--app-font")).toBe("");
  });
});
