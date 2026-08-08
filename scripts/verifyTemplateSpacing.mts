import assert from "node:assert/strict";
import {
  normalizeTemplateSpacing,
  templateSpacingPoints,
  templateSpacings,
} from "../src/templateSpacing.ts";

assert.deepEqual(
  templateSpacings.map((item) => item.value),
  ["narrow", "medium", "wide"],
);
assert.equal(templateSpacingPoints("narrow"), 24);
assert.equal(templateSpacingPoints("medium"), 32);
assert.equal(templateSpacingPoints("wide"), 40);
assert.equal(normalizeTemplateSpacing(undefined), "medium");
assert.equal(normalizeTemplateSpacing("invalid"), "medium");
console.log("template spacing verification passed");
