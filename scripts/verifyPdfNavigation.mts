import assert from "node:assert/strict";
import { resolvePdfPageIndex } from "../src/pdfNavigation.ts";
import type { Page } from "../src/types.ts";

const page = (id: string, pdfUri?: string, pdfPageIndex?: number): Page => ({
  id, drawingData: "", template: "plain", updatedAt: "2026-08-08", pdfUri, pdfPageIndex,
});
const source = page("a-2", "file:///a.pdf", 2);
const pages = [page("note"), source, page("b-0", "file:///b.pdf", 0), page("a-0", "file:///a.pdf", 0), page("a-1", "file:///a.pdf", 1)];

assert.equal(resolvePdfPageIndex(pages, source, 0), 3, "reordered PDF page");
assert.equal(resolvePdfPageIndex(pages, source, 1), 4, "mixed notebook page");
assert.equal(resolvePdfPageIndex(pages, source, 2), 1, "current PDF page");
assert.equal(resolvePdfPageIndex(pages, source, 9), undefined, "missing PDF page");
assert.equal(resolvePdfPageIndex(pages, pages[0]!, 0), undefined, "non-PDF source");
assert.equal(resolvePdfPageIndex(pages, source, -1), undefined, "invalid page index");
console.log("PDF navigation verification passed");
