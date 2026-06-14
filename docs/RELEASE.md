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
