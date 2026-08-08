import type {Notebook} from './types';

export function publicNotebookText(note:Notebook){return `${note.title} ${note.tags.join(' ')}`.trim()}
export function librarySearchMatches(note:Notebook,query:string,indexedHit:boolean){
 const needle=query.trim().toLocaleLowerCase();if(!needle)return true;
 if(note.locked)return publicNotebookText(note).toLocaleLowerCase().includes(needle);
 return indexedHit||`${publicNotebookText(note)} ${note.pages.map(page=>page.ocrText??'').join(' ')}`.toLocaleLowerCase().includes(needle);
}
export function mayRevealNotebookSnippet(note:Notebook){return !note.locked}
