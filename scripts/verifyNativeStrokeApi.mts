import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const [native, bridge, types] = await Promise.all([
  read("../modules/hanji-canvas/ios/HanjiDocumentModule.swift"),
  read("../src/components/DocumentCanvas.tsx"),
  read("../src/types.ts"),
]);

assert.match(native, /AsyncFunction\("getStrokes"\)[\s\S]*AsyncFunction\("replaceStrokes"\)[\s\S]*AsyncFunction\("hitTest"\)/, "native view must expose the three stroke APIs");
assert.match(native,/AsyncFunction\("getDrawingData"\)[\s\S]*AsyncFunction\("loadDrawingData"\)[\s\S]*AsyncFunction\("renderImage"\)/,"native view must expose drawing blob and raster APIs");
assert.match(native, /func serializedStrokes\(\)[\s\S]*force[\s\S]*azimuth[\s\S]*altitude/, "stroke export must retain Pencil dynamics");
assert.match(native, /func replaceStrokes[\s\S]*registerTransformUndo[\s\S]*emitDrawingChange/, "stroke replacement must be undoable and persisted");
assert.match(native, /func hitTestStroke[\s\S]*renderBounds[\s\S]*strokeIdentifier/, "hit testing must use stroke geometry and return a stable identifier");
const identifier=native.match(/private func strokeIdentifier[\s\S]*?return String\(format: "%016llx", hash\)[\s\S]*?\n  \}/)?.[0]??"";
assert.doesNotMatch(identifier,/location\.|ink\.color|size\.|azimuth|altitude/,"stroke IDs must survive movement, resize, rotation, and recoloring");
assert.match(native,/action == "paste"[\s\S]*creationDate: copiedAt\.addingTimeInterval[\s\S]*action == "duplicate"[\s\S]*creationDate: copiedAt\.addingTimeInterval/,"pasted and duplicated strokes must receive distinct identities");
assert.match(native,/func loadDrawing[\s\S]*else \{ return false \}[\s\S]*func renderDrawingImage[\s\S]*drawing\.image\(from: rect, scale: scale\)\.pngData/,"invalid blobs must be rejected and rendering must use PencilKit at the requested scale");
assert.match(native, /hanjiHexWithAlpha[\s\S]*hasAlpha \? CGFloat\(value & 255\)/, "stroke round trips must retain ink alpha");
assert.match(bridge, /DocumentCanvasHandle[\s\S]*getStrokes[\s\S]*replaceStrokes[\s\S]*hitTest/, "the React ref must expose typed stroke APIs");
assert.match(bridge,/getDrawingData:[\s\S]*loadDrawingData:[\s\S]*renderImage:/,"the React ref must expose typed drawing blob and image APIs");
assert.match(types, /NativeStrokePoint=.*force:number.*azimuth:number.*altitude:number[\s\S]*NativeStroke=/, "shared types must model Pencil samples and strokes");

console.log("native stroke API verification passed");
