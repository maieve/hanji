import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { findAudioStroke } from "../src/audioSync.ts";
import type { AudioSession } from "../src/types.ts";

const session = (createdAt: string, strokes: AudioSession["strokes"]): AudioSession => ({
  uri: `${createdAt}.m4a`, createdAt, startedAt: 0, durationMs: 10_000, strokes,
});
const older = session("2026-01-01", [{ pageId: "p1", strokeId:"stroke-old", createdAt: 10, seekSec: 2 }]);
const newer = session("2026-01-02", [{ pageId: "p1", strokeId:"stroke-new", createdAt: 30, seekSec: 4 }, { pageId: "p2", createdAt: 40, seekSec: 5 }]);

assert.equal(findAudioStroke([older, newer], "p1", 10)?.session.createdAt, older.createdAt, "old stroke must select old audio");
assert.equal(findAudioStroke([older, newer], "p1", 29)?.session.createdAt, newer.createdAt, "nearest stroke across sessions");
assert.equal(findAudioStroke([older, newer], "p2", 40)?.stroke.seekSec, 5);
assert.equal(findAudioStroke([older,newer],"p1",10,"stroke-new")?.session.createdAt,newer.createdAt,"stable stroke ID must win over an ambiguous or changed timestamp");
assert.equal(findAudioStroke([older,newer],"p1",10,"missing")?.session.createdAt,older.createdAt,"legacy timestamp fallback must remain available");
assert.equal(findAudioStroke([older, newer], "missing", 10), undefined);
const [native,app,bridge]=await Promise.all([
  readFile(new URL("../modules/hanji-canvas/ios/HanjiDocumentModule.swift",import.meta.url),"utf8"),
  readFile(new URL("../src/HanjiApp.tsx",import.meta.url),"utf8"),
  readFile(new URL("../src/components/DocumentCanvas.tsx",import.meta.url),"utf8"),
]);
assert.match(native,/onStrokeAdded\(\["id": strokeIdentifier\(stroke\)/,"native add events must expose a stable stroke identifier");
assert.match(native,/onStrokeTapped\(\["id": strokeIdentifier\(hit\)/,"native tap events must expose the same stable stroke identifier");
assert.match(bridge,/onStrokeAdded\?\.\(e\.nativeEvent\)[\s\S]*onStrokeTapped\?\.\(e\.nativeEvent\)/,"the bridge must preserve stroke IDs");
assert.match(app,/strokeId:event\.id[\s\S]*findAudioStroke\([\s\S]*event\.id/,"recording and playback must persist and query stroke IDs");
console.log("audio stroke synchronization verification passed");
