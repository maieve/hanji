import type {PageElement} from './types';

export type SelectionRect={x:number;y:number;width:number;height:number};
export type ElementSelectionFilter={text:boolean;images:boolean};

export function selectElementIds(elements:PageElement[],rect:SelectionRect,filter:ElementSelectionFilter){
 return elements.filter(element=>{
  if(element.kind==='text'&&!filter.text)return false;
  if(element.kind==='image'&&!filter.images)return false;
  return element.x<rect.x+rect.width&&element.x+element.width>rect.x&&element.y<rect.y+rect.height&&element.y+element.height>rect.y;
 }).map(element=>element.id);
}
