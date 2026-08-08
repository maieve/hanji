import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import { mapCanvasRectToPage, scaleCanvasRect } from '../src/pdfCoordinates.ts';

const portrait = { x: 225, y: 0, width: 450, height: 636, canvasWidth: 900, canvasHeight: 636 };
assert.deepEqual(mapCanvasRectToPage({ x: 225, y: 0, width: 450, height: 636 }, portrait, { width: 595, height: 842 }), { x: 0, y: 0, width: 595, height: 842 });
assert.deepEqual(mapCanvasRectToPage({ x: 337.5, y: 159, width: 225, height: 318 }, portrait, { width: 595, height: 842 }), { x: 148.75, y: 210.5, width: 297.5, height: 421 });
const landscape = { x: 0, y: 0, width: 900, height: 636, canvasWidth: 900, canvasHeight: 636 };
assert.deepEqual(mapCanvasRectToPage({ x: 90, y: 63.6, width: 180, height: 127.2 }, landscape, { width: 900, height: 636 }), { x: 90, y: 63.6, width: 180, height: 127.2 });
assert.deepEqual(scaleCanvasRect({x:90,y:63.6,width:180,height:127.2},{width:900,height:636},{width:450,height:318}),{x:45,y:31.8,width:90,height:63.6});
const native=await readFile(new URL('../modules/hanji-canvas/ios/HanjiVisionModule.swift',import.meta.url),'utf8');
const normalized=(native.match(/let sourceBounds = sourcePage\?\.bounds\(for: \.mediaBox\)/g)??[]).length;
const translated=(native.match(/translateBy\(x: -sourceBounds\.minX, y: -sourceBounds\.minY\)/g)??[]).length;
assert.equal(normalized,2,'native PDF and PNG exports must both read the original MediaBox');
assert.equal(translated,2,'native PDF and PNG exports must both normalize an offset MediaBox origin');
assert.match(native,/sourceBounds\.map \{ CGRect\(origin: \.zero, size: \$0\.size\) \}/,'export page bounds must always start at zero before rotation and overlay mapping');
console.log('PDF coordinate mapping verification passed');
