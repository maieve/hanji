import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/Toolbar.tsx", import.meta.url), "utf8");

assert.match(source, /accessibilityLabel=\{x\.label\}[\s\S]*accessibilityState=\{\{selected:tool\.kind===x\.kind\}\}/, "primary tools must expose their selected state");
assert.match(source, /accessibilityLabel=\{`지우개 \$\{eraserLabels\[mode\]\} 모드`\}/, "eraser modes must have distinct spoken names");
assert.match(source, /eraserMode\?\?'vector'\)===mode\}\}/, "eraser modes must expose their selected state");
assert.match(source, /accessibilityLabel=\{`도형 \$\{shapeLabels\[shapeKind\]\}`\}/, "shape kinds must have distinct spoken names");
assert.match(source, /shapeKind\?\?'line'\)===shapeKind\}\}/, "shape kinds must expose their selected state");
assert.match(source, /disabled:\(tool\.shapeKind\?\?'line'\)==='line'\|\|tool\.shapeKind==='arrow'/, "unavailable shape fills must expose their disabled state");

console.log("toolbar accessibility verification passed");
