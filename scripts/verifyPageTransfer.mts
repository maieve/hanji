import assert from 'node:assert/strict';
import {duplicateNotebookPage,transferPage} from '../src/pageTransfer.ts';
import type {Notebook,Page} from '../src/types.ts';

const page=(id:string):Page=>({id,drawingData:id,template:'line',updatedAt:'2026-01-01',elements:[{id:`${id}-text`,kind:'text',text:id,x:.1,y:.1,width:.2,height:.1,fontSize:14,color:'#000000'}]});
const source:Notebook={id:'source',title:'Source',folder:'내 노트',tags:[],favorite:false,createdAt:'2026-01-01',updatedAt:'2026-01-01',pages:[page('p1'),page('p2')],audioSessions:[{uri:'audio.m4a',createdAt:'2026-01-01',startedAt:0,durationMs:1000,strokes:[{pageId:'p1',createdAt:10,seekSec:1},{pageId:'p2',createdAt:20,seekSec:2}]}]};
const target:Notebook={id:'target',title:'Target',folder:'내 노트',tags:[],favorite:false,createdAt:'2026-01-01',updatedAt:'2026-01-01',pages:[page('t1')]};
const duplicated=duplicateNotebookPage(source,'p1'),copy=duplicated.pages[1]!;
assert.equal(duplicated.pages.length,3);assert.notEqual(copy.id,'p1');assert.notEqual(copy.elements?.[0]?.id,source.pages[0]?.elements?.[0]?.id);
assert(duplicated.audioSessions?.[0]?.strokes.some(stroke=>stroke.pageId===copy.id&&stroke.createdAt===10),'duplicate must remap audio stroke reference');
assert(duplicated.pageOrderUpdatedAt,'duplicate must stamp page order');
assert.equal(duplicateNotebookPage(source,'missing'),source);
const copied=transferPage([source,target],'source','p1','target','copy');const copiedTarget=copied.find(note=>note.id==='target')!,copiedPage=copiedTarget.pages.at(-1)!;
assert.notEqual(copiedPage.id,'p1');assert(copiedTarget.audioSessions?.[0]?.strokes.some(stroke=>stroke.pageId===copiedPage.id));assert.equal(copied.find(note=>note.id==='source')?.pages.length,2);
const moved=transferPage([source,target],'source','p1','target','move');assert.equal(moved.find(note=>note.id==='source')?.pages.some(item=>item.id==='p1'),false);assert(moved.find(note=>note.id==='source')?.deletedPages?.p1);assert.equal(moved.find(note=>note.id==='source')?.audioSessions?.[0]?.strokes.some(stroke=>stroke.pageId==='p1'),false);
assert(moved.find(note=>note.id==='source')?.pageOrderUpdatedAt&&moved.find(note=>note.id==='target')?.pageOrderUpdatedAt,'move must stamp both page orders');
console.log('page transfer verification passed');
