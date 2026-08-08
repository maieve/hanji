import assert from "node:assert/strict";
import { drawingBlobName, isStoredLibraryMetadata, libraryMetadata, referencedDrawingRefs, staleDrawingRefs } from "../src/drawingPersistence.ts";
import type { Notebook } from "../src/types.ts";

const note:Notebook={id:"n:1",title:"N",folder:"F",tags:[],favorite:false,createdAt:"2026",updatedAt:"2026",pages:[{id:"p/1",drawingData:"large-base64-payload",template:"line",updatedAt:"2026"},{id:"empty",drawingData:"",template:"plain",updatedAt:"2026"}]};
const metadata=libraryMetadata([note]);
assert.equal(isStoredLibraryMetadata(metadata),true);
assert.equal(isStoredLibraryMetadata({}),false);
assert.equal(isStoredLibraryMetadata([{id:"n",pages:[{id:"p",drawingRef:42}]}]),false);
assert(!JSON.stringify(metadata).includes("large-base64-payload"),"AsyncStorage metadata must not contain drawing payloads");
assert.equal(metadata[0]?.pages[0]?.drawingRef,drawingBlobName("n:1","p/1","large-base64-payload"));
assert.equal(metadata[0]?.pages[1]?.drawingRef,undefined,"blank pages need no blob");
assert.notEqual(drawingBlobName("n","p","one"),drawingBlobName("n","p","two"),"changed drawings need immutable blob names");
const currentRef=metadata[0]?.pages[0]?.drawingRef;
assert(currentRef);
assert.deepEqual([...referencedDrawingRefs(metadata)],[currentRef]);
assert.deepEqual(
  staleDrawingRefs([currentRef,"old-version.drawing","keep-me.pdf"],metadata),
  ["old-version.drawing"],
  "GC must retain current blobs and ignore unrelated assets",
);
assert.deepEqual(staleDrawingRefs(["orphan.drawing"],[]),["orphan.drawing"]);
console.log("drawing persistence verification passed");
