mod commands;
mod loader;
mod settings;
mod watcher;
mod window;

use tauri::Manager;

use crate::window::WindowRegistry;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();
    // single-instance MUST be registered first; it is a desktop-only plugin
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
        // secondary launch routing is wired in the window/startup task
    }));
    builder
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(WindowRegistry::new());
            Ok(())
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
