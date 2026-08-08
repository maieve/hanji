import {requireNativeModule} from 'expo-modules-core';

const native=requireNativeModule<{pickColor:(initialHex:string)=>Promise<string>}>('HanjiColorPicker');
export const pickColor=(initialHex:string)=>native.pickColor(initialHex);
