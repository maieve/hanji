import assert from 'node:assert/strict';
import {deleteFolderPaths,renameFolderPaths,replaceFolderRoot} from '../src/folders.ts';

assert.equal(replaceFolderRoot('업무/2026/회의','업무/2026','업무/올해'),'업무/올해/회의');
assert.equal(replaceFolderRoot('개인','업무','기록'),'개인');
assert.deepEqual(renameFolderPaths(['업무','업무/2026','업무/2026/회의','개인'],'업무/2026','올해'),['개인','업무','업무/올해','업무/올해/회의']);
assert.deepEqual(deleteFolderPaths(['업무','업무/2026','업무/2026/회의','개인'],'업무/2026'),['개인','업무','업무/회의']);
assert.deepEqual(deleteFolderPaths(['업무','업무/회의','개인'],'업무'),['개인','회의']);
assert.deepEqual(deleteFolderPaths(['업무','업무/회의','개인'],'업무','내 노트'),['개인','내 노트','내 노트/회의']);
console.log('folder path verification passed');
