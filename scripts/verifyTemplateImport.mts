import assert from "node:assert/strict";
import {templateAssetKind} from "../src/templateImport.ts";

assert.equal(templateAssetKind({mimeType:"application/pdf",name:"paper.bin"}),"pdf");
assert.equal(templateAssetKind({mimeType:"application/octet-stream",name:"paper.PDF"}),"pdf");
assert.equal(templateAssetKind({mimeType:"image/png",name:"paper"}),"image");
assert.equal(templateAssetKind({name:"paper.heic"}),"image");
assert.equal(templateAssetKind({mimeType:"text/plain",name:"paper.txt"}),"unsupported");
console.log("Template import verification passed.");
