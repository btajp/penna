import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const conf = JSON.parse(
  readFileSync(
    resolve(__dirname, "../src-tauri/tauri.conf.json"),
    "utf-8",
  ),
);

const MARKDOWN_EXTENSIONS = ["md", "markdown", "mdown", "mkd", "mkdn", "mdwn"];

describe("tauri.conf.json file associations", () => {
  it("registers exactly the markdown extensions", () => {
    const assoc = conf.bundle.fileAssociations;
    expect(Array.isArray(assoc)).toBe(true);
    const exts: string[] = assoc.flatMap((a: { ext: string[] }) => a.ext);
    expect([...exts].sort()).toEqual([...MARKDOWN_EXTENSIONS].sort());
  });

  it("does NOT register the .txt extension by default", () => {
    const assoc = conf.bundle.fileAssociations;
    const exts: string[] = assoc.flatMap((a: { ext: string[] }) => a.ext);
    expect(exts).not.toContain("txt");
  });

  it("uses the Viewer role and Markdown Document name", () => {
    const assoc = conf.bundle.fileAssociations[0];
    expect(assoc.role).toBe("Viewer");
    expect(assoc.name).toBe("Markdown Document");
  });

  it("defines NO static windows (created programmatically by the window manager)", () => {
    // A static config window with label "doc-1" is auto-created by Tauri at startup and
    // collides with the window manager's first programmatic window (also "doc-1"),
    // causing a "webview with label `doc-1` already exists" panic on launch. All windows
    // must be created programmatically (open_document / open_empty_window), with their
    // size set on the WebviewWindowBuilder, so app.windows must be empty.
    expect(Array.isArray(conf.app.windows)).toBe(true);
    expect(conf.app.windows).toHaveLength(0);
  });
});
