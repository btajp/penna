mod commands;
mod loader;
mod settings;
mod watcher;
mod window;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri_plugin_dialog::DialogExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // single-instance MUST be registered first; it is a desktop-only plugin
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
        let cwd_path = std::path::PathBuf::from(&cwd);
        if let Err(e) = window::open_from_args(app, &argv, &cwd_path) {
            eprintln!("penna: failed to open window from second instance: {e}");
        }
    }));
    builder
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // WindowRegistry はグローバルシングルトン（window::reg()）なので manage 不要。
            // macOS の openURLs が setup より先に発火しても安全に使える。

            // CLI 直接起動（argv にファイル）があればここで開く。
            // Finder 起動（ダブルクリック / 関連付け）は argv に乗らず RunEvent::Opened で来るため、
            // 既定ウィンドウは RunEvent::Ready で「まだ何も開いていなければ」出す（二重ウィンドウ回避）。
            let args: Vec<String> = std::env::args().collect();
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            window::open_argv(&app.handle().clone(), &args, &cwd)
                .map_err(|e| -> Box<dyn std::error::Error> { e.into() })?;

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

            Ok(())
        })
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
        .invoke_handler(tauri::generate_handler![
            commands::load_file,
            commands::get_settings,
            commands::set_settings,
            commands::open_file_dialog,
            commands::open_external,
            commands::open_in_new_window,
            commands::window_path,
        ])
        .build(tauri::generate_context!())
        .expect("error while building penna")
        .run(|app, event| match event {
            // macOS: Finder のダブルクリック / 「このアプリで開く」/ 拡張子関連付けは
            // ファイルを argv ではなく Opened イベントで通知する。各ファイルを文書ウィンドウで開き、
            // 起動時に出した空ウィンドウが残っていれば閉じる。
            // macOS: Finder のダブルクリック / 「このアプリで開く」/ 拡張子関連付けは
            // ファイルを argv ではなく openURLs（RunEvent::Opened）で通知する。
            // openURLs デリゲートは extern "C" の中で、ここでウィンドウを作ると tao の
            // openURLs ハンドラ内で panic→abort する（特にコールド起動で発火が早いとき）。
            // よってここではパスをキューに積むだけにし、実際のオープンは
            // Ready / MainEventsCleared（安全なイベントループ点）で行う。
            #[cfg(target_os = "macos")]
            tauri::RunEvent::Opened { urls } => {
                let paths: Vec<std::path::PathBuf> =
                    urls.iter().filter_map(|u| u.to_file_path().ok()).collect();
                window::reg().queue_open(paths);
            }
            // 起動完了時: 保留中のファイルがあれば開く。1 つも開かれず（argv も保留も無し）
            // かつ未オープンなら既定ウィンドウ（session_restore=ON なら復元、既定 OFF は空）。
            tauri::RunEvent::Ready => {
                // 保留中（openURLs で届いた）ファイルがあれば開く。
                // 文書が 1 つも開かれなければ既定ウィンドウ（復元 or 空）を出す。
                if !window::drain_pending_opens(app) {
                    if let Err(e) = window::open_default(app) {
                        eprintln!("penna: failed to open default window: {e}");
                    }
                }
            }
            // イベントループの各周回で保留ファイルを処理する
            // （起動後＝ウォーム時のオープンや、Ready 後に届いた openURLs 用）。
            tauri::RunEvent::MainEventsCleared => {
                window::drain_pending_opens(app);
            }
            _ => {}
        });
}
