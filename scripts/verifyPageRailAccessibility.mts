import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/HanjiApp.tsx", import.meta.url), "utf8");
assert.match(source, /accessibilityLabel=\{`페이지 \$\{i \+ 1\}[\s\S]*p\.bookmarked[\s\S]*p\.rotation/, "page rail labels must include page, bookmark, and rotation state");
assert.match(source, /accessibilityHint="두 번 탭하여 이 페이지로 이동"/, "page rail thumbnails must explain their action");
assert.match(source, /accessibilityState=\{\{ selected: i === pageIndex \}\}/, "the active rail page must expose selected state");
assert.match(source, /sideItem: \{[\s\S]*minHeight: 42/, "sidebar rows must grow with Dynamic Type");
assert.doesNotMatch(source, /sideItem: \{[\s\S]{0,100}\bheight: 42/, "sidebar rows must not use a fixed height");

console.log("page rail accessibility verification passed");
