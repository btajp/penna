// src/ui/settingsPanel.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const applyTheme = vi.fn();
const applyFont = vi.fn();
const setZoom = vi.fn();
vi.mock("./theme", () => ({
  applyTheme: (...a: unknown[]) => applyTheme(...a),
  applyFont: (...a: unknown[]) => applyFont(...a),
}));
vi.mock("./zoom", () => ({ setZoom: (...a: unknown[]) => setZoom(...a) }));

import { mountSettingsPanel } from "./settingsPanel";
import type { Settings } from "../types";

const baseSettings: Settings = {
  theme: "dark",
  sessionRestore: true,
  autoReload: false,
  fontFamily: "Inter",
  fontSize: 18,
  defaultEncoding: "Shift_JIS",
};

describe("mountSettingsPanel", () => {
  let root: HTMLElement;
  beforeEach(() => {
    applyTheme.mockClear();
    applyFont.mockClear();
    setZoom.mockClear();
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  it("reflects the given settings into the form controls", async () => {
    const get = vi.fn(async () => baseSettings);
    const set = vi.fn(async () => {});
    mountSettingsPanel(root, get, set);
    await Promise.resolve();
    await Promise.resolve();

    const theme = root.querySelector<HTMLSelectElement>('[data-field="theme"]')!;
    const sessionRestore = root.querySelector<HTMLInputElement>('[data-field="sessionRestore"]')!;
    const autoReload = root.querySelector<HTMLInputElement>('[data-field="autoReload"]')!;
    const fontFamily = root.querySelector<HTMLInputElement>('[data-field="fontFamily"]')!;
    const fontSize = root.querySelector<HTMLInputElement>('[data-field="fontSize"]')!;
    const enc = root.querySelector<HTMLSelectElement>('[data-field="defaultEncoding"]')!;

    expect(theme.value).toBe("dark");
    expect(sessionRestore.checked).toBe(true);
    expect(autoReload.checked).toBe(false);
    expect(fontFamily.value).toBe("Inter");
    expect(fontSize.value).toBe("18");
    expect(enc.value).toBe("Shift_JIS");
  });

  it("calls set() with the mutated object and applies theme/zoom live on change", async () => {
    const get = vi.fn(async () => baseSettings);
    const set = vi.fn(async () => {});
    mountSettingsPanel(root, get, set);
    await Promise.resolve();
    await Promise.resolve();

    const theme = root.querySelector<HTMLSelectElement>('[data-field="theme"]')!;
    theme.value = "light";
    theme.dispatchEvent(new Event("change"));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ theme: "light" }));
    expect(applyTheme).toHaveBeenCalledWith("light");

    const fontSize = root.querySelector<HTMLInputElement>('[data-field="fontSize"]')!;
    fontSize.value = "22";
    fontSize.dispatchEvent(new Event("change"));
    expect(set).toHaveBeenLastCalledWith(expect.objectContaining({ fontSize: 22 }));
    expect(setZoom).toHaveBeenCalledWith(22 / 16);

    const sessionRestore = root.querySelector<HTMLInputElement>('[data-field="sessionRestore"]')!;
    sessionRestore.checked = false;
    sessionRestore.dispatchEvent(new Event("change"));
    expect(set).toHaveBeenLastCalledWith(expect.objectContaining({ sessionRestore: false }));
  });
});
