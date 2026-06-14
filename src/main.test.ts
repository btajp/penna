import { describe, it, expect, beforeEach } from "vitest";
import { dirnameOf, setEncoding } from "./main";
import type { LoadedFile } from "./types";

describe("dirnameOf", () => {
  it("returns the POSIX parent directory", () => {
    expect(dirnameOf("/home/user/docs/readme.md")).toBe("/home/user/docs");
  });

  it("returns the Windows parent directory", () => {
    expect(dirnameOf("C:\\Users\\me\\notes\\a.md")).toBe("C:\\Users\\me\\notes");
  });

  it("returns empty string when there is no separator", () => {
    expect(dirnameOf("a.md")).toBe("");
  });

  it("handles a mixed-separator path by cutting at the last separator", () => {
    expect(dirnameOf("/home/user\\b.md")).toBe("/home/user");
  });
});

describe("setEncoding", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<main id="content"></main><footer id="statusbar"><span id="encoding"></span></footer>';
  });

  it("shows the detected encoding from a LoadedFile in #encoding", () => {
    const file: LoadedFile = {
      path: "/docs/legacy.txt",
      text: "本文",
      encoding: "Shift_JIS",
      kind: "PlainText",
    };
    setEncoding(file.encoding);
    expect(document.getElementById("encoding")?.textContent).toBe("Shift_JIS");
  });

  it("clears #encoding when given an empty string (no file)", () => {
    setEncoding("Shift_JIS");
    setEncoding("");
    expect(document.getElementById("encoding")?.textContent).toBe("");
  });
});
