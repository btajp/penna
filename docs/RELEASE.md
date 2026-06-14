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
