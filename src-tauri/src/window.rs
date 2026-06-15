use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{Mutex, OnceLock};

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
    /// 起動時に文書ウィンドウを開いたか（argv / RunEvent::Opened 経由）。
    opened: AtomicBool,
    /// 起動時に出した空ウィンドウの label（直後に文書が開いたら閉じるため）。
    launch_empty: Mutex<Option<String>>,
    /// RunEvent::Opened（macOS の openURLs）で受け取ったが未処理のファイルパス。
    /// openURLs デリゲート内ではウィンドウを作らず、ここに積むだけにして
    /// Ready / MainEventsCleared など安全なイベントループ点で開く。
    pending: Mutex<Vec<PathBuf>>,
}

impl WindowRegistry {
    pub fn new() -> Self {
        Self {
            counter: AtomicUsize::new(0),
            paths: Mutex::new(HashMap::new()),
            watchers: Mutex::new(HashMap::new()),
            opened: AtomicBool::new(false),
            launch_empty: Mutex::new(None),
            pending: Mutex::new(Vec::new()),
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

    /// 起動時に文書ウィンドウを開いたことを記録する（argv / Opened 経由）。
    pub fn mark_opened(&self) {
        self.opened.store(true, Ordering::SeqCst);
    }

    /// 起動時に文書を開いたか。Ready 時に既定ウィンドウを出すか判断する。
    pub fn has_opened(&self) -> bool {
        self.opened.load(Ordering::SeqCst)
    }

    /// 起動時に出した空ウィンドウの label を覚える。
    pub fn set_launch_empty(&self, label: String) {
        *self
            .launch_empty
            .lock()
            .expect("launch_empty mutex poisoned") = Some(label);
    }

    /// 覚えておいた空ウィンドウ label を取り出してクリアする。
    pub fn take_launch_empty(&self) -> Option<String> {
        self.launch_empty
            .lock()
            .expect("launch_empty mutex poisoned")
            .take()
    }

    /// openURLs で受け取ったファイルパスを保留キューに積む（ウィンドウは作らない）。
    pub fn queue_open(&self, paths: Vec<PathBuf>) {
        self.pending
            .lock()
            .expect("pending mutex poisoned")
            .extend(paths);
    }

    /// 保留キューを取り出してクリアする（安全なイベントループ点で開くため）。
    pub fn drain_pending(&self) -> Vec<PathBuf> {
        std::mem::take(&mut *self.pending.lock().expect("pending mutex poisoned"))
    }
}

impl Default for WindowRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// プロセスグローバルの WindowRegistry シングルトン。
/// Tauri の managed state（`app.manage`）にすると、macOS の openURLs（Finder オープン /
/// 自動再オープン）が setup() の manage より先に発火したとき `app.state()` が
/// "state() called before manage()" で panic→abort する。グローバルにすることで
/// manage タイミングに依存せず、最初の Opened イベントから安全に使える。
static REGISTRY: OnceLock<WindowRegistry> = OnceLock::new();

/// グローバル WindowRegistry を取得する（初回アクセスで初期化）。
pub fn reg() -> &'static WindowRegistry {
    REGISTRY.get_or_init(WindowRegistry::new)
}

/// 指定ファイルを新規ウィンドウで開く。
/// label を採番し index.html を読み込むウィンドウを生成、label->path を登録、監視を開始する。
/// ウィンドウクローズ時に label を登録解除してセッションを再永続化する。
/// 戻り値は生成したウィンドウの label。
pub fn open_document(app: &tauri::AppHandle, path: PathBuf) -> Result<String, String> {
    let registry = reg();
    let label = registry.next_label();

    let window = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("penna")
        .inner_size(900.0, 700.0)
        .min_inner_size(360.0, 240.0)
        .build()
        .map_err(|e| format!("failed to build window: {e}"))?;

    registry.register(&label, path.clone());
    registry.mark_opened();

    // 開いたファイルの親ディレクトリを asset プロトコルスコープに再帰許可する。
    // これにより document からの相対パス画像を asset: / convertFileSrc で配信できる。
    // スコープ許可に失敗しても open は失敗させず、ログのみ残す（画像は出ないが本文は表示される）。
    if let Some(parent) = path.parent() {
        if let Err(e) = app.asset_protocol_scope().allow_directory(parent, true) {
            eprintln!(
                "penna: failed to allow asset scope for {}: {}",
                parent.display(),
                e
            );
        }
    }

    let watcher = watcher::watch_file(app.clone(), label.clone(), path);
    registry.keep_watcher(&label, watcher);

    // ウィンドウが閉じられたら登録を外し、セッション（sessionPaths）を再永続化する。
    let close_app = app.clone();
    let close_label = label.clone();
    window.on_window_event(move |event| {
        if matches!(event, tauri::WindowEvent::Destroyed) {
            let registry = reg();
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
    let registry = reg();
    let label = registry.next_label();

    WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("penna")
        .inner_size(900.0, 700.0)
        .min_inner_size(360.0, 240.0)
        .build()
        .map_err(|e| format!("failed to build window: {e}"))?;

    Ok(label)
}

/// 現在登録済みのファイルパス集合を settings.json ストアの "sessionPaths" に書き出す。
/// session_restore が ON のとき、次回起動でこの集合を開き直す。
pub fn persist_session(app: &tauri::AppHandle) {
    let registry = reg();
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

/// 起動引数列からファイルパスを 1 つ取り出す純関数。
/// - 先頭要素（プログラム名）は読み飛ばす。
/// - `-` で始まるフラグ、および空文字列は無視する。
/// - 最初に見つかった非フラグのトークンをパスとして採用する。
/// - 絶対パスはそのまま、相対パスは cwd に結合する。
/// - 該当が無ければ None。
pub fn parse_file_arg(args: &[String], cwd: &Path) -> Option<PathBuf> {
    args.iter()
        .skip(1)
        .find(|a| !a.is_empty() && !a.starts_with('-'))
        .map(|a| {
            let p = PathBuf::from(a);
            if p.is_absolute() {
                p
            } else {
                cwd.join(p)
            }
        })
}

/// 二次起動（single-instance）の引数とカレントディレクトリから、適切なウィンドウを開く。
/// パスが取れれば open_document、取れなければ open_empty_window を呼ぶ。
/// 二次起動はセッション復元の対象外（常にその起動の指示だけを反映する）。
pub fn open_from_args(app: &tauri::AppHandle, args: &[String], cwd: &Path) -> Result<String, String> {
    match parse_file_arg(args, cwd) {
        Some(path) => open_document(app, path),
        None => open_empty_window(app),
    }
}

/// 初回起動の argv 振り分け。ファイル引数があればそれを開く（CLI 直接起動）。
/// macOS の Finder 起動（ダブルクリック / 「このアプリで開く」/ 拡張子関連付け）は
/// ファイルを argv で渡さず RunEvent::Opened で通知するため、ここでは何もしない。
/// 文書を開いたら Ok(true)、引数にファイルが無ければ Ok(false)。
pub fn open_argv(app: &tauri::AppHandle, args: &[String], cwd: &Path) -> Result<bool, String> {
    if let Some(path) = parse_file_arg(args, cwd) {
        open_document(app, path)?;
        Ok(true)
    } else {
        Ok(false)
    }
}

/// 文書を 1 つも開かなかったときの既定ウィンドウ（spec §5、Ready 時に呼ぶ）。
/// - session_restore=ON かつ sessionPaths が空でない: それらを開き直す。
/// - それ以外（既定 OFF / 復元なし）: 空ウィンドウを 1 枚開き、その label を
///   launch_empty として記録する（直後に Opened で文書が開いたら閉じるため）。
pub fn open_default(app: &tauri::AppHandle) -> Result<(), String> {
    let settings = crate::settings::load_settings(app);
    if settings.session_restore() {
        let restored: Vec<String> = match app.store("settings.json") {
            Ok(store) => store
                .get("sessionPaths")
                .and_then(|v| serde_json::from_value(v).ok())
                .unwrap_or_default(),
            Err(_) => Vec::new(),
        };
        if !restored.is_empty() {
            for p in restored {
                open_document(app, PathBuf::from(p))?;
            }
            return Ok(());
        }
    }

    let label = open_empty_window(app)?;
    reg().set_launch_empty(label);
    Ok(())
}

/// 起動時に出した空ウィンドウが残っていれば閉じる。
/// macOS で Finder 起動の文書を開いた直後に呼び、空ウィンドウと文書ウィンドウが
/// 二重に出るのを防ぐ（Ready が Opened より先に走った場合の保険）。
pub fn close_launch_empty(app: &tauri::AppHandle) {
    if let Some(label) = reg().take_launch_empty() {
        if let Some(win) = app.get_webview_window(&label) {
            let _ = win.close();
        }
    }
}

/// 保留キュー（openURLs で受け取ったファイル）を安全なイベントループ点で開く。
/// 1 件以上開いたら true。開いた場合は起動時の空ウィンドウを閉じる。
/// openURLs デリゲートの中ではなく Ready / MainEventsCleared から呼ぶこと。
pub fn drain_pending_opens(app: &tauri::AppHandle) -> bool {
    let pending = reg().drain_pending();
    if !pending.is_empty() {
        // 既に開いているファイルと、同一バッチ内の重複を除外する。
        // macOS の自動再オープンが同じ書類を多重に送ってきても 1 枚だけ開くため。
        let already: HashSet<PathBuf> = reg().snapshot().into_iter().collect();
        let mut seen: HashSet<PathBuf> = HashSet::new();
        for path in pending {
            if already.contains(&path) || !seen.insert(path.clone()) {
                continue;
            }
            if let Err(e) = open_document(app, path) {
                eprintln!("penna: failed to open queued file: {e}");
            }
        }
        close_launch_empty(app);
    }
    // 処理後に文書ウィンドウが 1 つ以上開いているか（Ready で既定ウィンドウを出すか判断）。
    reg().has_opened()
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
    fn mark_and_has_opened() {
        let reg = WindowRegistry::new();
        assert!(!reg.has_opened());
        reg.mark_opened();
        assert!(reg.has_opened());
    }

    #[test]
    fn launch_empty_set_take_and_clear() {
        let reg = WindowRegistry::new();
        assert_eq!(reg.take_launch_empty(), None);
        reg.set_launch_empty("doc-3".into());
        assert_eq!(reg.take_launch_empty(), Some("doc-3".to_string()));
        // 取り出したらクリアされる。
        assert_eq!(reg.take_launch_empty(), None);
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

    #[test]
    fn parse_file_arg_empty_string_is_none() {
        let args = vec!["penna".to_string(), "".to_string()];
        let cwd = Path::new("/work");
        assert_eq!(parse_file_arg(&args, cwd), None);
    }

    #[test]
    fn parse_file_arg_bare_dash_is_none() {
        let args = vec!["penna".to_string(), "-".to_string()];
        let cwd = Path::new("/work");
        assert_eq!(parse_file_arg(&args, cwd), None);
    }
}
