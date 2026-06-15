// src/ui/dropzone.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const invoke = vi.fn();
type DragCb = (e: { payload: unknown }) => void;
const onDragDropEvent = vi.fn(async (_cb: DragCb): Promise<() => void> => () => {});
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));
vi.mock("@tauri-apps/api/webviewWindow", () => ({
  getCurrentWebviewWindow: () => ({ onDragDropEvent }),
}));

import { extractDroppedPath, mountDropZone } from "./dropzone";

describe("extractDroppedPath", () => {
  it("returns the first path from a Tauri drag-drop payload", () => {
    expect(extractDroppedPath({ paths: ["/a/b/readme.md", "/a/b/x.md"] })).toBe("/a/b/readme.md");
  });

  it("returns null for an empty Tauri payload", () => {
    expect(extractDroppedPath({ paths: [] })).toBeNull();
  });

  it("reads .path from a DOM-dropped File when present", () => {
    const file = new File(["x"], "n.md");
    Object.defineProperty(file, "path", { value: "/dom/n.md" });
    const dt = { files: [file] } as unknown as DataTransfer;
    const ev = { dataTransfer: dt } as unknown as DragEvent;
    expect(extractDroppedPath(ev)).toBe("/dom/n.md");
  });

  it("returns null for a DragEvent without a usable path", () => {
    const ev = { dataTransfer: { files: [] } } as unknown as DragEvent;
    expect(extractDroppedPath(ev)).toBeNull();
  });
});

describe("mountDropZone", () => {
  let root: HTMLElement;
  beforeEach(() => {
    invoke.mockReset();
    onDragDropEvent.mockClear();
    root = document.createElement("div");
    document.body.appendChild(root);
  });

  it("calls onOpen with the dropped path via the Tauri drag-drop event", async () => {
    let handler: (e: { payload: { type: string; paths?: string[] } }) => void = () => {};
    onDragDropEvent.mockImplementation(async (cb) => {
      handler = cb as typeof handler;
      return () => {};
    });
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    handler({ payload: { type: "drop", paths: ["/dropped/file.md"] } });
    expect(onOpen).toHaveBeenCalledWith("/dropped/file.md");
  });

  it("opens the native dialog from the Open button and routes the path", async () => {
    invoke.mockResolvedValue("/picked/doc.md");
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    const btn = root.querySelector<HTMLButtonElement>('[data-action="open"]')!;
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(invoke).toHaveBeenCalledWith("open_file_dialog");
    expect(onOpen).toHaveBeenCalledWith("/picked/doc.md");
  });

  it("does not call onOpen when the dialog is cancelled (null)", async () => {
    invoke.mockResolvedValue(null);
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    const btn = root.querySelector<HTMLButtonElement>('[data-action="open"]')!;
    btn.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("ignores a DOM drop that follows a Tauri drop (no double open)", async () => {
    let handler: (e: { payload: { type: string; paths?: string[] } }) => void = () => {};
    onDragDropEvent.mockImplementation(async (cb) => {
      handler = cb as typeof handler;
      return () => {};
    });
    const onOpen = vi.fn();
    mountDropZone(root, onOpen);
    await Promise.resolve();

    // Tauri native drop fires first and handles the path.
    handler({ payload: { type: "drop", paths: ["/dropped/file.md"] } });

    // The same physical drop also surfaces a DOM 'drop' with File.path.
    const zone = root.querySelector<HTMLElement>(".drop-zone")!;
    const file = new File(["x"], "file.md");
    Object.defineProperty(file, "path", { value: "/dropped/file.md" });
    const ev = new Event("drop", { bubbles: true, cancelable: true });
    Object.defineProperty(ev, "dataTransfer", { value: { files: [file] } });
    zone.dispatchEvent(ev);

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledWith("/dropped/file.md");
  });
});
