import { describe, it, expect } from "vitest";
import { dirnameOf } from "./main";

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
