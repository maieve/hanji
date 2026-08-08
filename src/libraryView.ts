import type {Notebook} from './types';
export type LibrarySort='updated'|'title'|'created'|'pages';
export type LibraryViewMode='grid'|'list';
const TAG_SELECTION_PREFIX='__tag__:';
export const libraryTagSelectionKey=(tag:string)=>`${TAG_SELECTION_PREFIX}${tag}`;
export const libraryTagFromSelection=(value:string)=>value.startsWith(TAG_SELECTION_PREFIX)?value.slice(TAG_SELECTION_PREFIX.length):undefined;
export function libraryTags(items:Notebook[]){return[...new Set(items.flatMap(note=>note.tags.map(tag=>tag.trim())).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'))}
export function latestOpenedAt(a?:string,b?:string){return[a,b].filter((value):value is string=>Boolean(value)).sort().at(-1)}
export function markNotebookOpened(items:Notebook[],id:string,openedAt:string){
 const index=items.findIndex(item=>item.id===id);if(index<0)return items;
 return items.map((item,position)=>position===index?{...item,lastOpenedAt:openedAt}:item);
}
export function sortNotebooks(items:Notebook[],sort:LibrarySort,recent=false){return [...items].sort((a,b)=>{
 if(recent)return(b.lastOpenedAt??'').localeCompare(a.lastOpenedAt??'')||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='title')return a.title.localeCompare(b.title,'ko',{numeric:true,sensitivity:'base'})||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='created')return b.createdAt.localeCompare(a.createdAt)||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='pages')return b.pages.length-a.pages.length||b.updatedAt.localeCompare(a.updatedAt);
 return b.updatedAt.localeCompare(a.updatedAt);
})}
