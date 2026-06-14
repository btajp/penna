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
