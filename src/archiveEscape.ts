import type {Notebook,Page} from './types';

export type EscapeCopy={notebookId:string;pdf?:string;pages:Record<string,string>;errors:string[]};

export const escapeRoot=(notebookId:string)=>`escape/${notebookId}`;
export const escapePdfPath=(notebookId:string)=>`${escapeRoot(notebookId)}/notebook.pdf`;
export const escapePngPath=(notebookId:string,pageIndex:number)=>`${escapeRoot(notebookId)}/pages/${String(pageIndex+1).padStart(4,'0')}.png`;
export const pageExportPayload=(page:Page,pageIndex:number)=>({drawingData:page.drawingData,pdfUri:page.pdfUri??'',pdfPageIndex:String(page.pdfPageIndex??pageIndex),template:page.template,templateSpacing:page.templateSpacing??'medium',backgroundColor:page.backgroundColor??'',backgroundOpacity:String(page.backgroundOpacity??0),rotation:String(page.rotation??0),canvasColumns:String(page.canvasExtent?.columns??1),canvasRows:String(page.canvasExtent?.rows??1),customTemplateUri:page.customTemplateUri??'',elements:JSON.stringify(page.elements??[])});
export const notebookExportPayload=(note:Notebook)=>note.pages.map(pageExportPayload);
export const isSupportedArchiveVersion=(value:unknown)=>value===2||value===3;
