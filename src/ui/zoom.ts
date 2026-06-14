// src/ui/zoom.ts
const BASE_FONT_PX = 16;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.1;

let currentZoom = 1;

function clamp(level: number): number {
  if (level < MIN_ZOOM) {
    return MIN_ZOOM;
  }
  if (level > MAX_ZOOM) {
    return MAX_ZOOM;
  }
  return level;
}

export function setZoom(level: number): void {
  currentZoom = clamp(level);
  document.documentElement.style.fontSize = `${BASE_FONT_PX * currentZoom}px`;
}

export function zoomIn(): void {
  setZoom(currentZoom + STEP);
}

export function zoomOut(): void {
  setZoom(currentZoom - STEP);
}

export function resetZoom(): void {
  setZoom(1);
}
