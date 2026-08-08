import assert from 'node:assert/strict';
import {freeformLassoSelectsPath,pointInLasso} from '../src/lassoPolicy.ts';
const polygon=[{x:0,y:0},{x:100,y:0},{x:80,y:80},{x:20,y:100}];
assert.equal(pointInLasso({x:50,y:50},polygon),true);assert.equal(pointInLasso({x:110,y:50},polygon),false);
assert.equal(freeformLassoSelectsPath([{x:120,y:20},{x:40,y:40}],polygon),true);
assert.equal(freeformLassoSelectsPath([{x:120,y:20},{x:140,y:40}],polygon),false);
assert.equal(freeformLassoSelectsPath([{x:10,y:10}],polygon.slice(0,2)),false);
console.log('lasso policy verification passed');
