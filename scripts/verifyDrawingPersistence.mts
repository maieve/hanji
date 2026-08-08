import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import { drawingBlobName, isStoredLibraryMetadata, libraryMetadata, referencedDrawingRefs, staleDrawingRefs } from "../src/drawingPersistence.ts";
import type { Notebook } from "../src/types.ts";

const viewport={x:225,y:0,width:450,height:636,canvasWidth:900,canvasHeight:636};
const note:Notebook={id:"n:1",title:"N",folder:"F",tags:[],favorite:false,createdAt:"2026",updatedAt:"2026",pages:[{id:"p/1",drawingData:"large-base64-payload",drawingViewport:viewport,template:"line",updatedAt:"2026"},{id:"empty",drawingData:"",template:"plain",updatedAt:"2026"}]};
const metadata=libraryMetadata([note]);
assert.equal(isStoredLibraryMetadata(metadata),true);
assert.equal(isStoredLibraryMetadata({}),false);
assert.equal(isStoredLibraryMetadata([{id:"n",pages:[{id:"p",drawingRef:42}]}]),false);
assert(!JSON.stringify(metadata).includes("large-base64-payload"),"AsyncStorage metadata must not contain drawing payloads");
assert.equal(metadata[0]?.pages[0]?.drawingRef,drawingBlobName("n:1","p/1","large-base64-payload"));
assert.equal(metadata[0]?.pages[1]?.drawingRef,undefined,"blank pages need no blob");
assert.deepEqual(metadata[0]?.pages[0]?.drawingViewport,viewport,"PDF viewport metadata must survive drawing extraction");
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
const [native,bridge,app,continuous]=await Promise.all([
  readFile(new URL('../modules/hanji-canvas/ios/HanjiDocumentModule.swift',import.meta.url),'utf8'),
  readFile(new URL('../src/components/DocumentCanvas.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/HanjiApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/ContinuousDocument.tsx',import.meta.url),'utf8'),
]);
assert.match(native,/Prop\("drawingCanvasSize"\)[\s\S]*normalizeLoadedDrawingIfNeeded\(\)[\s\S]*canvas\.bounds\.width \/ sourceSize\.width/,'native load must normalize stored PencilKit coordinates to the current canvas exactly once');
assert.match(native,/normalizedLoadedDrawing = false[\s\S]*normalizeLoadedDrawingIfNeeded\(\)/,'each newly loaded drawing must get a fresh normalization pass');
assert.match(bridge,/drawingCanvasSize=\{p\.drawingViewport\?\{width:p\.drawingViewport\.canvasWidth,height:p\.drawingViewport\.canvasHeight\}:undefined\}/,'the bridge must pass persisted canvas dimensions with drawing data');
assert.match(app,/drawingData=\{page\.drawingData\}[\s\S]*drawingViewport=\{page\.drawingViewport\}/,'page mode must restore stored drawing dimensions');
assert.match(continuous,/drawingData=\{item\.drawingData\}[\s\S]*drawingViewport=\{item\.drawingViewport\}/,'continuous mode must restore stored drawing dimensions');
console.log("drawing persistence verification passed");
