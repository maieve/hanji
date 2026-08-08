import {searchNotebook} from '../src/documentSearch.ts';
import {rebuildSearchIndex,searchLibrary} from '../src/searchIndex.web.ts';
import type {Notebook} from '../src/types.ts';
import {searchIndexRows} from '../src/searchIndexRows.ts';

const notebook:Notebook={id:'note',title:'검색 노트',folder:'내 노트',tags:[],favorite:false,createdAt:'2026-01-01',updatedAt:'2026-01-01',pages:[{id:'p1',drawingData:'',template:'line',updatedAt:'2026-01-01',ocrText:'한지 검색 한지',elements:[{id:'t1',kind:'text',text:'회의 결과',x:0,y:0,width:.2,height:.1,fontSize:16,color:'#000'}]},{id:'p2',drawingData:'',template:'line',updatedAt:'2026-01-01',elements:[{id:'t2',kind:'text',text:'영어 Search Result',x:0,y:0,width:.2,height:.1,fontSize:16,color:'#000'}]}],audioSessions:[{uri:'audio.m4a',createdAt:'2026-01-01',startedAt:0,durationMs:1000,strokes:[],transcript:'강의 전사 검색'}]};
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};

const korean=searchNotebook(notebook,'검색');
assert(korean.length===1&&korean[0]?.pageIndex===0,'OCR and transcript matches should collapse into page 1');
assert(korean[0]?.matches===2,'all occurrences across OCR and transcript should be counted');
assert(korean[0]?.sources.includes('손글씨')&&korean[0]?.sources.includes('전사'),'matching source labels should be reported');
const english=searchNotebook(notebook,'search result');
assert(english.length===1&&english[0]?.pageIndex===1&&english[0]?.sources[0]==='텍스트','case-insensitive multi-token card search should find page 2');
assert(searchNotebook(notebook,'없는 말').length===0,'missing query should return no results');
assert(searchNotebook(notebook,'').length===0,'empty query should return no results');
const rows=searchIndexRows([notebook]);
assert(rows[0]?.body.includes('회의 결과'),'global FTS rows must include text elements');
assert(rows[0]?.body.includes('강의 전사 검색'),'first page must include the notebook transcript');
assert(!rows[1]?.body.includes('강의 전사 검색'),'transcript must not be duplicated on every page');
const newer={...notebook,pages:notebook.pages.map((page,index)=>index===0?{...page,ocrText:'최신 스냅샷'}:page)};
const first=rebuildSearchIndex([notebook]);const second=rebuildSearchIndex([newer]);await Promise.all([first,second]);
assert((await searchLibrary('최신')).length===1,'queued rebuilds must leave the latest complete snapshot searchable');
assert((await searchLibrary('한지')).length===0,'an older queued snapshot must not overwrite the latest rebuild');
assert((await searchLibrary('회의 결과')).length===1,'global search must find text elements');
console.log('document search verification passed');
