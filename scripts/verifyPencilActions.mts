import assert from "node:assert/strict";
import {
  normalizePencilAction,
  pencilActions,
  pencilDoubleTapActions,
  pencilSqueezeActions,
} from "../src/pencilActions.ts";
assert.deepEqual(
  pencilActions.map((item) => item.value),
  ["eraser", "undo", "redo", "toolbar", "none"],
);
assert.equal(
  pencilDoubleTapActions.some((item) => item.value === "temporaryEraser"),
  false,
);
assert.equal(pencilSqueezeActions[0].value, "temporaryEraser");
assert.equal(
  normalizePencilAction("temporaryEraser", "toolbar"),
  "temporaryEraser",
);
assert.equal(
  normalizePencilAction("temporaryEraser", "eraser", pencilDoubleTapActions),
  "eraser",
);
assert.equal(normalizePencilAction("undo", "eraser"), "undo");
assert.equal(normalizePencilAction("invalid", "toolbar"), "toolbar");
assert.equal(normalizePencilAction(undefined, "none"), "none");
console.log("pencil action verification passed");
