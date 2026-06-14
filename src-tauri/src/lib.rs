mod commands;
mod loader;
mod settings;
mod watcher;
mod window;

use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

use crate::window::WindowRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let cwd_path = std::path::PathBuf::from(&cwd);
            if let Err(e) = window::open_from_args(app, &argv, &cwd_path) {
                eprintln!("failed to open window from second instance: {e}");
            }
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(WindowRegistry::new());

            let args: Vec<String> = std::env::args().collect();
            let cwd = std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            window::open_first_launch(&app.handle().clone(), &args, &cwd)
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
        .run(tauri::generate_context!())
        .expect("error while running penna");
}
