import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(
  new URL("../src/components/AudioPanel.tsx", import.meta.url),
  "utf8",
);

assert.match(source, /AppState\.addEventListener\("change"/, "recording must observe app lifecycle changes");
assert.match(source, /nextState !== "active"[\s\S]*finishRecording\(false\)/, "backgrounding must finalize an active recording");
assert.match(source, /finalizingRef\.current/, "recording finalization must reject duplicate stop requests");
assert.match(source, /recorder\.getStatus\(\)\.durationMillis/, "saved duration must use the recorder's current status");
assert.match(source, /persistRecording\(recorder\.uri\)/, "temporary recordings must be copied into permanent storage");
assert.match(source, /onRecordingCancelled\(\)/, "failed finalization must release stroke synchronization state");

console.log("recording lifecycle verification passed");
