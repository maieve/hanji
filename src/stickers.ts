import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ImageElement,Sticker} from './types';

const KEY='hanji.stickers.v1';
export async function loadStickers():Promise<Sticker[]>{try{const raw=await AsyncStorage.getItem(KEY);const value=raw?JSON.parse(raw):[];return Array.isArray(value)?value.slice(0,100):[]}catch{return[]}}
export async function saveStickers(value:Sticker[]){await AsyncStorage.setItem(KEY,JSON.stringify(value.slice(0,100)))}
export function stickerFromImage(element:ImageElement):Sticker{return{id:`sticker-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:`스티커 ${new Date().toLocaleDateString('ko-KR')}`,uri:element.uri,width:element.width,height:element.height,fit:element.fit,rotation:element.rotation,createdAt:new Date().toISOString()}}
