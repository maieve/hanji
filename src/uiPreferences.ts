import AsyncStorage from '@react-native-async-storage/async-storage';
import type {PageTemplate} from './types';

const KEY='hanji.ui.preferences.v1';
export type UiPreferences={leftHanded:boolean;fingerDrawingEnabled:boolean;defaultTemplate:PageTemplate;autoDarkInk:boolean;backupRetention:number;newPagePlacement:'after-current'|'end'};
export const defaultUiPreferences:UiPreferences={leftHanded:false,fingerDrawingEnabled:false,defaultTemplate:'line',autoDarkInk:true,backupRetention:5,newPagePlacement:'after-current'};

export async function loadUiPreferences():Promise<UiPreferences>{
 try{const raw=await AsyncStorage.getItem(KEY);if(!raw)return defaultUiPreferences;const parsed={...defaultUiPreferences,...JSON.parse(raw)} as UiPreferences;return {...parsed,backupRetention:[3,5,10,20].includes(parsed.backupRetention)?parsed.backupRetention:defaultUiPreferences.backupRetention,newPagePlacement:['after-current','end'].includes(parsed.newPagePlacement)?parsed.newPagePlacement:defaultUiPreferences.newPagePlacement}}catch{return defaultUiPreferences}
}

export async function saveUiPreferences(value:UiPreferences){await AsyncStorage.setItem(KEY,JSON.stringify(value))}
