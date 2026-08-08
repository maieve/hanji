import * as DocumentPicker from 'expo-document-picker';
import {Directory,File,Paths} from 'expo-file-system';

export async function pickPersistentImage():Promise<string|null>{
 const picked=await DocumentPicker.getDocumentAsync({type:'image/*',copyToCacheDirectory:true});const asset=picked.canceled?undefined:picked.assets[0];if(!asset)return null;
 const directory=new Directory(Paths.document,'Hanji','assets','images');if(!directory.exists)directory.create({intermediates:true,idempotent:true});
 const extension=(asset.name.split('.').pop()||'png').replace(/[^a-zA-Z0-9]/g,'');const output=new File(directory,`image-${Date.now()}-${Math.random().toString(36).slice(2,7)}.${extension}`);new File(asset.uri).copy(output);return output.uri;
}
