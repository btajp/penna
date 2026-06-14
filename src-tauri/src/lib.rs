#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance MUST be registered first
        .plugin(tauri_plugin_single_instance::init(|_app, _argv, _cwd| {
            // secondary launch routing is wired in the window/startup task
        }))
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
            .visible(false)
            .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
