import assert from "node:assert/strict";
import {
  normalizePencilAction,
  pencilActions,
  pencilDoubleTapActions,
  pencilSqueezeActions,
} from "../src/pencilActions.ts";
import {resolvePencilPreferredAction} from '../src/pencilPreferredAction.ts';
assert.deepEqual(
  pencilActions.map((item) => item.value),
  ["system", "eraser", "undo", "redo", "toolbar", "none"],
);
assert.equal(
  pencilDoubleTapActions.some((item) => item.value === "temporaryEraser"),
  false,
);
assert.equal(pencilSqueezeActions[0].value, "temporaryEraser");
assert.equal(normalizePencilAction("system", "eraser"), "system");
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
assert.equal(resolvePencilPreferredAction('switchEraser'),'eraser');
assert.equal(resolvePencilPreferredAction('switchPrevious'),'previous');
assert.equal(resolvePencilPreferredAction('showColorPalette'),'toolbar');
assert.equal(resolvePencilPreferredAction('showInkAttributes'),'toolbar');
assert.equal(resolvePencilPreferredAction('showContextualPalette'),'toolbar');
assert.equal(resolvePencilPreferredAction('runSystemShortcut'),'none');
assert.equal(resolvePencilPreferredAction('ignore'),'none');
console.log("pencil action verification passed");
