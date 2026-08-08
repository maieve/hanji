import type {Notebook,Page} from './types';

export type EscapeCopy={notebookId:string;pdf?:string;pages:Record<string,string>;strokes:Record<string,string>;errors:string[]};

export const escapeRoot=(notebookId:string)=>`escape/${notebookId}`;
export const escapePdfPath=(notebookId:string)=>`${escapeRoot(notebookId)}/notebook.pdf`;
export const escapePngPath=(notebookId:string,pageIndex:number)=>`${escapeRoot(notebookId)}/pages/${String(pageIndex+1).padStart(4,'0')}.png`;
export const escapeStrokePath=(notebookId:string,pageIndex:number)=>`${escapeRoot(notebookId)}/strokes/${String(pageIndex+1).padStart(4,'0')}.json`;
export const pageExportPayload=(page:Page,pageIndex:number)=>({drawingData:page.drawingData,pdfUri:page.pdfUri??'',pdfPageIndex:String(page.pdfPageIndex??pageIndex),template:page.template,templateSpacing:page.templateSpacing??'medium',backgroundColor:page.backgroundColor??'',backgroundColor2:page.backgroundColor2??'',backgroundGradientDirection:page.backgroundGradientDirection??'vertical',backgroundOpacity:String(page.backgroundOpacity??0),rotation:String(page.rotation??0),canvasColumns:String(page.canvasExtent?.columns??1),canvasRows:String(page.canvasExtent?.rows??1),customTemplateUri:page.customTemplateUri??'',elements:JSON.stringify(page.elements??[]),viewportX:String(page.drawingViewport?.x??0),viewportY:String(page.drawingViewport?.y??0),viewportWidth:String(page.drawingViewport?.width??page.drawingViewport?.canvasWidth??900),viewportHeight:String(page.drawingViewport?.height??page.drawingViewport?.canvasHeight??636),canvasWidth:String(page.drawingViewport?.canvasWidth??900),canvasHeight:String(page.drawingViewport?.canvasHeight??636)});
export const notebookExportPayload=(note:Notebook)=>note.pages.map(pageExportPayload);
export const isSupportedArchiveVersion=(value:unknown)=>value===2||value===3||value===4;
export function fallbackStrokeDump(drawingData:string){
  const drawing=drawingData.trim();
  if(!drawing)return JSON.stringify({format:'hanji-strokes',version:1,coordinateSpace:'page-points',strokes:[]},null,2);
  if(!drawing.startsWith('['))return null;
  return JSON.stringify({format:'hanji-web-strokes',version:1,coordinateSpace:'normalized-page',strokes:JSON.parse(drawing)},null,2);
}
