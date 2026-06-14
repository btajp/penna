import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import type { LoadedFile, Settings } from "./types";
import { renderDocument } from "./markdown/renderer";
import { highlightAll } from "./markdown/highlight";
import { handleContentClick } from "./ui/contentClick";
import { FindBar } from "./ui/find";
import { applyFont, applyTheme } from "./ui/theme";
import { resetZoom, setZoom, zoomIn, zoomOut } from "./ui/zoom";
import { mountSettingsPanel } from "./ui/settingsPanel";
import { mountDropZone } from "./ui/dropzone";
import { wireAutoReload } from "./ui/autoReload";
import "./styles/theme.css";
import "./styles/markdown.css";

const BASE_FONT_SIZE = 16;

/** ファイルパス → 親ディレクトリ（POSIX `/` と Windows `\` の両対応）。 */
export function dirnameOf(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return lastSlash >= 0 ? path.slice(0, lastSlash) : "";
}

/**
 * Show the detected encoding in the status bar (spec §7). Exported so the
 * render wiring's encoding-display contract is unit-testable; pass "" to clear.
 */
export function setEncoding(text: string): void {
  const el = document.getElementById("encoding");
  if (el) {
    el.textContent = text;
  }
}

/** FindBar とキーバインド（検索＋ズーム）を 1 つの keydown リスナーに集約する。 */
function wireKeyboard(findBar: FindBar): void {
  window.addEventListener("keydown", (event) => {
    const accel = event.metaKey || event.ctrlKey;
    if (accel && event.key.toLowerCase() === "f") {
      event.preventDefault();
      findBar.open();
      return;
    }
    if (event.key === "Escape") {
      findBar.close();
      return;
    }
    if (!accel) {
      return;
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomIn();
    } else if (event.key === "-") {
      event.preventDefault();
      zoomOut();
    } else if (event.key === "0") {
      event.preventDefault();
      resetZoom();
    }
  });

  const input = document.querySelector<HTMLInputElement>("#findbar-input");
  input?.addEventListener("input", () => {
    findBar.search(input.value);
  });
  input?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        findBar.prev();
      } else {
        findBar.next();
      }
    }
  });
}

async function bootstrap(): Promise<void> {
  const contentEl = document.querySelector<HTMLElement>("#content")!;
  const settingsEl = document.querySelector<HTMLElement>("#settings")!;

  let settings = await invoke<Settings>("get_settings");
  applyTheme(settings.theme);
  applyFont(settings.fontFamily);
  setZoom(settings.fontSize / BASE_FONT_SIZE);

  const getSettings = async (): Promise<Settings> => settings;
  const setSettings = async (s: Settings): Promise<void> => {
    settings = s;
    await invoke("set_settings", { settings: s });
  };
  mountSettingsPanel(settingsEl, getSettings, setSettings);

  const findBar = new FindBar(document.body);
  wireKeyboard(findBar);

  const webview = getCurrentWebviewWindow();
  void webview.label;
  const path = await invoke<string | null>("window_path");

  if (path) {
    const baseDir = dirnameOf(path);

    function render(file: LoadedFile): void {
      contentEl.innerHTML = renderDocument(file, dirnameOf(file.path));
      void highlightAll(contentEl);
      setEncoding(file.encoding);
    }

    const file = await invoke<LoadedFile>("load_file", { path });
    render(file);

    contentEl.addEventListener("click", (event) =>
      handleContentClick(event, baseDir, { invoke }),
    );

    await wireAutoReload(
      () => settings.autoReload,
      (updated) => {
        const scrollTop = document.documentElement.scrollTop;
        render(updated);
        document.documentElement.scrollTop = scrollTop;
      },
      (removed) => {
        const banner = document.createElement("div");
        banner.className = "doc-banner";
        banner.textContent = `File no longer available: ${removed}`;
        contentEl.prepend(banner);
      },
    );
  } else {
    setEncoding("");
    mountDropZone(contentEl, (p) => {
      void invoke("open_in_new_window", { path: p });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
