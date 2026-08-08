import assert from 'node:assert/strict';
import {clampReferencePage,resolveReferenceNotebook} from '../src/referenceDocument.ts';
import type {Notebook} from '../src/types.ts';
const note=(id:string):Notebook=>({id,title:id,folder:'',tags:[],favorite:false,createdAt:'',updatedAt:'',pages:[{id:`${id}-p`,drawingData:'',template:'plain',updatedAt:''}]});
const items=[note('a'),note('b')];
assert.equal(resolveReferenceNotebook(items,'b','a')?.id,'b');assert.equal(resolveReferenceNotebook(items,'a','a'),undefined);assert.equal(resolveReferenceNotebook(items,'missing','a'),undefined);
assert.equal(clampReferencePage(-2,10),0);assert.equal(clampReferencePage(99,10),9);assert.equal(clampReferencePage(2,0),0);
console.log('reference document verification passed');
