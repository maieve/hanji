import type {Notebook} from './types';
export function resolveReferenceNotebook(items:Notebook[],referenceId:string|undefined,activeId:string){return items.find(item=>item.id===referenceId&&item.id!==activeId)}
export function clampReferencePage(index:number,pageCount:number){return Math.max(0,Math.min(Math.max(0,pageCount-1),Math.round(index)))}
