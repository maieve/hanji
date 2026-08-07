import {File,Paths} from 'expo-file-system';
import {requireNativeModule} from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import type {Notebook} from './types';
const native=requireNativeModule('HanjiVision');
const safe=(value:string)=>value.replace(/[\\/:*?"<>|]/g,'-').slice(0,80)||'Hanji';
export async function exportNotebookPdf(note:Notebook){
  const file=new File(Paths.cache,`${safe(note.title)}-${new Date().toISOString().slice(0,10)}.pdf`);
  if(file.exists)file.delete();
  await native.exportPDF(note.pages.map((page,index)=>({drawingData:page.drawingData,pdfUri:page.pdfUri??'',pdfPageIndex:String(index),template:page.template})),file.uri);
  await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:`${note.title} PDF 내보내기`});
  return file.uri;
}