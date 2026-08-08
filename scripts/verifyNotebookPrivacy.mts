import assert from 'node:assert/strict';
import {librarySearchMatches,mayRevealNotebookSnippet} from '../src/notebookPrivacy.ts';
import type {Notebook} from '../src/types.ts';

const note={id:'locked',title:'비밀 회의',folder:'내 노트',tags:['업무'],favorite:false,locked:true,createdAt:'2026-01-01',updatedAt:'2026-01-01',pages:[{id:'p1',drawingData:'',template:'plain',updatedAt:'2026-01-01',ocrText:'노출되면 안 되는 본문'}]} satisfies Notebook;
assert.equal(librarySearchMatches(note,'비밀',false),true);
assert.equal(librarySearchMatches(note,'업무',false),true);
assert.equal(librarySearchMatches(note,'노출되면',true),false);
assert.equal(mayRevealNotebookSnippet(note),false);
assert.equal(librarySearchMatches({...note,locked:false},'노출되면',true),true);
assert.equal(mayRevealNotebookSnippet({...note,locked:false}),true);
console.log('notebook privacy verification passed');
