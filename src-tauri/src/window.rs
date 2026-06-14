use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use crate::watcher::{self, DocWatcher};
use tauri_plugin_store::StoreExt;

/// ウィンドウ label -> 開いているファイルパス の対応表。
/// label は "doc-1", "doc-2", ... と単調増加で採番する。
/// Tauri State として `app.manage` で共有する想定だが、
/// 採番・登録・参照ロジックは Tauri 非依存の純粋メソッドに切り出してテスト可能にする。
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

    /// ウィンドウに紐づく監視ハンドルを保持してドロップを防ぐ（監視を生かす）。
    fn keep_watcher(&self, label: &str, watcher: DocWatcher) {
        self.watchers
            .lock()
            .expect("window registry watchers mutex poisoned")
            .insert(label.to_string(), watcher);
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
        self.watchers
            .lock()
            .expect("window registry watchers mutex poisoned")
            .remove(label);
    }
}

impl Default for WindowRegistry {
    fn default() -> Self {
        Self::new()
    }
}

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
