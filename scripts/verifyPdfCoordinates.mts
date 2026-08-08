import assert from 'node:assert/strict';
import { mapCanvasRectToPage, scaleCanvasRect } from '../src/pdfCoordinates.ts';

const portrait = { x: 225, y: 0, width: 450, height: 636, canvasWidth: 900, canvasHeight: 636 };
assert.deepEqual(mapCanvasRectToPage({ x: 225, y: 0, width: 450, height: 636 }, portrait, { width: 595, height: 842 }), { x: 0, y: 0, width: 595, height: 842 });
assert.deepEqual(mapCanvasRectToPage({ x: 337.5, y: 159, width: 225, height: 318 }, portrait, { width: 595, height: 842 }), { x: 148.75, y: 210.5, width: 297.5, height: 421 });
const landscape = { x: 0, y: 0, width: 900, height: 636, canvasWidth: 900, canvasHeight: 636 };
assert.deepEqual(mapCanvasRectToPage({ x: 90, y: 63.6, width: 180, height: 127.2 }, landscape, { width: 900, height: 636 }), { x: 90, y: 63.6, width: 180, height: 127.2 });
assert.deepEqual(scaleCanvasRect({x:90,y:63.6,width:180,height:127.2},{width:900,height:636},{width:450,height:318}),{x:45,y:31.8,width:90,height:63.6});
console.log('PDF coordinate mapping verification passed');
