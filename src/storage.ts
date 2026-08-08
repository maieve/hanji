import AsyncStorage from '@react-native-async-storage/async-storage';
import type {Notebook,Page} from './types';
import {expandFolderPaths} from './folders';
const KEY='hanji.library.v2'; const CATEGORY_KEY='hanji.categories.v1';
export const makeId=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`; const now=()=>new Date().toISOString();
export function blankPage():Page{return{id:makeId(),drawingData:'',template:'line',updatedAt:now()}}
export function newNotebook(title='제목 없는 노트'):Notebook{const t=now();return{id:makeId(),title,folder:'내 노트',tags:[],favorite:false,createdAt:t,updatedAt:t,pages:[blankPage()]}}
export function pdfNotebook(name:string,uri:string):Notebook{const n=newNotebook(name.replace(/\.pdf$/i,''));n.pages=[{...blankPage(),template:'plain',pdfUri:uri,pdfName:name}];return n}
export async function loadLibrary():Promise<Notebook[]>{const raw=await AsyncStorage.getItem(KEY)??await AsyncStorage.getItem('hanji.library.v1');try{return raw?JSON.parse(raw):[]}catch{return[]}}
export async function saveLibrary(v:Notebook[]){await AsyncStorage.setItem(KEY,JSON.stringify(v))}
export async function loadCategories():Promise<string[]>{const raw=await AsyncStorage.getItem(CATEGORY_KEY);try{return expandFolderPaths(raw?JSON.parse(raw):['내 노트','업무','스터디','개인'])}catch{return['내 노트','업무','스터디','개인']}}
export async function saveCategories(v:string[]){await AsyncStorage.setItem(CATEGORY_KEY,JSON.stringify(expandFolderPaths(v)))}
