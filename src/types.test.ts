import { describe, it, expect } from "vitest";
import type { FileKind, LoadedFile, Settings } from "./types";

describe("types contract", () => {
  it("constructs a LoadedFile with the pinned field shape", () => {
    const kind: FileKind = "Markdown";
    const file: LoadedFile = {
      path: "/tmp/a.md",
      text: "# hi",
      encoding: "UTF-8",
      kind,
    };
    expect(file.kind).toBe("Markdown");
    expect(file.path).toBe("/tmp/a.md");
  });

  it("constructs a PlainText LoadedFile", () => {
    const file: LoadedFile = {
      path: "/tmp/a.txt",
      text: "plain",
      encoding: "Shift_JIS",
      kind: "PlainText",
    };
    expect(file.kind).toBe("PlainText");
  });

  it("constructs a Settings with the camelCase contract fields", () => {
    const s: Settings = {
      theme: "system",
      sessionRestore: false,
      autoReload: true,
      fontFamily: null,
      fontSize: 16,
      defaultEncoding: "UTF-8",
    };
    expect(s.fontSize).toBe(16);
    expect(s.fontFamily).toBeNull();
  });
});
