// src/ui/settingsPanel.ts
import type { Settings } from "../types";
import { applyFont, applyTheme } from "./theme";
import { setZoom } from "./zoom";

const BASE_FONT_SIZE = 16;
const THEMES: Array<Settings["theme"]> = ["system", "light", "dark"];
const ENCODINGS = ["UTF-8", "UTF-16LE", "UTF-16BE", "Shift_JIS", "EUC-JP"];

function makeSelect(field: keyof Settings, options: string[]): HTMLSelectElement {
  const el = document.createElement("select");
  el.dataset.field = String(field);
  for (const opt of options) {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    el.appendChild(o);
  }
  return el;
}

function makeRow(labelText: string, control: HTMLElement): HTMLElement {
  const row = document.createElement("label");
  row.className = "settings-row";
  const span = document.createElement("span");
  span.className = "settings-label";
  span.textContent = labelText;
  row.appendChild(span);
  row.appendChild(control);
  return row;
}

export function mountSettingsPanel(
  root: HTMLElement,
  get: () => Promise<Settings>,
  set: (s: Settings) => Promise<void>,
): void {
  const panel = document.createElement("form");
  panel.className = "settings-panel";

  const theme = makeSelect("theme", THEMES);
  const defaultEncoding = makeSelect("defaultEncoding", ENCODINGS);

  const sessionRestore = document.createElement("input");
  sessionRestore.type = "checkbox";
  sessionRestore.dataset.field = "sessionRestore";

  const autoReload = document.createElement("input");
  autoReload.type = "checkbox";
  autoReload.dataset.field = "autoReload";

  const fontFamily = document.createElement("input");
  fontFamily.type = "text";
  fontFamily.dataset.field = "fontFamily";
  fontFamily.placeholder = "(system default)";

  const fontSize = document.createElement("input");
  fontSize.type = "number";
  fontSize.min = "8";
  fontSize.max = "48";
  fontSize.dataset.field = "fontSize";

  panel.appendChild(makeRow("Theme", theme));
  panel.appendChild(makeRow("Restore session", sessionRestore));
  panel.appendChild(makeRow("Auto reload", autoReload));
  panel.appendChild(makeRow("Font family", fontFamily));
  panel.appendChild(makeRow("Font size (px)", fontSize));
  panel.appendChild(makeRow("Default encoding", defaultEncoding));
  panel.addEventListener("submit", (e) => e.preventDefault());
  root.appendChild(panel);

  function readForm(): Settings {
    const size = Number.parseInt(fontSize.value, 10);
    return {
      theme: theme.value as Settings["theme"],
      sessionRestore: sessionRestore.checked,
      autoReload: autoReload.checked,
      fontFamily: fontFamily.value.trim() === "" ? null : fontFamily.value,
      fontSize: Number.isFinite(size) ? size : BASE_FONT_SIZE,
      defaultEncoding: defaultEncoding.value,
    };
  }

  function onChange(): void {
    const next = readForm();
    applyTheme(next.theme);
    applyFont(next.fontFamily);
    setZoom(next.fontSize / BASE_FONT_SIZE);
    void set(next);
  }

  for (const el of [theme, sessionRestore, autoReload, fontFamily, fontSize, defaultEncoding]) {
    el.addEventListener("change", onChange);
  }

  void get()
    .then((s) => {
      theme.value = s.theme;
      sessionRestore.checked = s.sessionRestore;
      autoReload.checked = s.autoReload;
      fontFamily.value = s.fontFamily ?? "";
      fontSize.value = String(s.fontSize);
      defaultEncoding.value = s.defaultEncoding;
    })
    .catch(() => {});
}
