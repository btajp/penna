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
