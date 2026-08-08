import {Directory,File,Paths} from 'expo-file-system';
import {requireNativeModule} from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import type {Notebook,Page} from './types';
import {pageExportPayload} from './archiveEscape';
import {FLASHCARD_SPLIT_RATIO} from './flashcardTemplate';
const native=requireNativeModule('HanjiVision');
const safe=(value:string)=>value.replace(/[\\/:*?"<>|]/g,'-').slice(0,80)||'Hanji';
export async function exportNotebookPdf(note:Notebook){
  const file=new File(Paths.cache,`${safe(note.title)}-${new Date().toISOString().slice(0,10)}.pdf`);
  if(file.exists)file.delete();
  await native.exportPDF(note.pages.map(pageExportPayload),file.uri);
  await Sharing.shareAsync(file.uri,{mimeType:'application/pdf',dialogTitle:`${note.title} PDF 내보내기`});
  return file.uri;
}
export async function exportPagePng(note:Notebook,page:Page,pageIndex:number){
  const file=new File(Paths.cache,`${safe(note.title)}-${pageIndex+1}.png`);if(file.exists)file.delete();
  await native.exportPNG(pageExportPayload(page,pageIndex),file.uri);
  await Sharing.shareAsync(file.uri,{mimeType:'image/png',dialogTitle:`${note.title} ${pageIndex+1}페이지 PNG 내보내기`});return file.uri;
}
export async function createPageFlashcardAssets(page:Page,pageIndex:number,splitRatio=FLASHCARD_SPLIT_RATIO){
  const directory=new Directory(Paths.document,'Hanji','assets','flashcards');if(!directory.exists)directory.create({intermediates:true,idempotent:true});
  const stamp=`${page.id}-${Date.now()}`,source=new File(Paths.cache,`${stamp}-page.png`),question=new File(directory,`${stamp}-q.png`),answer=new File(directory,`${stamp}-a.png`);
  for(const file of [source,question,answer])if(file.exists)file.delete();
  try{
    await native.exportPNG(pageExportPayload(page,pageIndex),source.uri);
    return await native.splitPNG(source.uri,question.uri,answer.uri,splitRatio) as {questionUri:string;answerUri:string};
  }catch(error){for(const file of [question,answer])if(file.exists)file.delete();throw error}
  finally{if(source.exists)source.delete()}
}
