import assert from "node:assert/strict";
import { OCR_LOW_POWER_RETRY_MS, ocrJobDisposition } from "../src/ocrPolicy.ts";

assert.equal(OCR_LOW_POWER_RETRY_MS, 30_000);
assert.equal(ocrJobDisposition(false, 4, 4), "run");
assert.equal(ocrJobDisposition(true, 4, 4), "defer");
assert.equal(ocrJobDisposition(false, 5, 4), "stale");
assert.equal(ocrJobDisposition(true, undefined, 1), "stale");
console.log("OCR queue policy verification passed");
