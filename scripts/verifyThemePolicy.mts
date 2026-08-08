import assert from "node:assert/strict";
import { appColorSchemes, appearanceOverride, normalizeAppColorScheme } from "../src/themePolicy.ts";

assert.deepEqual(appColorSchemes, ["system", "light", "dark"]);
assert.equal(normalizeAppColorScheme("dark"), "dark");
assert.equal(normalizeAppColorScheme("sepia"), "system");
assert.equal(normalizeAppColorScheme(undefined), "system");
assert.equal(appearanceOverride("system"), null);
assert.equal(appearanceOverride("light"), "light");
assert.equal(appearanceOverride("dark"), "dark");
console.log("Theme policy verification passed.");
