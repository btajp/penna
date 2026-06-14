// src/ui/dropzone.ts
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"];

interface TauriDragPayload {
  paths?: string[];
}

function isTauriPayload(detail: TauriDragPayload | DragEvent): detail is TauriDragPayload {
  return Array.isArray((detail as TauriDragPayload).paths);
}

export function extractDroppedPath(detail: TauriDragPayload | DragEvent): string | null {
  if (isTauriPayload(detail)) {
    const paths = detail.paths ?? [];
    return paths.length > 0 ? paths[0] : null;
  }
  const file = detail.dataTransfer?.files?.[0] as (File & { path?: string }) | undefined;
  if (file && typeof file.path === "string" && file.path !== "") {
    return file.path;
  }
  return null;
}

export function mountDropZone(root: HTMLElement, onOpen: (path: string) => void): void {
  const zone = document.createElement("div");
  zone.className = "drop-zone";
  zone.dataset.state = "idle";

  const hint = document.createElement("p");
  hint.className = "drop-zone-hint";
  hint.textContent = "Drop a Markdown or text file here";

  const exts = document.createElement("p");
  exts.className = "drop-zone-exts";
  exts.textContent = MARKDOWN_EXTENSIONS.map((e) => `.${e}`).join(" ");

  const openBtn = document.createElement("button");
  openBtn.type = "button";
  openBtn.dataset.action = "open";
  openBtn.className = "drop-zone-open";
  openBtn.textContent = "Open…";

  zone.appendChild(hint);
  zone.appendChild(exts);
  zone.appendChild(openBtn);
  root.appendChild(zone);

  openBtn.addEventListener("click", () => {
    void invoke<string | null>("open_file_dialog").then((path) => {
      if (typeof path === "string" && path !== "") {
        onOpen(path);
      }
    });
  });

  // Tauri webview native drag-drop (provides absolute paths[]).
  const webview = getCurrentWebviewWindow();
  void webview.onDragDropEvent((event) => {
    const payload = event.payload as { type: string; paths?: string[] };
    if (payload.type === "drop") {
      const path = extractDroppedPath({ paths: payload.paths });
      zone.dataset.state = "idle";
      if (path) onOpen(path);
    } else if (payload.type === "enter" || payload.type === "over") {
      zone.dataset.state = "active";
    } else if (payload.type === "leave") {
      zone.dataset.state = "idle";
    }
  });

  // DOM fallback (e.g. tests / webviews surfacing File.path).
  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.dataset.state = "active";
  });
  zone.addEventListener("dragleave", () => {
    zone.dataset.state = "idle";
  });
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.dataset.state = "idle";
    const path = extractDroppedPath(e);
    if (path) onOpen(path);
  });
}
