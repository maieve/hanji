import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile(new URL("../src/HanjiApp.tsx", import.meta.url), "utf8");

assert.match(app, /type PagePaintSnapshot=Pick<Page,'backgroundColor'\|'backgroundColor2'\|'backgroundGradientDirection'\|'backgroundOpacity'>/, "paint history must capture every visible paint field");
assert.match(app, /kind:'pagePaint';pageId:string;before:PagePaintSnapshot;after:PagePaintSnapshot/, "paint changes must be first-class bounded history entries");
assert.match(app, /recordSelectionHistory\(\{kind:'pagePaint',pageId:page\.id,before,after\}\)/, "each actual paint edit must enter the shared undo stack");
assert.match(app, /JSON\.stringify\(before\)===JSON\.stringify\(after\)/, "no-op paint selections must not consume undo history");
assert.match(app, /conversion\.kind==='pagePaint'[\s\S]*\.\.\.conversion\.before/, "undo must restore the complete previous paint snapshot");
assert.match(app, /conversion\.kind==='pagePaint'[\s\S]*\.\.\.conversion\.after/, "redo must restore the complete resulting paint snapshot");
assert.match(app, /conversion\.kind==='snapshot'&&conversion\.native/, "paint-only history must not accidentally signal native PencilKit undo");
assert.match(app, /kind:'pagePaintBatch';before:PagePaintPageSnapshot\[\];after:PagePaintPageSnapshot\[\]/, "bulk paint must be one atomic history entry");
assert.match(app, /recordSelectionHistory\(\{kind:'pagePaintBatch',before,after\}\)/, "bulk paint must enter bounded history before mutation");
assert.match(app, /conversion\.kind==='pagePaintBatch'[\s\S]*new Map\(conversion\.before[\s\S]*paintByPage\.get\(p\.id\)/, "one undo must restore each page's distinct previous paint");
assert.match(app, /conversion\.kind==='pagePaintBatch'[\s\S]*new Map\(conversion\.after[\s\S]*paintByPage\.get\(p\.id\)/, "one redo must reapply the shared paint to every changed page");

const panel = await readFile(new URL("../src/components/PagePaintPanel.tsx", import.meta.url), "utf8");
assert.match(panel, /Alert\.alert\("모든 페이지에 적용"[\s\S]*필기와 템플릿은 유지됩니다[\s\S]*onPress:onApplyAll/, "bulk paint must require explicit confirmation and explain non-destructive behavior");

console.log("page paint history verification passed");
