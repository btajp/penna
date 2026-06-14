/// <reference types="vitest/config" />
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST;

// @tauri-apps/cli が起動するため、Vite は固定設定で動かす
export default defineConfig({
  // Tauri が stdout を期待するためログをクリアしない
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // src-tauri の変更は Vite 側で監視しない（Rust 側が再ビルド）
      ignored: ["**/src-tauri/**"],
    },
  },
  // TAURI_ENV_* を尊重したビルドターゲット
  envPrefix: ["VITE_", "TAURI_ENV_"],
  build: {
    target:
      process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari13",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
  },
});
