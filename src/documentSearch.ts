import type {Notebook} from './types';

export type DocumentSearchResult={pageIndex:number;snippet:string;matches:number;sources:string[]};
const normalize=(value:string)=>value.toLocaleLowerCase();
const excerpt=(body:string,token:string)=>{const index=normalize(body).indexOf(token);const start=Math.max(0,index-35);return `${start?'… ':''}${body.slice(start,start+110).trim()}${body.length>start+110?' …':''}`};
const countMatches=(body:string,tokens:string[])=>tokens.reduce((count,token)=>{let from=0,next=0;const normalized=normalize(body);while((next=normalized.indexOf(token,from))>=0){count++;from=next+Math.max(1,token.length)}return count},0);

export function searchNotebook(notebook:Notebook,query:string):DocumentSearchResult[]{
 const tokens=normalize(query).trim().split(/\s+/).filter(Boolean);if(!tokens.length)return[];
 const transcript=(notebook.audioSessions??[]).map(session=>session.transcript??'').join(' ');
 const contains=(body:string)=>tokens.every(token=>normalize(body).includes(token));
 return notebook.pages.flatMap((page,pageIndex)=>{const ocr=page.ocrText??'';const cards=(page.elements??[]).filter(element=>element.kind==='text').map(element=>element.text).join(' ');const audio=pageIndex===0?transcript:'';const body=[ocr,cards,audio].filter(Boolean).join(' ');if(!contains(body))return[];const sources=[contains(ocr)&&'손글씨',contains(cards)&&'텍스트',contains(audio)&&'전사'].filter(Boolean) as string[];return[{pageIndex,snippet:excerpt(body,tokens[0]??''),matches:countMatches(body,tokens),sources:sources.length?sources:['복합 일치']}]});
}
