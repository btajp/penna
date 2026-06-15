use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_store::StoreExt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    System,
    Light,
    Dark,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    theme: Theme,
    session_restore: bool,
    auto_reload: bool,
    font_family: Option<String>,
    font_size: u32,
    default_encoding: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            session_restore: false,
            auto_reload: true,
            font_family: None,
            font_size: 16,
            default_encoding: "UTF-8".to_string(),
        }
    }
}

impl Settings {
    /// セッション復元が ON か（spec §5、起動振り分けで参照する。既定 false）。
    pub fn session_restore(&self) -> bool {
        self.session_restore
    }
}

const STORE_FILE: &str = "settings.json";
const STORE_KEY: &str = "settings";

pub fn load_settings(app: &AppHandle) -> Settings {
    let store = match app.store(STORE_FILE) {
        Ok(store) => store,
        Err(_) => return Settings::default(),
    };

    match store.get(STORE_KEY) {
        Some(value) => serde_json::from_value(value).unwrap_or_default(),
        None => Settings::default(),
    }
}

pub fn save_settings(app: &AppHandle, s: &Settings) -> Result<(), String> {
    let store = app.store(STORE_FILE).map_err(|e| e.to_string())?;
    let value = serde_json::to_value(s).map_err(|e| e.to_string())?;
    store.set(STORE_KEY, value);
    store.save().map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_match_contract() {
        let s = Settings::default();
        assert!(matches!(s.theme, Theme::System));
        assert_eq!(s.session_restore, false);
        assert_eq!(s.auto_reload, true);
        assert_eq!(s.font_family, None);
        assert_eq!(s.font_size, 16);
        assert_eq!(s.default_encoding, "UTF-8");
    }

    #[test]
    fn serializes_to_camel_case_keys() {
        let s = Settings::default();
        let v = serde_json::to_value(&s).expect("serialize");
        let obj = v.as_object().expect("object");

        // camelCase キーが存在する
        assert!(obj.contains_key("sessionRestore"));
        assert!(obj.contains_key("autoReload"));
        assert!(obj.contains_key("fontFamily"));
        assert!(obj.contains_key("fontSize"));
        assert!(obj.contains_key("defaultEncoding"));
        assert!(obj.contains_key("theme"));

        // snake_case キーは存在しない（rename が効いている確認）
        assert!(!obj.contains_key("session_restore"));
        assert!(!obj.contains_key("default_encoding"));

        // 値の確認
        assert_eq!(v["theme"], serde_json::json!("system"));
        assert_eq!(v["fontSize"], serde_json::json!(16));
        assert_eq!(v["defaultEncoding"], serde_json::json!("UTF-8"));
        assert_eq!(v["fontFamily"], serde_json::Value::Null);
    }

    #[test]
    fn deserializes_from_camel_case_json() {
        let json = serde_json::json!({
            "theme": "dark",
            "sessionRestore": true,
            "autoReload": false,
            "fontFamily": "JetBrains Mono",
            "fontSize": 18,
            "defaultEncoding": "Shift_JIS"
        });

        let s: Settings = serde_json::from_value(json).expect("deserialize");
        assert!(matches!(s.theme, Theme::Dark));
        assert_eq!(s.session_restore, true);
        assert_eq!(s.auto_reload, false);
        assert_eq!(s.font_family, Some("JetBrains Mono".to_string()));
        assert_eq!(s.font_size, 18);
        assert_eq!(s.default_encoding, "Shift_JIS");
    }
}
