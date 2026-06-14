// src-tauri/src/watcher.rs
use crate::loader;
use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Instant;
use tauri::{AppHandle, Emitter};

/// modify イベントの多重発火を間引くための純粋なデバウンス判定。
/// `now` 呼び出し側から渡す u128 ミリ秒で、内部では時計を呼ばない。
/// これによりテストを決定的に書ける（契約: 静穏時間 150ms）。
struct Debouncer {
    quiet_ms: u128,
    last_emit_ms: Option<u128>,
}

impl Debouncer {
    fn new(quiet_ms: u128) -> Self {
        Self {
            quiet_ms,
            last_emit_ms: None,
        }
    }

    /// `now_ms` 時点でイベントを発火すべきかを判定する読み取り専用チェック（内部状態は変えない）。
    /// commit と分離することで、再読込が成功したときだけクロックを進められる。
    fn would_emit(&self, now_ms: u128) -> bool {
        match self.last_emit_ms {
            None => true,
            Some(last) => now_ms.saturating_sub(last) >= self.quiet_ms,
        }
    }

    /// 発火を確定し、直近の発火受理時刻を `now_ms` に進める。
    fn commit(&mut self, now_ms: u128) {
        self.last_emit_ms = Some(now_ms);
    }

    /// `now_ms` 時点でイベントを発火すべきなら true を返し、内部の発火時刻を更新する。
    /// 発火しない（合体する）場合は false を返し、last_emit は据え置く。
    fn should_emit(&mut self, now_ms: u128) -> bool {
        if self.would_emit(now_ms) {
            self.commit(now_ms);
            true
        } else {
            false
        }
    }
}

/// "file-removed" イベントのペイロード（契約: { path: String }）。
#[derive(Clone, Serialize)]
struct RemovedPayload {
    path: String,
}

/// 1 つのファイルを監視するハンドル。`RecommendedWatcher` を保持し続けることで
/// 監視を生かす（drop で監視停止）。
pub struct DocWatcher {
    _watcher: RecommendedWatcher,
}

/// `path` を監視し、デバウンス後に再読込して `window_label` 宛にイベントを emit する。
/// - modify: `loader::load_file` で再読込し "file-changed"（payload: LoadedFile）
/// - remove / rename: "file-removed"（payload: { path }）
pub fn watch_file(app: AppHandle, window_label: String, path: PathBuf) -> DocWatcher {
    // Instant 起点。コールバックでの経過ミリ秒を Debouncer に渡す（実時計を Debouncer に持ち込まない）。
    let started = Instant::now();
    // Debouncer は move-closure が単独所有するため Arc 不要。plain Mutex を直接 move する。
    let debouncer = Mutex::new(Debouncer::new(150));
    let cb_path = path.clone();

    let mut watcher: RecommendedWatcher =
        notify::recommended_watcher(move |res: notify::Result<Event>| {
            let event = match res {
                Ok(ev) => ev,
                Err(e) => {
                    eprintln!("penna: notify error for {}: {}", cb_path.display(), e);
                    return;
                }
            };

            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) => {
                    let now_ms = started.elapsed().as_millis();
                    // would_emit は読み取り専用。再読込が成功したときだけ commit してクロックを進める。
                    let would = {
                        // Debouncer の lock は短時間だけ保持する。
                        let d = match debouncer.lock() {
                            Ok(d) => d,
                            Err(e) => {
                                eprintln!(
                                    "penna: debouncer mutex poisoned for {}: {}",
                                    cb_path.display(),
                                    e
                                );
                                return;
                            }
                        };
                        d.would_emit(now_ms)
                    };
                    if !would {
                        return;
                    }
                    match loader::load_file(&cb_path) {
                        Ok(loaded) => {
                            // 再読込成功時のみ発火確定。これ以降の 150ms 内のイベントを合体させる。
                            match debouncer.lock() {
                                Ok(mut d) => d.commit(now_ms),
                                Err(e) => {
                                    eprintln!(
                                        "penna: debouncer mutex poisoned for {}: {}",
                                        cb_path.display(),
                                        e
                                    );
                                    return;
                                }
                            }
                            let _ = app.emit_to(&window_label, "file-changed", loaded);
                        }
                        // 読込失敗（保存途中の一時的な空ファイル等）は commit せず、次のイベントで即座に再評価する。
                        Err(_) => {}
                    }
                }
                EventKind::Remove(_) => {
                    let payload = RemovedPayload {
                        path: cb_path.to_string_lossy().to_string(),
                    };
                    let _ = app.emit_to(&window_label, "file-removed", payload);
                }
                _ => {}
            }
        })
        .expect("failed to create file watcher");

    // 単一ファイルなので NonRecursive。watch 失敗時もウォッチャ自体は返し、ログのみ残す。
    if let Err(e) = watcher.watch(&path, RecursiveMode::NonRecursive) {
        eprintln!("penna: failed to watch {}: {}", path.display(), e);
    }

    DocWatcher { _watcher: watcher }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn first_event_always_emits() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは必ず発火する");
    }

    #[test]
    fn events_within_quiet_window_coalesce() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは発火");
        // 50ms 後 (< 150ms) のイベントは合体して発火しない
        assert!(!d.should_emit(1_050), "150ms 未満の連続イベントは合体する");
    }

    #[test]
    fn events_after_quiet_window_both_fire() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "最初のイベントは発火");
        // 200ms 後 (>= 150ms) のイベントは静穏時間を満たすので発火
        assert!(d.should_emit(1_200), "150ms 以上空いたイベントは発火する");
    }

    #[test]
    fn suppressed_event_does_not_reset_last_emit() {
        let mut d = Debouncer::new(150);
        assert!(d.should_emit(1_000), "t=1000 発火");
        assert!(!d.should_emit(1_050), "t=1050 は合体（発火しない）");
        // 直近の発火受理は t=1000 のまま。t=1160 は 1000 から 160ms 経過し発火する
        assert!(
            d.should_emit(1_160),
            "抑制されたイベントは last_emit を進めない"
        );
    }
}
