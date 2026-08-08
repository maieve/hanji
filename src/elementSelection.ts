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

export function moveSelectedElements(elements:PageElement[],ids:ReadonlySet<string>,dx:number,dy:number){
 return elements.map(element=>ids.has(element.id)?{...element,x:Math.max(0,Math.min(1-element.width,element.x+dx)),y:Math.max(0,Math.min(1-element.height,element.y+dy))}:element);
}
