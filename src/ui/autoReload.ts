// src/ui/autoReload.ts
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { LoadedFile } from "../types";

export async function wireAutoReload(
  getAutoReload: () => boolean,
  onReload: (file: LoadedFile) => void,
  onRemoved: (path: string) => void,
): Promise<UnlistenFn[]> {
  const unChanged = await listen<LoadedFile>("file-changed", (event) => {
    if (getAutoReload()) {
      onReload(event.payload);
    }
  });
  const unRemoved = await listen<{ path: string }>("file-removed", (event) => {
    onRemoved(event.payload.path);
  });
  return [unChanged, unRemoved];
}
