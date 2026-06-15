import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: (p: string) => `asset://localhost/${encodeURIComponent(p)}`,
}));

import { classifyLink, resolveImageSrc } from "./links";

describe("classifyLink", () => {
  it("classifies anchors", () => {
    expect(classifyLink("#section")).toBe("anchor");
  });
  it("classifies http/https as external", () => {
    expect(classifyLink("http://example.com")).toBe("external");
    expect(classifyLink("https://example.com/x")).toBe("external");
  });
  it("classifies protocol-relative // as external", () => {
    expect(classifyLink("//cdn.example.com/a.png")).toBe("external");
  });
  it("classifies relative paths as local-file", () => {
    expect(classifyLink("./other.md")).toBe("local-file");
    expect(classifyLink("../docs/x.md")).toBe("local-file");
    expect(classifyLink("notes.txt")).toBe("local-file");
  });
  it("classifies mailto: as external", () => {
    expect(classifyLink("mailto:a@b.com")).toBe("external");
  });
});

describe("resolveImageSrc", () => {
  it("leaves http/https/data URLs unchanged", () => {
    expect(resolveImageSrc("https://e.com/a.png", "/base")).toBe(
      "https://e.com/a.png",
    );
    expect(resolveImageSrc("http://e.com/a.png", "/base")).toBe(
      "http://e.com/a.png",
    );
    expect(resolveImageSrc("data:image/png;base64,AAAA", "/base")).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("joins baseDir and relative src then wraps with convertFileSrc (posix)", () => {
    const out = resolveImageSrc("img/a.png", "/home/u/docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("/home/u/docs/img/a.png")}`,
    );
  });

  it("strips a leading ./ before joining", () => {
    const out = resolveImageSrc("./a.png", "/home/u/docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("/home/u/docs/a.png")}`,
    );
  });

  it("joins using a windows-style baseDir separator", () => {
    const out = resolveImageSrc("img\\a.png", "C:\\docs");
    expect(out).toBe(
      `asset://localhost/${encodeURIComponent("C:\\docs\\img\\a.png")}`,
    );
  });
});
