import assert from "node:assert/strict";
import {
  CANVAS_MAX_ZOOM,
  CANVAS_MIN_ZOOM,
  clampCanvasZoom,
  zoomNeedsPan,
} from "../src/zoomPolicy.ts";
assert.equal(CANVAS_MIN_ZOOM, 0.5);
assert.equal(CANVAS_MAX_ZOOM, 8);
assert.equal(clampCanvasZoom(0.1), 0.5);
assert.equal(clampCanvasZoom(4), 4);
assert.equal(clampCanvasZoom(12), 8);
assert.equal(zoomNeedsPan(1), false);
assert.equal(zoomNeedsPan(1.02), true);
console.log("canvas zoom policy verification passed");
