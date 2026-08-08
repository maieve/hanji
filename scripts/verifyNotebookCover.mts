import assert from "node:assert/strict";
import {
  normalizeNotebookCoverColor,
  notebookCoverColors,
} from "../src/notebookCover.ts";

assert.equal(notebookCoverColors.length, 6);
for (const color of notebookCoverColors)
  assert.equal(normalizeNotebookCoverColor(color), color);
assert.equal(normalizeNotebookCoverColor(undefined), "#FFFDF8");
assert.equal(normalizeNotebookCoverColor("#BADBAD"), "#FFFDF8");
console.log("notebook cover verification passed");
