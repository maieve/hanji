import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/HanjiApp.tsx", import.meta.url), "utf8");
const navigationStart = source.indexOf("style={s.sidebarNavigation}");
const localSave = source.indexOf('accessibilityLabel={\n                saveStatus', navigationStart);
assert.ok(navigationStart > 0, "sidebar categories must live in a scrollable navigation region");
assert.ok(localSave > navigationStart, "local save status must follow the navigation region");
const closeScroll = source.lastIndexOf("</ScrollView>", localSave);
assert.ok(closeScroll > navigationStart, "scrollable navigation must close before fixed save status");
assert.match(source, /sidebarNavigation: \{ flex: 1/, "navigation must consume only the remaining sidebar height");
assert.match(source, /showsVerticalScrollIndicator=\{false\}/, "sidebar navigation should avoid a persistent visual scrollbar");

console.log("library navigation layout verification passed");
