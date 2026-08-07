import {requireNativeModule} from 'expo-modules-core';
type Result={text:string;words:{text:string;confidence:number;x:number;y:number;width:number;height:number}[]};
const module=requireNativeModule('HanjiVision');
export async function recognizeDrawing(data:string):Promise<Result>{return module.recognizeDrawing(data)}
