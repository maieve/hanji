import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path: string) => readFile(new URL(path, import.meta.url), "utf8");
const [types, panel, paper, payload, webExport, nativeExport, merge, app] = await Promise.all([
  read("../src/types.ts"),
  read("../src/components/PagePaintPanel.tsx"),
  read("../src/components/Paper.tsx"),
  read("../src/archiveEscape.ts"),
  read("../src/export.web.ts"),
  read("../modules/hanji-canvas/ios/HanjiVisionModule.swift"),
  read("../src/cloudMerge.ts"),
  read("../src/HanjiApp.tsx"),
]);

assert.match(types, /backgroundColor2\?:string;backgroundGradientDirection\?:'vertical'\|'horizontal'/, "page metadata must persist the second paint color and direction");
assert.match(panel, /const gradients =[\s\S]*swap-vertical[\s\S]*swap-horizontal/, "paint UI must expose presets and both directions");
assert.match(panel, /const customEnd = async[\s\S]*그라데이션 끝 색상 선택[\s\S]*그라데이션 시작색과 끝색 뒤집기/, "users must be able to customize and reverse both gradient endpoints");
assert.match(panel, /ScrollView style=\{s\.scroll\}[\s\S]*maxHeight: "88%"/, "the expanded paint controls must remain scrollable in compact layouts");
assert.match(paper, /LinearGradient[\s\S]*backgroundColor2[\s\S]*pagePaintGradient/, "the editor paper must render the gradient layer");
assert.match(payload, /backgroundColor2:page\.backgroundColor2[\s\S]*backgroundGradientDirection:page\.backgroundGradientDirection/, "native export payload must include gradient metadata");
assert.match(webExport, /linear-gradient\([\s\S]*linearGradient id="pagePaint"/, "web PDF and PNG paths must both render gradients");
assert.match(nativeExport, /CGGradient[\s\S]*backgroundGradientDirection[\s\S]*drawLinearGradient/, "native PNG/PDF export must draw the same gradient");
assert.match(merge, /backgroundColor2: page\.backgroundColor2,[\s\S]*backgroundGradientDirection: page\.backgroundGradientDirection/, "cloud conflict signatures must include gradient metadata");
assert.match(app, /backgroundColor2=\{page\.backgroundColor2\}[\s\S]*gradientDirection=\{page\.backgroundGradientDirection\}/, "editor and paint panel must receive persisted gradient metadata");

console.log("page paint gradient verification passed");
