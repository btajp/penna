import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const cap = JSON.parse(
  readFileSync(
    resolve(__dirname, "../src-tauri/capabilities/default.json"),
    "utf-8",
  ),
);

// In Tauri v2, the asset protocol is enabled via tauri.conf.json
// (app.security.assetProtocol.enable = true) + the protocol-asset Cargo feature.
// There is no "core:asset-protocol:*" capability permission in Tauri v2's ACL.
const conf = JSON.parse(
  readFileSync(
    resolve(__dirname, "../src-tauri/tauri.conf.json"),
    "utf-8",
  ),
);

describe("default capability", () => {
  const perms: string[] = cap.permissions.map((p: unknown) =>
    typeof p === "string" ? p : (p as { identifier: string }).identifier,
  );

  it("targets all windows", () => {
    expect(cap.windows).toEqual(["*"]);
  });

  it("grants core window control", () => {
    expect(perms).toContain("core:window:default");
    expect(perms).toContain("core:window:allow-show");
  });

  it("grants store, opener and dialog defaults", () => {
    expect(perms).toContain("store:default");
    expect(perms).toContain("opener:default");
    expect(perms).toContain("dialog:default");
  });

  it("grants scoped asset protocol access via tauri.conf.json", () => {
    // Tauri v2 asset protocol is enabled in tauri.conf.json, not via capability permissions.
    // The protocol-asset Cargo feature + assetProtocol.enable covers this.
    expect(conf.app.security.assetProtocol.enable).toBe(true);
  });
});
