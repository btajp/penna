// src/ui/autoReload.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

type Handler = (e: { payload: unknown }) => void;
const handlers = new Map<string, Handler>();
const listen = vi.fn(async (name: string, cb: Handler) => {
  handlers.set(name, cb);
  return () => handlers.delete(name);
});
vi.mock("@tauri-apps/api/event", () => ({ listen: (...a: unknown[]) => (listen as any)(...a) }));

import { wireAutoReload } from "./autoReload";
import type { LoadedFile } from "../types";

const sample: LoadedFile = {
  path: "/x/readme.md",
  text: "# hi",
  encoding: "UTF-8",
  kind: "Markdown",
};

describe("wireAutoReload", () => {
  beforeEach(() => {
    handlers.clear();
    listen.mockClear();
  });

  it("calls onReload on file-changed when autoReload is true", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => true, onReload, onRemoved);
    handlers.get("file-changed")!({ payload: sample });
    expect(onReload).toHaveBeenCalledWith(sample);
  });

  it("skips onReload on file-changed when autoReload is false", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => false, onReload, onRemoved);
    handlers.get("file-changed")!({ payload: sample });
    expect(onReload).not.toHaveBeenCalled();
  });

  it("always calls onRemoved on file-removed", async () => {
    const onReload = vi.fn();
    const onRemoved = vi.fn();
    await wireAutoReload(() => false, onReload, onRemoved);
    handlers.get("file-removed")!({ payload: { path: "/x/readme.md" } });
    expect(onRemoved).toHaveBeenCalledWith("/x/readme.md");
  });
});
