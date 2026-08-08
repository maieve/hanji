import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { OCR_LOW_POWER_RETRY_MS, ocrJobDisposition } from "../src/ocrPolicy.ts";

assert.equal(OCR_LOW_POWER_RETRY_MS, 30_000);
assert.equal(ocrJobDisposition(false, 4, 4), "run");
assert.equal(ocrJobDisposition(true, 4, 4), "defer");
assert.equal(ocrJobDisposition(false, 5, 4), "stale");
assert.equal(ocrJobDisposition(true, undefined, 1), "stale");
const [native,app,types]=await Promise.all([
  readFile(new URL('../modules/hanji-canvas/ios/HanjiVisionModule.swift',import.meta.url),'utf8'),
  readFile(new URL('../src/HanjiApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/types.ts',import.meta.url),'utf8'),
]);
assert.match(native,/request\.revision = VNRecognizeTextRequestRevision3[\s\S]*orientation: \.up[\s\S]*sorted \{[\s\S]*boundingBox\.midY[\s\S]*boundingBox\.minX/,'Vision OCR must use a fixed revision, explicit orientation, and deterministic reading order');
assert.match(native,/averageConfidence[\s\S]*lineCount[\s\S]*recognitionRevision/,'native OCR must return quality diagnostics for the G2 benchmark');
assert.match(types,/ocrLineCount\?:number;ocrAverageConfidence\?:number;ocrRecognizedAt\?:string/,'pages must persist OCR quality diagnostics');
assert.match(app,/ocrLineCount: result\.lineCount[\s\S]*ocrAverageConfidence: result\.averageConfidence[\s\S]*ocrRecognizedAt: new Date/,'completed OCR jobs must persist their diagnostics');
assert.match(app,/OCR 신뢰도[\s\S]*p\.ocrLineCount[\s\S]*OCR \{Math\.round\(p\.ocrAverageConfidence\*100\)\}%/,'page rail must expose OCR quality visually and to VoiceOver');
console.log("OCR queue policy verification passed");
