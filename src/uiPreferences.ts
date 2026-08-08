import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY='hanji.ui.preferences.v1';
export type UiPreferences={leftHanded:boolean};
export const defaultUiPreferences:UiPreferences={leftHanded:false};

export async function loadUiPreferences():Promise<UiPreferences>{
 try{const raw=await AsyncStorage.getItem(KEY);return raw?{...defaultUiPreferences,...JSON.parse(raw)}:defaultUiPreferences}catch{return defaultUiPreferences}
}

export async function saveUiPreferences(value:UiPreferences){await AsyncStorage.setItem(KEY,JSON.stringify(value))}
