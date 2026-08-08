import assert from "node:assert/strict";
import { isNotebookLibrary, notebookAssetReferences } from "../src/archiveAssets.ts";
import type { Notebook } from "../src/types.ts";

const note: Notebook = {id:"n",title:"N",folder:"F",tags:[],favorite:false,createdAt:"2026",updatedAt:"2026",coverUri:"cover.png",pages:[{id:"p",drawingData:"",template:"plain",updatedAt:"2026",pdfUri:"doc.pdf",customTemplateUri:"template.png",elements:[{id:"i",kind:"image",uri:"image.png",x:0,y:0,width:1,height:1}]}],audioSessions:[{uri:"audio.m4a",createdAt:"2026",startedAt:0,durationMs:1,strokes:[]}],flashcards:[{id:"c",question:"q",answer:"a",questionImageUri:"image.png",answerImageUri:"answer.png",createdAt:"2026",updatedAt:"2026",dueAt:"2026",intervalDays:0,easeFactor:2.5,repetitions:0,lapses:0}]};
const refs=notebookAssetReferences([note]);
assert.equal(isNotebookLibrary([note]),true);
assert.equal(isNotebookLibrary([{id:"n",title:"N",pages:[{id:"p"}]}]),false);
assert.deepEqual(refs.map(item=>item.uri),["cover.png","doc.pdf","template.png","image.png","answer.png","audio.m4a"]);
assert.equal(refs.filter(item=>item.uri==="image.png").length,1,"shared assets must be archived once");
console.log("archive asset inventory verification passed");
