import assert from 'node:assert/strict';
import {selectElementIds} from '../src/elementSelection.ts';
import type {PageElement} from '../src/types.ts';

const elements:PageElement[]=[
 {id:'text',kind:'text',text:'Q',x:.1,y:.1,width:.2,height:.1,fontSize:20,color:'#000'},
 {id:'image',kind:'image',uri:'file:///image.png',x:.4,y:.4,width:.3,height:.3},
 {id:'outside',kind:'text',text:'no',x:.8,y:.8,width:.1,height:.1,fontSize:20,color:'#000'},
];
assert.deepEqual(selectElementIds(elements,{x:.05,y:.05,width:.5,height:.5},{text:true,images:true}),['text','image']);
assert.deepEqual(selectElementIds(elements,{x:.05,y:.05,width:.5,height:.5},{text:false,images:true}),['image']);
assert.deepEqual(selectElementIds(elements,{x:.05,y:.05,width:.5,height:.5},{text:true,images:false}),['text']);
assert.deepEqual(selectElementIds(elements,{x:.19,y:.19,width:.01,height:.01},{text:true,images:true}),['text']);
console.log('element selection verification passed');
