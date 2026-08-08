import type {AudioSession,Notebook,Page} from './types';

const now=()=>new Date().toISOString();
const makeId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;
const blankPage=():Page=>({id:makeId(),drawingData:'',template:'line',templateSpacing:'medium',updatedAt:now()});
const clonePage=(page:Page):Page=>({...page,id:makeId(),updatedAt:now(),elements:page.elements?.map(element=>({...element,id:makeId()}))});
const pageAudio=(note:Notebook,pageId:string,nextPageId:string):AudioSession[]=>(note.audioSessions??[]).flatMap(session=>{const strokes=session.strokes.filter(x=>x.pageId===pageId).map(x=>({...x,pageId:nextPageId}));return strokes.length?[{...session,strokes}]:[]});
const appendAudio=(existing:AudioSession[],incoming:AudioSession[])=>incoming.reduce((all,next)=>{const index=all.findIndex(x=>x.uri===next.uri&&x.createdAt===next.createdAt);if(index<0)return[...all,next];const copy=[...all];const current=copy[index];if(current)copy[index]={...current,strokes:[...current.strokes,...next.strokes].filter((stroke,i,array)=>array.findIndex(x=>x.pageId===stroke.pageId&&x.createdAt===stroke.createdAt)===i)};return copy},existing);

export function duplicateNotebookPage(note:Notebook,pageId:string):Notebook{
 const index=note.pages.findIndex(page=>page.id===pageId),source=note.pages[index];if(!source)return note;
 const copy=clonePage(source),timestamp=now(),incomingAudio=pageAudio(note,source.id,copy.id);
 return{...note,pages:[...note.pages.slice(0,index+1),copy,...note.pages.slice(index+1)],audioSessions:appendAudio(note.audioSessions??[],incomingAudio),updatedAt:timestamp,pageOrderUpdatedAt:timestamp};
}

export function transferPage(notebooks:Notebook[],sourceId:string,pageId:string,targetId:string,mode:'copy'|'move'){
 const source=notebooks.find(n=>n.id===sourceId),target=notebooks.find(n=>n.id===targetId),page=source?.pages.find(p=>p.id===pageId);if(!source||!target||!page||sourceId===targetId)return notebooks;
 const transferred=mode==='copy'?clonePage(page):page;const incomingAudio=pageAudio(source,page.id,transferred.id);const timestamp=now();
 return notebooks.map(note=>{
  if(note.id===targetId){const deletedPages={...(note.deletedPages??{})};delete deletedPages[transferred.id];return{...note,pages:[...note.pages,transferred],deletedPages,audioSessions:appendAudio(note.audioSessions??[],incomingAudio),updatedAt:timestamp,pageOrderUpdatedAt:timestamp}}
  if(note.id!==sourceId||mode==='copy')return note;
  const remaining=note.pages.filter(p=>p.id!==page.id);return{...note,pages:remaining.length?remaining:[blankPage()],deletedPages:{...(note.deletedPages??{}),[page.id]:timestamp},audioSessions:note.audioSessions?.map(session=>({...session,strokes:session.strokes.filter(x=>x.pageId!==page.id)})),updatedAt:timestamp,pageOrderUpdatedAt:timestamp};
 });
}
