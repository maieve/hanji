import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
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
const [wrapper,bridge,native]=await Promise.all([
  readFile(new URL('../src/components/ZoomablePage.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/DocumentCanvas.tsx',import.meta.url),'utf8'),
  readFile(new URL('../modules/hanji-canvas/ios/HanjiDocumentModule.swift',import.meta.url),'utf8'),
]);
assert.match(wrapper,/ZoomAutoAdvanceContext[\s\S]*zoomScale=\{zoomWindowEnabled\?2\.5:undefined\}/,'zoom window must scale the wrapper containing every page layer');
assert.match(wrapper,/const autoAdvance=[\s\S]*scroll\.current\?\.scrollTo/,'auto-advance must pan the shared page wrapper');
assert.match(bridge,/event\.maxX[\s\S]*autoAdvance\?\.\(event\.maxX,event\.maxY\)/,'native stroke bounds must drive wrapper auto-advance');
const nativeZoom=native.match(/func setZoomWindow[\s\S]*?\n  \}/)?.[0]??'';
assert.match(nativeZoom,/maximumZoomScale = 1[\s\S]*setZoomScale\(1/,'native canvas must stay at 1x to avoid diverging from paper, PDF, and elements');
assert.doesNotMatch(native,/private func autoAdvance/,'auto-advance must not pan only the native ink layer');
console.log("canvas zoom policy verification passed");
