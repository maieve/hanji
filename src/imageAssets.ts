import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';
import {requireNativeModule} from 'expo-modules-core';
import {templateAssetKind} from './templateImport';

const native=requireNativeModule('HanjiVision');

function assetDirectory(name:'images'|'templates'){
 const directory=new Directory(Paths.document,'Hanji','assets',name);if(!directory.exists)directory.create({intermediates:true,idempotent:true});return directory;
}

export async function pickPersistentImage():Promise<string|null>{
 const picked=await DocumentPicker.getDocumentAsync({type:'image/*',copyToCacheDirectory:true});const asset=picked.canceled?undefined:picked.assets[0];if(!asset)return null;
 const directory=assetDirectory('images');
 const extension=(asset.name.split('.').pop()||'png').replace(/[^a-zA-Z0-9]/g,'');const output=new File(directory,`image-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${extension}`);new File(asset.uri).copy(output);return output.uri;
}

export async function pickPersistentTemplate():Promise<string|null>{
 const picked=await DocumentPicker.getDocumentAsync({type:['image/*','application/pdf'],copyToCacheDirectory:true});const asset=picked.canceled?undefined:picked.assets[0];if(!asset)return null;
 const kind=templateAssetKind(asset);if(kind==='unsupported')throw new Error('PNG, JPEG, HEIC 또는 단일 페이지 PDF만 사용할 수 있습니다.');
 const directory=assetDirectory('templates'),stamp=`template-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
 if(kind==='pdf'){
  const output=new File(directory,`${stamp}.png`);if(output.exists)output.delete();
  await native.renderPDFTemplate(asset.uri,output.uri);return output.uri;
 }
 const extension=(asset.name.split('.').pop()||'png').replace(/[^a-zA-Z0-9]/g,'');const output=new File(directory,`${stamp}.${extension}`);new File(asset.uri).copy(output);return output.uri;
}
