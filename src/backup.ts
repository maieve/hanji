import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import JSZip from 'jszip';
import type {Notebook} from './types';

type ArchiveManifest={format:'hanji-archive';version:2;createdAt:string;assets:Record<string,string>};
const clean=(value:string)=>value.replace(/[^a-zA-Z0-9._-]/g,'-').slice(-90)||'asset';
const bytes=async(uri:string)=>new File(uri).bytes();

export async function exportLibrary(items:Notebook[]){
  const zip=new JSZip(); const assets:Record<string,string>={}; let assetIndex=0;
  const addAsset=async(uri:string,folder:string)=>{if(!uri||assets[uri])return;try{const path=`assets/${folder}/${assetIndex++}-${clean(decodeURIComponent(uri.split('/').pop()||'asset'))}`;zip.file(path,await bytes(uri));assets[uri]=path}catch{}};
  for(const note of items){
    for(const page of note.pages){
      if(page.pdfUri)await addAsset(page.pdfUri,'pdf');
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

export async function importLibraryBackup():Promise<Notebook[]|null>{
  const picked=await DocumentPicker.getDocumentAsync({type:['application/zip','application/octet-stream','application/json'],copyToCacheDirectory:true});if(picked.canceled||!picked.assets[0])return null;
  const source=new File(picked.assets[0].uri);const zip=await JSZip.loadAsync(await source.bytes());
  const manifestFile=zip.file('manifest.json');const libraryFile=zip.file('library.json');if(!manifestFile||!libraryFile)throw new Error('올바른 Hanji 백업 파일이 아닙니다.');
  const manifest=JSON.parse(await manifestFile.async('string')) as ArchiveManifest;if(manifest.format!=='hanji-archive')throw new Error('지원하지 않는 Hanji 백업입니다.');
  const restored=JSON.parse(await libraryFile.async('string')) as Notebook[];
  const root=new Directory(Paths.document,'Hanji','restored',String(Date.now()));root.create({intermediates:true});
  const uriMap:Record<string,string>={};
  for(const [oldUri,path] of Object.entries(manifest.assets)){const entry=zip.file(path);if(!entry)continue;const file=new File(root,clean(path.split('/').pop()||'asset'));file.create();file.write(await entry.async('uint8array'));uriMap[oldUri]=file.uri;}
  return restored.map(note=>({...note,pages:note.pages.map(page=>({...page,pdfUri:page.pdfUri?uriMap[page.pdfUri]??page.pdfUri:undefined})),audioSessions:note.audioSessions?.map(audio=>({...audio,uri:uriMap[audio.uri]??audio.uri}))}));
}