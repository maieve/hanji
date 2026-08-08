import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import type {Notebook} from './types';
import {normalizeBackupRetention} from './backupPolicy';

type ArchiveManifest={format:'hanji-archive';version:2;createdAt:string;assets:Record<string,string>};
const clean=(value:string)=>value.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-90)||'asset';
const bytes=async(uri:string)=>new File(uri).bytes();

export async function exportLibrary(items:Notebook[]){
  const zip=new JSZip(); const assets:Record<string,string>={}; let assetIndex=0;
  const addAsset=async(uri:string,folder:string)=>{if(!uri||assets[uri])return;try{const path=`assets/${folder}/${assetIndex++}-${clean(decodeURIComponent(uri.split('/').pop()||'asset'))}`;zip.file(path,await bytes(uri));assets[uri]=path}catch{}};
  for(const note of items){
    for(const page of note.pages){
      if(page.pdfUri)await addAsset(page.pdfUri,'pdf');
      if(page.customTemplateUri)await addAsset(page.customTemplateUri,'template');
      for(const element of page.elements??[])if(element.kind==='image')await addAsset(element.uri,'image');
      if(page.drawingData){const path=`notebooks/${note.id}/pages/${page.id}.${page.drawingData.trimStart().startsWith('[')?'drawing.json':'pkdrawing'}`;zip.file(path,page.drawingData.trimStart().startsWith('[')?page.drawingData:page.drawingData,{base64:!page.drawingData.trimStart().startsWith('[')});}
    }
    for(const audio of note.audioSessions??[])await addAsset(audio.uri,'audio');
  }
  const manifest:ArchiveManifest={format:'hanji-archive',version:2,createdAt:new Date().toISOString(),assets};
  zip.file('manifest.json',JSON.stringify(manifest,null,2));zip.file('library.json',JSON.stringify(items,null,2));
  const output=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}});
  const file=new File(Paths.cache,`hanji-backup-${new Date().toISOString().replace(/[:.]/g,'-')}.hanji`);if(file.exists)file.delete();file.create();file.write(output);
  await Sharing.shareAsync(file.uri,{mimeType:'application/zip',dialogTitle:'Hanji 원본 백업 내보내기'});return file.uri;
}

export async function writeAutomaticBackup(items:Notebook[],keep=5,minIntervalMs=30*60*1000){
  if(!items.length)return null;
  const retention=normalizeBackupRetention(keep);
  const directory=new Directory(Paths.document,'Hanji','backups');if(!directory.exists)directory.create({intermediates:true,idempotent:true});
  const existing=directory.list().filter((entry):entry is File=>entry instanceof File&&entry.extension==='.hanji').sort((a,b)=>(b.modificationTime??0)-(a.modificationTime??0));
  if(existing[0]?.modificationTime&&Date.now()-existing[0].modificationTime<minIntervalMs){for(const old of existing.slice(retention))if(old.exists)old.delete();return null;}
  const zip=new JSZip();const assets:Record<string,string>={};let assetIndex=0;
  const addAsset=async(uri:string,folder:string)=>{if(!uri||assets[uri])return;try{const archived=`assets/${folder}/${assetIndex++}-${clean(decodeURIComponent(uri.split('/').pop()||'asset'))}`;zip.file(archived,await bytes(uri));assets[uri]=archived}catch{}};
  for(const note of items){for(const page of note.pages){if(page.pdfUri)await addAsset(page.pdfUri,'pdf');if(page.customTemplateUri)await addAsset(page.customTemplateUri,'template');for(const element of page.elements??[])if(element.kind==='image')await addAsset(element.uri,'image');if(page.drawingData){const json=page.drawingData.trimStart().startsWith('[');zip.file(`notebooks/${note.id}/pages/${page.id}.${json?'drawing.json':'pkdrawing'}`,page.drawingData,{base64:!json})}}for(const audio of note.audioSessions??[])await addAsset(audio.uri,'audio')}
  zip.file('manifest.json',JSON.stringify({format:'hanji-archive',version:2,createdAt:new Date().toISOString(),assets},null,2));zip.file('library.json',JSON.stringify(items,null,2));
  const file=new File(directory,`hanji-auto-${new Date().toISOString().replace(/[:.]/g,'-')}.hanji`);file.create();file.write(await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:6}}));
  const all=[file,...existing].sort((a,b)=>(b.modificationTime??0)-(a.modificationTime??0));for(const old of all.slice(retention))if(old.exists)old.delete();return file.uri;
}
export async function importLibraryBackup():Promise<Notebook[]|null>{
  const picked=await DocumentPicker.getDocumentAsync({type:['application/zip','application/octet-stream','application/json'],copyToCacheDirectory:true});if(picked.canceled||!picked.assets[0])return null;
  return importLibraryBackupFromUri(picked.assets[0].uri);
}
export async function importLibraryBackupFromUri(uri:string):Promise<Notebook[]>{
  const source=new File(uri);const zip=await JSZip.loadAsync(await source.bytes());
  const manifestFile=zip.file('manifest.json');const libraryFile=zip.file('library.json');if(!manifestFile||!libraryFile)throw new Error('올바른 Hanji 백업 파일이 아닙니다.');
  const manifest=JSON.parse(await manifestFile.async('string')) as ArchiveManifest;if(manifest.format!=='hanji-archive')throw new Error('지원하지 않는 Hanji 백업입니다.');
  const restored=JSON.parse(await libraryFile.async('string')) as Notebook[];
  const root=new Directory(Paths.document,'Hanji','restored',String(Date.now()));root.create({intermediates:true});
  const uriMap:Record<string,string>={};
  for(const [oldUri,path] of Object.entries(manifest.assets)){const entry=zip.file(path);if(!entry)continue;const file=new File(root,clean(path.split('/').pop()||'asset'));file.create();file.write(await entry.async('uint8array'));uriMap[oldUri]=file.uri;}
  return restored.map(note=>({...note,pages:note.pages.map((page,index)=>({...page,pdfUri:page.pdfUri?uriMap[page.pdfUri]??page.pdfUri:undefined,pdfPageIndex:page.pdfUri?(page.pdfPageIndex??index):undefined,customTemplateUri:page.customTemplateUri?uriMap[page.customTemplateUri]??page.customTemplateUri:undefined,elements:page.elements?.map(element=>element.kind==='image'?{...element,uri:uriMap[element.uri]??element.uri}:element)})),audioSessions:note.audioSessions?.map(audio=>({...audio,uri:uriMap[audio.uri]??audio.uri}))}));
}
