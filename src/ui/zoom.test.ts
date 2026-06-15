// src/ui/zoom.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetZoom, setZoom, zoomIn, zoomOut } from "./zoom";

const BASE_PX = 16;

beforeEach(() => {
  resetZoom();
});

afterEach(() => {
  document.documentElement.style.fontSize = "";
});

describe("setZoom", () => {
  it("scales root font-size from the 16px base", () => {
    setZoom(1.5);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 1.5}px`);
  });

  it("clamps below 0.5", () => {
    setZoom(0.1);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 0.5}px`);
  });

  it("clamps above 3", () => {
    setZoom(10);
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 3}px`);
  });
});

describe("zoomIn/zoomOut/resetZoom", () => {
  it("zoomIn increases by one step and stays clamped", () => {
    resetZoom();
    zoomIn();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 1.1}px`);
  });

  it("zoomOut decreases by one step", () => {
    resetZoom();
    zoomOut();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX * 0.9}px`);
  });

  it("resetZoom returns to 1.0", () => {
    setZoom(2);
    resetZoom();
    expect(document.documentElement.style.fontSize).toBe(`${BASE_PX}px`);
  });
});
