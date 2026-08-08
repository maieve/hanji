import assert from "node:assert/strict";
import { normalizePencilAction, pencilActions } from "../src/pencilActions.ts";
assert.deepEqual(
  pencilActions.map((item) => item.value),
  ["eraser", "undo", "redo", "toolbar", "none"],
);
assert.equal(normalizePencilAction("undo", "eraser"), "undo");
assert.equal(normalizePencilAction("invalid", "toolbar"), "toolbar");
assert.equal(normalizePencilAction(undefined, "none"), "none");
console.log("pencil action verification passed");
