export const CANVAS_MIN_ZOOM = 0.5;
export const CANVAS_MAX_ZOOM = 8;
export const zoomNeedsPan = (scale: number) => scale > 1.01;
export const clampCanvasZoom = (scale: number) =>
  Math.max(CANVAS_MIN_ZOOM, Math.min(CANVAS_MAX_ZOOM, scale));
