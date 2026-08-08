import {mergeCloudRestore} from '../src/cloudMerge.ts';
import type {Notebook,Page} from '../src/types.ts';

const page=(id:string,drawingData:string,updatedAt:string):Page=>({id,drawingData,template:'line',updatedAt});
const note=(pages:Page[],updatedAt:string):Notebook=>({id:'n1',title:'N',folder:'F',tags:[],favorite:false,createdAt:'2026-01-01',updatedAt,pages});
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};

const local=note([page('p1','local-newer','2026-01-03'),page('p2','local-older','2026-01-01')],'2026-01-03');
const remote=note([page('p1','remote-older','2026-01-02'),page('p2','remote-newer','2026-01-04'),page('p3','remote-only','2026-01-04')],'2026-01-04');
const merged=mergeCloudRestore([local],[remote]);
const primary=merged.find(item=>item.id==='n1');
const conflict=merged.find(item=>item.conflictOf==='n1');

assert(primary?.pages.find(item=>item.id==='p1')?.drawingData==='local-newer','local newer page must win');
assert(primary?.pages.find(item=>item.id==='p2')?.drawingData==='remote-newer','remote newer page must win');
assert(primary?.pages.some(item=>item.id==='p3'),'one-sided page must survive union');
assert(conflict?.pages.length===2,'only the two divergent losing pages belong in the conflict copy');
assert(conflict?.pages.every(item=>item.id.includes('-conflict-')),'conflict pages need fresh ids');

const deduped=mergeCloudRestore(merged,[remote]);
assert(deduped.filter(item=>item.conflictOf==='n1').length===1,'restoring the same archive must not duplicate conflicts');
console.log('cloud merge verification passed');
