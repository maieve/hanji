import type {CanvasExtent,Page} from './types';
export const MAX_CANVAS_EXTENT=4;
export const DEFAULT_CANVAS_EXTENT:CanvasExtent={columns:1,rows:1};
export function normalizeCanvasExtent(value?:Partial<CanvasExtent>):CanvasExtent{return{columns:Math.max(1,Math.min(MAX_CANVAS_EXTENT,Math.round(value?.columns??1))),rows:Math.max(1,Math.min(MAX_CANVAS_EXTENT,Math.round(value?.rows??1)))}}
export function resizePageCanvas(page:Page,nextValue:Partial<CanvasExtent>):Page{
 const previous=normalizeCanvasExtent(page.canvasExtent),next=normalizeCanvasExtent(nextValue);
 if(page.pdfUri||previous.columns===next.columns&&previous.rows===next.rows)return page;
 const xScale=previous.columns/next.columns,yScale=previous.rows/next.rows;
 return{...page,canvasExtent:next,elements:page.elements?.map(item=>({...item,x:item.x*xScale,y:item.y*yScale,width:item.width*xScale,height:item.height*yScale})),updatedAt:new Date().toISOString()};
}
