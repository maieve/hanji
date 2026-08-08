import {openDatabaseAsync,type SQLiteDatabase} from 'expo-sqlite';
import type {Notebook} from './types';

export type SearchHit={notebookId:string;pageId:string;pageIndex:number;snippet:string;rank:number};
let database:Promise<SQLiteDatabase>|undefined;
let rebuildQueue:Promise<void>=Promise.resolve();
async function db(){
  database??=openDatabaseAsync('hanji-index.db').then(async value=>{
    await value.execAsync("PRAGMA journal_mode=WAL; CREATE VIRTUAL TABLE IF NOT EXISTS page_search USING fts5(notebookId UNINDEXED,pageId UNINDEXED,pageIndex UNINDEXED,title,tags,body,tokenize='unicode61');");
    return value;
  });
  return database;
}
async function performRebuild(items:Notebook[]){
  const value=await db();
  await value.withTransactionAsync(async()=>{
    await value.runAsync('DELETE FROM page_search');
    for(const note of items){const transcripts=(note.audioSessions??[]).map(session=>session.transcript??'').join(' ');for(const [pageIndex,page] of note.pages.entries())await value.runAsync('INSERT INTO page_search(notebookId,pageId,pageIndex,title,tags,body) VALUES(?,?,?,?,?,?)',note.id,page.id,pageIndex,note.title,note.tags.join(' '),`${page.ocrText??''} ${pageIndex===0?transcripts:''}`.trim());}
  });
}
export function rebuildSearchIndex(items:Notebook[]){const task=rebuildQueue.catch(()=>undefined).then(()=>performRebuild(items));rebuildQueue=task.then(()=>undefined,()=>undefined);return task}
export async function searchLibrary(query:string):Promise<SearchHit[]>{
  const tokens=query.trim().split(/\s+/).filter(Boolean).map(token=>`"${token.replace(/"/g,'""')}"*`);if(!tokens.length)return[];
  const value=await db();
  return value.getAllAsync<SearchHit>("SELECT notebookId,pageId,CAST(pageIndex AS INTEGER) pageIndex,snippet(page_search,5,'<b>','</b>',' … ',18) snippet,bm25(page_search,5.0,2.0,1.0) rank FROM page_search WHERE page_search MATCH ? ORDER BY rank LIMIT 100",tokens.join(' '));
}
