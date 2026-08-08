import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [native,types,app,panel]=await Promise.all([
  readFile(new URL('../modules/hanji-canvas/ios/HanjiSpeechModule.swift',import.meta.url),'utf8'),
  readFile(new URL('../src/types.ts',import.meta.url),'utf8'),
  readFile(new URL('../src/HanjiApp.tsx',import.meta.url),'utf8'),
  readFile(new URL('../src/components/TranscriptPanel.tsx',import.meta.url),'utf8'),
]);
assert.match(native,/supportsOnDeviceRecognition[\s\S]*requiresOnDeviceRecognition = true/,'transcription must reject unsupported devices instead of using the network');
assert.match(native,/taskHint = \.dictation[\s\S]*sorted \{ \$0\.timestamp < \$1\.timestamp \}/,'dictation segments must be emitted in timestamp order');
assert.match(native,/guard !settled[\s\S]*averageConfidence[\s\S]*recognizedDuration[\s\S]*"onDevice": true/,'native transcription must settle once and return measurable on-device quality metadata');
assert.match(types,/transcriptAverageConfidence\?:number;transcriptRecognizedDuration\?:number;transcriptLocale\?:string;transcriptOnDevice\?:boolean/,'audio sessions must preserve transcription provenance and quality');
assert.match(app,/transcriptAverageConfidence: result\.averageConfidence[\s\S]*transcriptOnDevice: result\.onDevice/,'transcription quality metadata must persist with its session');
assert.match(panel,/평균 신뢰도[\s\S]*transcriptRecognizedDuration[\s\S]*style=\{s\.quality\}/,'the transcript panel must show quality and duration accessibly');
console.log('on-device transcript policy verification passed');
