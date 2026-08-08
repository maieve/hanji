import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../modules/hanji-canvas/ios/HanjiDocumentModule.swift", import.meta.url),
  "utf8",
);

assert.match(source, /page\.selection\(from: start, to: pagePoint\)/, "PDF drag selection must use PDFKit text geometry");
assert.match(source, /selection\.selectionsByLine\(\)/, "multi-line selections must split into line bounds");
assert.match(source, /pdfTextSelectionLayer\.path = path\.cgPath/, "drag selection must render a preview");
assert.match(source, /registerTransformUndo\(original\)/, "snapped highlights must be undoable");
assert.match(source, /original\.strokes \+ strokes/, "all selected PDF lines must become editable PencilKit strokes");
assert.match(source, /case \.cancelled, \.failed:[\s\S]*clearPDFTextSelection\(\)/, "cancelled gestures must clear transient selection state");

console.log("PDF text highlight verification passed");
