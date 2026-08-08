import {requireNativeModule} from 'expo-modules-core';
type Result={text:string;words:{text:string;confidence:number;x:number;y:number;width:number;height:number;coordinateSpace?:'canvas'}[];lineCount?:number;averageConfidence?:number;recognitionRevision?:number};
const module=requireNativeModule('HanjiVision');
export async function recognizeDrawing(data:string):Promise<Result>{return module.recognizeDrawing(data)}
export async function isLowPowerModeEnabled():Promise<boolean>{return module.isLowPowerModeEnabled()}
