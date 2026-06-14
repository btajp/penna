import { describe, it, expect, vi } from "vitest";
import { handleContentClick } from "./contentClick";

function clickOn(anchor: HTMLAnchorElement) {
  const root = document.createElement("div");
  root.appendChild(anchor);
  document.body.appendChild(root);
  const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
  Object.defineProperty(ev, "target", { value: anchor });
  return ev;
}

describe("handleContentClick", () => {
  it("opens external links via open_external and prevents default", () => {
    const a = document.createElement("a");
    a.href = "https://example.com/";
    const invoke = vi.fn().mockResolvedValue(undefined);
    const ev = clickOn(a);
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).toHaveBeenCalledWith("open_external", {
      url: "https://example.com/",
    });
    expect(ev.defaultPrevented).toBe(true);
  });

  it("opens local files in a new window with the joined path", () => {
    const a = document.createElement("a");
    a.setAttribute("href", "other.md");
    const invoke = vi.fn().mockResolvedValue("doc-2");
    const ev = clickOn(a);
    handleContentClick(ev, "/home/u/docs", { invoke });
    expect(invoke).toHaveBeenCalledWith("open_in_new_window", {
      path: "/home/u/docs/other.md",
    });
    expect(ev.defaultPrevented).toBe(true);
  });

  it("scrolls anchors into view without invoking commands", () => {
    const target = document.createElement("h2");
    target.id = "sec";
    document.body.appendChild(target);
    const scroll = vi.fn();
    target.scrollIntoView = scroll;
    const a = document.createElement("a");
    a.setAttribute("href", "#sec");
    const invoke = vi.fn();
    const ev = clickOn(a);
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).not.toHaveBeenCalled();
    expect(scroll).toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(true);
  });

  it("ignores clicks that are not on an anchor", () => {
    const span = document.createElement("span");
    const root = document.createElement("div");
    root.appendChild(span);
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "target", { value: span });
    const invoke = vi.fn();
    handleContentClick(ev, "/base", { invoke });
    expect(invoke).not.toHaveBeenCalled();
    expect(ev.defaultPrevented).toBe(false);
  });
});
