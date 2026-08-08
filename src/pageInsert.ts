import type {Page} from './types';

export function insertPage(pages:Page[],created:Page,activeIndex:number,placement:'after-current'|'end'){
 const index=placement==='end'?pages.length:Math.max(0,Math.min(pages.length,activeIndex+1));
 return {pages:[...pages.slice(0,index),created,...pages.slice(index)],index};
}
