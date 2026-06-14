mod loader;
mod settings;
mod watcher;

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
            // open an empty window on first launch (replaced by startup/CLI task)
            let _ = tauri::WebviewWindowBuilder::new(
                app,
                "doc-1",
                tauri::WebviewUrl::App("index.html".into()),
            )
            .title("penna")
            .inner_size(900.0, 700.0)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
