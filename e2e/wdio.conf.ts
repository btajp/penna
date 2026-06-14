// e2e/wdio.conf.ts
// OPTIONAL stretch (v0.1 では CI 必須ではない / 手動スモークが必須)。
// 実行には tauri-driver と各 OS の WebDriver（macOS は未対応のため Linux/Windows のみ）が必要。
// Run (stretch): npx tauri build --debug && npx tauri-driver & npx wdio run e2e/wdio.conf.ts
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

let tauriDriver: ChildProcess | undefined;

const appBinary = path.resolve(
  __dirname,
  "..",
  "src-tauri",
  "target",
  "debug",
  process.platform === "win32" ? "penna.exe" : "penna",
);

export const config: WebdriverIO.Config = {
  runner: "local",
  specs: ["./specs/**/*.e2e.ts"],
  maxInstances: 1,
  capabilities: [
    {
      // tauri-driver が解釈する独自 capability。
      "tauri:options": { application: appBinary },
    } as WebdriverIO.Capabilities,
  ],
  logLevel: "info",
  framework: "mocha",
  mochaOpts: { ui: "bdd", timeout: 60000 },
  // tauri-driver をテスト前後に起動・停止する。
  onPrepare: () => {
    spawnSync("cargo", ["build"], { cwd: path.resolve(__dirname, "..", "src-tauri") });
  },
  beforeSession: () => {
    tauriDriver = spawn("tauri-driver", [], { stdio: [null, process.stdout, process.stderr] });
  },
  afterSession: () => {
    tauriDriver?.kill();
  },
};
