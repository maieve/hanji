import assert from 'node:assert/strict';
import { summarizeNativeAvailability } from '../src/nativeDiagnosticPolicy.ts';

assert.deepEqual(summarizeNativeAvailability(Array.from({length:5},()=>({available:true}))),{available:5,total:5,ready:true});
assert.deepEqual(summarizeNativeAvailability([{available:true},{available:false},{available:true}]),{available:2,total:3,ready:false});
assert.deepEqual(summarizeNativeAvailability([]),{available:0,total:0,ready:false});
console.log('native diagnostics verification passed');
