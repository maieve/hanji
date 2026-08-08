import type {Notebook} from './types';
export type LibrarySort='updated'|'title'|'created'|'pages';
export type LibraryViewMode='grid'|'list';
export function sortNotebooks(items:Notebook[],sort:LibrarySort,recent=false){return [...items].sort((a,b)=>{
 if(recent)return(b.lastOpenedAt??'').localeCompare(a.lastOpenedAt??'')||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='title')return a.title.localeCompare(b.title,'ko',{numeric:true,sensitivity:'base'})||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='created')return b.createdAt.localeCompare(a.createdAt)||b.updatedAt.localeCompare(a.updatedAt);
 if(sort==='pages')return b.pages.length-a.pages.length||b.updatedAt.localeCompare(a.updatedAt);
 return b.updatedAt.localeCompare(a.updatedAt);
})}
