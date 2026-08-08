import AsyncStorage from '@react-native-async-storage/async-storage';
import {File,Paths} from 'expo-file-system';

const KEY='hanji.cloudflare.v1';
export type CloudConfig={endpoint:string;token:string;enabled:boolean};
export type CloudBackup={key:string;name:string;size:number;uploaded:string;etag:string};
export const emptyCloudConfig:CloudConfig={endpoint:'https://hanji-sync.chaekgalpi.workers.dev',token:'',enabled:false};
const endpoint=(value:string)=>value.trim().replace(/\/+$/,'');
export async function loadCloudConfig():Promise<CloudConfig>{const raw=await AsyncStorage.getItem(KEY);try{return raw?{...emptyCloudConfig,...JSON.parse(raw)}:emptyCloudConfig}catch{return emptyCloudConfig}}
export async function saveCloudConfig(value:CloudConfig){await AsyncStorage.setItem(KEY,JSON.stringify({...value,endpoint:endpoint(value.endpoint)}))}
const headers=(config:CloudConfig)=>({authorization:`Bearer ${config.token}`});
export async function testCloudConnection(config:CloudConfig){const response=await fetch(`${endpoint(config.endpoint)}/health`,{headers:headers(config)});if(!response.ok)throw new Error(`연결 실패 (${response.status})`);return response.json()}
export async function uploadArchiveIfEnabled(uri:string,override?:CloudConfig){
 const config=override??await loadCloudConfig();if(!config.enabled||!config.endpoint||!config.token)return null;const file=new File(uri);const base=endpoint(config.endpoint);const auth={...headers(config),'x-hanji-device':'ipad'};
 if(file.size<=90_000_000){const response=await fetch(`${base}/v1/backups/${encodeURIComponent(file.name)}`,{method:'PUT',headers:{...auth,'content-type':'application/zip'},body:file as unknown as BodyInit});if(!response.ok)throw new Error(`클라우드 업로드 실패 (${response.status})`);return response.json()}
 const started=await fetch(`${base}/v1/multipart/start/${encodeURIComponent(file.name)}`,{method:'POST',headers:auth});if(!started.ok)throw new Error(`멀티파트 시작 실패 (${started.status})`);const {uploadId}=await started.json() as {uploadId:string};const completed:{partNumber:number;etag:string}[]=[];const chunk=20*1024*1024;
 try{for(let offset=0,partNumber=1;offset<file.size;offset+=chunk,partNumber++){const response=await fetch(`${base}/v1/multipart/part/${encodeURIComponent(file.name)}/${encodeURIComponent(uploadId)}/${partNumber}`,{method:'PUT',headers:auth,body:file.slice(offset,Math.min(offset+chunk,file.size))});if(!response.ok)throw new Error(`파트 ${partNumber} 업로드 실패 (${response.status})`);completed.push(await response.json() as {partNumber:number;etag:string})}const response=await fetch(`${base}/v1/multipart/complete/${encodeURIComponent(file.name)}/${encodeURIComponent(uploadId)}`,{method:'POST',headers:{...auth,'content-type':'application/json'},body:JSON.stringify({parts:completed})});if(!response.ok)throw new Error(`멀티파트 완료 실패 (${response.status})`);return response.json()}catch(error){await fetch(`${base}/v1/multipart/abort/${encodeURIComponent(file.name)}/${encodeURIComponent(uploadId)}`,{method:'DELETE',headers:auth}).catch(()=>undefined);throw error}
}
export async function listCloudBackups(config:CloudConfig){const response=await fetch(`${endpoint(config.endpoint)}/v1/backups`,{headers:headers(config)});if(!response.ok)throw new Error(`목록 조회 실패 (${response.status})`);return (await response.json() as {objects:CloudBackup[]}).objects}
export async function downloadCloudBackup(config:CloudConfig,backup:CloudBackup){const response=await fetch(`${endpoint(config.endpoint)}/v1/backups/${encodeURIComponent(backup.name)}`,{headers:headers(config)});if(!response.ok)throw new Error(`백업 다운로드 실패 (${response.status})`);const file=new File(Paths.cache,backup.name);if(file.exists)file.delete();file.create();file.write(new Uint8Array(await response.arrayBuffer()));return file.uri}
