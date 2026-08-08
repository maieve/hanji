import AsyncStorage from '@react-native-async-storage/async-storage';
import {File} from 'expo-file-system';

const KEY='hanji.cloudflare.v1';
export type CloudConfig={endpoint:string;token:string;enabled:boolean};
export type CloudBackup={key:string;name:string;size:number;uploaded:string;etag:string};
export const emptyCloudConfig:CloudConfig={endpoint:'',token:'',enabled:false};
const endpoint=(value:string)=>value.trim().replace(/\/+$/,'');
export async function loadCloudConfig():Promise<CloudConfig>{const raw=await AsyncStorage.getItem(KEY);try{return raw?{...emptyCloudConfig,...JSON.parse(raw)}:emptyCloudConfig}catch{return emptyCloudConfig}}
export async function saveCloudConfig(value:CloudConfig){await AsyncStorage.setItem(KEY,JSON.stringify({...value,endpoint:endpoint(value.endpoint)}))}
const headers=(config:CloudConfig)=>({authorization:`Bearer ${config.token}`});
export async function testCloudConnection(config:CloudConfig){const response=await fetch(`${endpoint(config.endpoint)}/health`,{headers:headers(config)});if(!response.ok)throw new Error(`연결 실패 (${response.status})`);return response.json()}
export async function uploadArchiveIfEnabled(uri:string,override?:CloudConfig){const config=override??await loadCloudConfig();if(!config.enabled||!config.endpoint||!config.token)return null;const file=new File(uri);if(file.size>100_000_000)throw new Error('Cloudflare 단일 백업 한도는 100MB입니다.');const response=await fetch(`${endpoint(config.endpoint)}/v1/backups/${encodeURIComponent(file.name)}`,{method:'PUT',headers:{...headers(config),'content-type':'application/zip','x-hanji-device':'ipad'},body:file as unknown as BodyInit});if(!response.ok)throw new Error(`클라우드 업로드 실패 (${response.status})`);return response.json()}
export async function listCloudBackups(config:CloudConfig){const response=await fetch(`${endpoint(config.endpoint)}/v1/backups`,{headers:headers(config)});if(!response.ok)throw new Error(`목록 조회 실패 (${response.status})`);return (await response.json() as {objects:CloudBackup[]}).objects}
