import assert from "node:assert/strict";
import { pageJumpIndex } from "../src/pageJump.ts";

assert.equal(pageJumpIndex("1", 200), 0);
assert.equal(pageJumpIndex(" 200 ", 200), 199);
assert.equal(pageJumpIndex("0", 200), undefined);
assert.equal(pageJumpIndex("201", 200), undefined);
assert.equal(pageJumpIndex("12.5", 200), undefined);
assert.equal(pageJumpIndex("12쪽", 200), undefined);
assert.equal(pageJumpIndex("", 200), undefined);
assert.equal(pageJumpIndex("1", 0), undefined);
console.log("page jump verification passed");
