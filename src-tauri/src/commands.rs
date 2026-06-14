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
    let allowed =
        url.starts_with("http://") || url.starts_with("https://") || url.starts_with("mailto:");
    if !allowed {
        return Err(format!("refused to open non-external URL: {url}"));
    }
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
