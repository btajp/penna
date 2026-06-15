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

  it("hides windows until the frontend is ready", () => {
    const win = conf.app.windows[0];
    expect(win.visible).toBe(false);
    expect(win.width).toBe(900);
    expect(win.height).toBe(700);
  });
});
