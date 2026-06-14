export function dirnameOf(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return lastSlash >= 0 ? path.slice(0, lastSlash) : "";
}

import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";

async function bootstrap(): Promise<void> {
  // このウィンドウのラベルを参照できることを確認する（後続タスクで file-changed 等の
  // 購読に使う）。本タスクではログのみ。
  const webview = getCurrentWebviewWindow();
  void webview.label;

  // window_path でこのウィンドウに紐づくパスを問い合わせ、有無で分岐する。
  // 実際の描画 / ドロップゾーン配線は Task 9 以降で足し、Task 15 Step 12 で統合する。
  const path = await invoke<string | null>("window_path");
  if (path) {
    const baseDir = dirnameOf(path);
    console.log(`penna: opening ${path} (baseDir=${baseDir})`);
  } else {
    console.log("penna: no file — drop zone will be mounted in a later task");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  void bootstrap();
});
