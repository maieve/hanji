import type {Notebook} from './types';
import type {SearchHit} from './searchIndex';
let library:Notebook[]=[];
export async function rebuildSearchIndex(items:Notebook[]){library=items}
export async function searchLibrary(query:string):Promise<SearchHit[]>{
 const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return[];const hits:SearchHit[]=[];
 for(const note of library){const transcripts=(note.audioSessions??[]).map(session=>session.transcript??'').join(' ');for(const [pageIndex,page] of note.pages.entries()){const body=`${page.ocrText??''} ${pageIndex===0?transcripts:''}`.trim();const text=`${note.title} ${note.tags.join(' ')} ${body}`.toLocaleLowerCase();if(words.every(word=>text.includes(word)))hits.push({notebookId:note.id,pageId:page.id,pageIndex,snippet:body.slice(0,100)||note.title,rank:body?-1:0})}}
 return hits;
}
