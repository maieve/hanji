import type {Notebook} from './types';
import type {SearchHit} from './searchIndex';
let library:Notebook[]=[];
export async function rebuildSearchIndex(items:Notebook[]){library=items}
export async function searchLibrary(query:string):Promise<SearchHit[]>{
 const words=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);if(!words.length)return[];const hits:SearchHit[]=[];
 for(const note of library)for(const [pageIndex,page] of note.pages.entries()){const text=`${note.title} ${note.tags.join(' ')} ${page.ocrText??''}`.toLocaleLowerCase();if(words.every(word=>text.includes(word)))hits.push({notebookId:note.id,pageId:page.id,pageIndex,snippet:page.ocrText?.slice(0,100)??note.title,rank:page.ocrText?-1:0})}
 return hits;
}
