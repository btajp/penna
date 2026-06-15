# penna — 軽量 Markdown/テキスト ビューワー 設計仕様

- 日付: 2026-06-14
- ステータス: 設計合意済み（実装計画はこの後に作成）
- 対象バージョン: v0.1（MVP）。それ以降は「将来ロードマップ」に記載。

## 1. 概要 / 立ち位置

penna は **プレーンテキストと Markdown を閲覧するための、軽量・シンプルなクロスプラットフォーム ビューワー**である。編集機能は持たない（ビューワーに振り切る）。OS 標準のプレビューア（macOS の「プレビュー」等）に近い感覚で、ファイルを「素早く開いて、きれいに読む」ことだけに集中する。

最優先の非機能要件は **起動と動作の軽さ** である。設計判断は常にこの軸で評価する。

### コアバリュー
- Markdown を美しく・正確に描画する（ビューワーの本質的価値）。
- 起動が速く、メモリ消費が小さい。
- ファイルを開く導線が自然（ダブルクリック / CLI / ドラッグ&ドロップ）。

## 2. ゴール / 非ゴール

### ゴール（v0.1）
- 単一ファイルを開いて即レンダリング表示する「クイックプレビュー」。
- Finder/Explorer からのダブルクリック起動（拡張子関連付け）。
- CLI からの起動（`penna README.md` でウィンドウが開く）。
- ウィンドウへのドラッグ&ドロップで開く。
- Markdown（標準: CommonMark + GFM + コードハイライト）とプレーンテキストの描画。
- 日本語を含む文字エンコーディングの自動判定。

### 非ゴール（v0.1、明示的に対象外）
- **編集機能**（保存・書き込みは一切行わない。読み取り専用）。
- **ターミナル内レンダリング（TUI）**。GUI ウィンドウ専念。
- **タブ機能**および Chrome 風のタブ引き剥がし/合体（窓モデルは「1 ファイル＝1 ウィンドウ」に確定。ブレインストーミング中に一度タブ案が出たが取り下げ）。
- 数式（KaTeX）・mermaid 図（tier-2、将来）。
- アウトライン/目次サイドバー（将来）。
- PDF/HTML エクスポート、ソース表示トグル、最近開いたファイル（将来）。
- 自動更新（将来）。

## 3. 対象プラットフォーム

| OS | アーキテクチャ | 備考 |
|----|----------------|------|
| Linux | x86_64 / ARM64 | WebKitGTK 使用 |
| Windows | x86_64 / ARM64 | WebView2 使用 |
| macOS | ARM64（Apple Silicon）のみ | Intel Mac はサポート外 |

## 4. 技術スタック

- **フレームワーク**: Tauri v2（Rust バックエンド + OS 標準 WebView）。
  - WebView: Windows=WebView2 / macOS=WKWebView / Linux=WebKitGTK。
  - 採用理由: 小バイナリ・省メモリで「軽量・シンプル」に最も合致し、Markdown 描画で Web エコシステムを最大活用でき、ARM 含む全対象 OS の対応が良好。
- **フロントエンド**: バニラ TypeScript + Vite。
  - UI が「本文ビュー＋検索バー＋設定パネル」と小さいため、フレームワーク無しが最も軽量・単純。
  - 代替候補: Svelte 5（コンポーネント志向だがランタイムほぼ無し）。将来 UI が複雑化した場合の移行先。
- **Markdown 解析**: markdown-it。
  - CommonMark + GFM（表・タスクリスト・打消し線・自動リンク）+ 脚注。
  - 採用理由: 将来 tier-2（KaTeX/mermaid プラグイン）を足しやすい。代替候補は軽量な `marked`。
- **コードハイライト**: highlight.js（遅延ロード。コードブロックがある時だけ読み込む）。
- **HTML サニタイズ**: DOMPurify（必須）。
- **エンコーディング**: Rust 側で `chardetng`（判定）+ `encoding_rs`（UTF-8 化）。
- **ファイル監視**: Rust 側で `notify` クレート。
- **設定永続化**: `tauri-plugin-store`（OS 設定ディレクトリに JSON）。
- **単一インスタンス**: `tauri-plugin-single-instance`。
- **外部リンク起動**: `tauri-plugin-opener`。

## 5. ウィンドウ / ドキュメントモデル

- **1 ファイル＝1 独立ウィンドウ**。タブは持たない。
- ファイルを開くたびに新規ウィンドウが 1 枚開く。ウィンドウを閉じればその文書を閉じる。
- 各ウィンドウは「開いているファイルパス・スクロール位置・ズーム倍率」をフロント側のローカル状態として保持する。共有状態はアプリ設定のみで、これは Rust 側が集中管理する。

### セッション復元
- **既定 OFF**。起動時に前回のウィンドウを復元しない。
- 設定で「前回のセッションを復元する」を ON にできる。
- ファイル指定なしで起動した場合: まっさらな空ウィンドウを 1 枚表示し、ファイルを開く導線（ドロップゾーン＋「開く」ボタン）を出す。前回状態は開かない。

### 起動中に新規ファイルを開いたとき
- 常に**新規ウィンドウ**で開く（タブが無いので分岐なし）。
- 起動中インスタンスが無ければ、新規ウィンドウを作って開く。
- 単一インスタンス方式: `penna file.md` や Finder 起動が複数回走っても 1 プロセスに集約し、その都度ウィンドウを生成する。

## 6. ファイルを開く経路

1. **CLI 引数**: `penna path/to/file.md`。起動時引数および二次起動引数（単一インスタンス経由）を Rust 側で受け取りウィンドウ化。
2. **Finder/Explorer ダブルクリック**: 拡張子関連付け経由。
3. **ドラッグ&ドロップ**: 開いているウィンドウへファイルをドロップ → 新規ウィンドウで開く。
4. **メニュー**: File > Open（OS ネイティブのファイルダイアログ）。

### 拡張子関連付け
- `tauri.conf.json` の `fileAssociations` で宣言する（macOS=Info.plist の CFBundleDocumentTypes、Windows=インストーラのレジストリ、Linux=`.desktop` の MimeType）。
- 既定で関連付ける拡張子（Markdown）: `.md`, `.markdown`, `.mdown`, `.mkd`, `.mkdn`, `.mdwn`。
- **`.txt` の関連付けは任意（インストール時オプトイン）**。全テキストファイルの既定アプリを奪わないため、既定では関連付けない。

### ファイル種別判定
- 拡張子で判定する。Markdown 拡張子（上記）→ Markdown 描画、それ以外 → プレーンテキスト描画。
- v0.1 では「Markdown/テキストとして開き直す」手動オーバーライドは持たない（将来検討）。

## 7. 描画範囲

### Markdown（tier-1、MVP）
- CommonMark
- GFM: 表、タスクリスト、打消し線、自動リンク
- コードブロックのシンタックスハイライト（highlight.js、遅延ロード）
- 画像（ローカル相対パス / リモート）
- 脚注

数式（KaTeX）・mermaid 図は **tier-1 では描画しない**（コード片等として素のまま表示）。描画パイプラインは tier-2 をプラグインとして遅延ロードで足せるよう分離設計する。

### プレーンテキスト
- 等幅フォントで表示、ソフトラップ（既定 ON）、空白・改行を保持。

### 文字エンコーディング
- UTF-8 を既定とし、自動判定で UTF-16（BOM）/ Shift-JIS / EUC-JP に対応（日本語の旧 `.txt` 対策）。
- 判定結果はウィンドウ内に表示する。
- 設定で「既定エンコーディング」を指定可能。手動の再オープン指定は将来検討。

## 8. アーキテクチャ

### 8.1 セキュリティ境界
フロントエンド（webview）は生の `fs` に直接触れない。ファイル読み込みは必ず Rust のコマンド経由で行う。任意のローカル/リモート Markdown を webview で描画するため、生 HTML 由来の XSS・情報漏えいを **DOMPurify で必ず遮断**する。

### 8.2 Rust バックエンドのモジュール（独立・テスト可能）
- **Loader**: パス → バイト読込 → エンコーディング自動判定 → UTF-8 化 → `{ text, encoding, kind }` を返す。
- **Watcher**: 開いているファイルを `notify` で監視。デバウンス（保存時の多重書き込み対策、目安 100–200ms）後に再読込し、該当ウィンドウへ `file-changed` イベントを送る。ファイル削除/リネームはバナー表示で graceful に扱う。
- **Settings**: `tauri-plugin-store` で設定を永続化（theme / sessionRestore / autoReload / font / defaultEncoding）。
- **Window manager**: ファイル → 新規ウィンドウ生成、起動引数および二次起動引数の振り分け。
- **公開コマンド**: `load_file(path)`, `get_settings`, `set_settings`, `open_file_dialog`, `open_external(url)`。

### 8.3 フロントエンドの描画パイプライン（独立・テスト可能）
- **Renderer**: `{ text, kind }` → Markdown の場合は markdown-it で HTML 化、プレーンテキストの場合はエスケープして `<pre>` 化。純関数として単体テスト可能に保つ。
- **Highlighter**: コード → ハイライト済み HTML。遅延ロードモジュール。
- **Sanitizer**: DOMPurify で描画 HTML を無害化。
- **Link/Asset resolver**:
  - 外部リンク（http/https）は `tauri-plugin-opener` で OS 既定ブラウザを開く（webview は遷移させない）。
  - ローカル相対リンク（`.md` 等）は新規 penna ウィンドウで開く。
  - アンカーリンクは文書内スクロール。
  - ローカル画像は Tauri asset protocol（`convertFileSrc`）を **開いたファイルのディレクトリにスコープ**して表示。
  - リモート画像は許可（将来「リモート画像をブロック」設定を追加可能）。
- **Find**: Cmd/Ctrl+F の自前検索バー（DOM テキスト走査＋ハイライト＋前後移動）。webview ネイティブ find はクロスプラットフォームで挙動が不安定なため自前実装。CSS Custom Highlight API が利用可能なら使い、不可なら span 包みにフォールバックする。
- **Theme/Zoom**: CSS 変数。OS テーマ（`prefers-color-scheme` / Tauri theme）追従＋手動上書き（設定保存）。ズームはルート font-size スケール（Cmd +/-/0）。

### 8.4 モジュール境界の原則
各ユニットは「何をするか・どう使うか・何に依存するか」を単独で説明できる粒度に保つ。Loader / Watcher / Settings / Renderer / Find はそれぞれ独立してテストできること。

## 9. 機能セット（v0.1 MVP）

**入れる**
- Markdown 描画（tier-1）/ プレーンテキスト描画
- 文字エンコーディング自動判定（UTF-8 / UTF-16 / Shift-JIS / EUC-JP）
- テーマ: OS 追従（ライト/ダーク）＋手動トグル
- ドキュメント内検索（Cmd/Ctrl+F）
- フォント拡大縮小（Cmd +/-/0）
- 外部変更の自動リロード（別エディタ保存→即反映。トグル、既定 ON）
- 設定画面（テーマ / セッション復元 / 自動リロード / フォント / 既定エンコーディング）

**入れない（将来ロードマップ参照）**
- アウトライン/目次、数式・mermaid（tier-2）、PDF/HTML エクスポート、ソース表示トグル、最近開いたファイル、リモート画像ブロック、自動更新。

## 10. 設定項目

| キー | 内容 | 既定値 |
|------|------|--------|
| `theme` | `system` / `light` / `dark` | `system` |
| `sessionRestore` | 起動時に前回ウィンドウを復元するか | `false` |
| `autoReload` | 外部変更を自動リロードするか | `true` |
| `fontFamily` | 本文フォント | OS 既定 |
| `fontSize` | 基準フォントサイズ（px） | `16` |
| `defaultEncoding` | 自動判定に失敗した場合の既定 | `UTF-8` |

## 11. 配布

- **ビルド**: GitHub Actions のマトリクスビルドで各 OS インストーラを生成。
  - macOS: `.dmg` / `.app`（ARM64）
  - Windows: `.msi` または NSIS（x86_64 / ARM64）
  - Linux: `.AppImage` ＋ `.deb`（x86_64 / ARM64）
- **配布チャネル**: GitHub Releases。
- **コード署名**:
  - **macOS のみ署名・公証**（確定）。Apple Developer Program（$99/年）で Developer ID 署名＋notarization。CI に署名証明書・App Store Connect API キー（または app-specific password）をシークレットとして設定。
  - Windows / Linux は v0.1 では未署名（Windows は SmartScreen 警告、初回起動手順を Release ノートに記載）。
- **自動更新**: v0.1 では見送り（手動ダウンロード）。
- **パッケージマネージャ**（brew cask / winget / AUR・Flatpak）: 将来。

## 12. テスト方針

- **Rust 単体**: エンコーディング判定、ファイル種別判定、設定 I/O、Watcher デバウンス。
- **フロント単体（Vitest）**: Markdown→サニタイズ済み HTML、リンク/画像変換、検索ロジック。
- **セキュリティ**: XSS ペイロードが DOMPurify で無害化されること、ローカル画像のスコープ外アクセスが遮断されること。
- **E2E（`tauri-driver` + WebdriverIO）**: 「開く→描画」「テーマ切替」「検索」のスモーク。**v0.1 では任意（ストレッチ）**とし、単体＋手動スモークを必須とする。

## 13. リポジトリ構成（想定）

```
penna/
├── src-tauri/            # Rust バックエンド
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs   # load_file / settings / dialog / open_external
│   │   ├── loader.rs     # 読込 + エンコーディング判定 + 種別判定
│   │   ├── watcher.rs    # notify + デバウンス
│   │   ├── settings.rs   # 設定の読み書き
│   │   └── window.rs     # ウィンドウ生成 / 引数振り分け
│   ├── icons/
│   ├── Cargo.toml
│   └── tauri.conf.json   # fileAssociations 等
├── src/                  # フロントエンド（バニラ TS + Vite）
│   ├── main.ts
│   ├── markdown/         # renderer / sanitize / highlight(遅延)
│   ├── ui/               # viewport / find bar / settings panel / drop zone
│   └── styles/           # theme 変数 / 本文スタイル
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .github/workflows/    # ビルド/署名/リリース マトリクス
└── docs/superpowers/specs/
```

## 14. リスク / 留意点

- **Linux の WebKitGTK 描画差**: ディストロ間で WebKitGTK のバージョン差により描画・依存に差が出ることがある。テキスト/Markdown 中心なので影響は限定的だが、要動作確認。
- **Windows ARM の WebView2**: Windows 11 ARM では標準で存在するが、対象環境で要確認。
- **CSS Custom Highlight API のサポート差**: 各 WebView 実装でサポート状況が異なるため、span 包みフォールバックを用意する。
- **asset protocol のスコープ運用**: 開いたファイルのディレクトリにスコープを動的設定する実装が必要。スコープ外アクセスを許さないこと。
- **macOS 公証の CI 化**: 証明書・API キーのシークレット管理、`hardened runtime`、entitlements の設定が必要。
- **Tauri の E2E（tauri-driver）**: セットアップが重く、MVP では任意とする。
- **エンコーディング判定の限界**: 自動判定は確率的で誤判定があり得る。`defaultEncoding` 設定でフォールバックを用意する。

## 15. 将来ロードマップ（v0.1 以降）

- tier-2 描画: KaTeX 数式、mermaid 図（遅延ロードのプラグインとして追加。素の文書の起動速度は維持）。
- アウトライン/目次サイドバー（見出しから生成、トグル）。
- PDF/HTML エクスポート、印刷の作り込み。
- ソース（生テキスト）表示トグル。
- 最近開いたファイル。
- リモート画像ブロック設定。
- 自動更新（Tauri updater）。
- パッケージマネージャ配布（brew cask / winget / AUR・Flatpak）。
- Windows コード署名。
- E2E テストの常時化。
