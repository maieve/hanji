import type {Notebook} from './types';
import type {SearchHit} from './searchIndex';
import {searchIndexRows} from './searchIndexRows.ts';
let library:Notebook[]=[];let rebuildQueue:Promise<void>=Promise.resolve();
export function rebuildSearchIndex(items:Notebook[]){const task=rebuildQueue.catch(()=>undefined).then(()=>{library=items});rebuildQueue=task.then(()=>undefined,()=>undefined);return task}
export async function searchLibrary(query:string):Promise<SearchHit[]>{
 const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return[];const hits:SearchHit[]=[];
 for(const row of searchIndexRows(library)){const text=`${row.title} ${row.tags} ${row.body}`.toLocaleLowerCase();if(words.every(word=>text.includes(word)))hits.push({notebookId:row.notebookId,pageId:row.pageId,pageIndex:row.pageIndex,snippet:row.body.slice(0,100)||row.title,rank:row.body?-1:0})}
 return hits;
}
