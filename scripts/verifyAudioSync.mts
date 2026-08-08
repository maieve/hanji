import assert from "node:assert/strict";
import { findAudioStroke } from "../src/audioSync.ts";
import type { AudioSession } from "../src/types.ts";

const session = (createdAt: string, strokes: AudioSession["strokes"]): AudioSession => ({
  uri: `${createdAt}.m4a`, createdAt, startedAt: 0, durationMs: 10_000, strokes,
});
const older = session("2026-01-01", [{ pageId: "p1", createdAt: 10, seekSec: 2 }]);
const newer = session("2026-01-02", [{ pageId: "p1", createdAt: 30, seekSec: 4 }, { pageId: "p2", createdAt: 40, seekSec: 5 }]);

assert.equal(findAudioStroke([older, newer], "p1", 10)?.session.createdAt, older.createdAt, "old stroke must select old audio");
assert.equal(findAudioStroke([older, newer], "p1", 29)?.session.createdAt, newer.createdAt, "nearest stroke across sessions");
assert.equal(findAudioStroke([older, newer], "p2", 40)?.stroke.seekSec, 5);
assert.equal(findAudioStroke([older, newer], "missing", 10), undefined);
console.log("audio stroke synchronization verification passed");
