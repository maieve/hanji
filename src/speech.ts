import {requireNativeModule} from 'expo-modules-core';
export type TranscriptResult={text:string;segments:{text:string;start:number;duration:number;confidence:number}[]};
const native=requireNativeModule<{transcribeAudio:(uri:string)=>Promise<TranscriptResult>}>('HanjiSpeech');
export const transcribeAudio=(uri:string)=>native.transcribeAudio(uri);
