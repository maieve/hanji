import {File,Paths} from 'expo-file-system';
import {requireNativeModule} from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import type {Notebook,Page} from './types';
const native=requireNativeModule('HanjiVision');
const safe=(value:string)=>value.replace(/[\\/:*?"<>|]/g,'-').slice(0,80)||'Hanji';
export async function exportNotebookPdf(note:Notebook){
  const file=new File(Paths.cache,`${safe(note.title)}-${new Date().toISOString().slice(0,10)}.pdf`);
  if(file.exists)file.delete();
  await native.exportPDF(note.pages.map((page,index)=>({drawingData:page.drawingData,pdfUri:page.pdfUri??'',pdfPageIndex:String(page.pdfPageIndex??index),template:page.template,backgroundColor:page.backgroundColor??'',backgroundOpacity:String(page.backgroundOpacity??0),rotation:String(page.rotation??0),customTemplateUri:page.customTemplateUri??'',elements:JSON.stringify(page.elements??[])})),file.uri);
  await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:`${note.title} PDF 내보내기`});
  return file.uri;
}
export async function exportPagePng(note:Notebook,page:Page,pageIndex:number){
  const file=new File(Paths.cache,`${safe(note.title)}-${pageIndex+1}.png`);if(file.exists)file.delete();
  await native.exportPNG({drawingData:page.drawingData,pdfUri:page.pdfUri??'',pdfPageIndex:String(page.pdfPageIndex??pageIndex),template:page.template,backgroundColor:page.backgroundColor??'',backgroundOpacity:String(page.backgroundOpacity??0),rotation:String(page.rotation??0),customTemplateUri:page.customTemplateUri??'',elements:JSON.stringify(page.elements??[])},file.uri);
  await Sharing.shareAsync(file.uri,{mimeType:'image/png',dialogTitle:`${note.title} ${pageIndex+1}페이지 PNG 내보내기`});return file.uri;
}
