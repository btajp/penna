use encoding_rs::Encoding;
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

/// パスを読み込み、エンコーディングを自動判定して UTF-8 文字列に変換した LoadedFile を返す。
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
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

    #[test]
    fn load_file_decodes_shift_jis() {
        // "日本語" を Shift_JIS でエンコードしたバイト列。
        // 日=0x93FA, 本=0x967B, 語=0x8CEA
        let nihongo: [u8; 6] = [0x93, 0xFA, 0x96, 0x7B, 0x8C, 0xEA];
        // 句読点 "。" (Shift_JIS 0x81,0x42) を挟みつつ判定が安定する長さまで繰り返す。
        let kuten: [u8; 2] = [0x81, 0x42];
        let mut bytes: Vec<u8> = Vec::new();
        for _ in 0..16 {
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
}
