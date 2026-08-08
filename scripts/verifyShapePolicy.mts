import assert from 'node:assert/strict';
import {SHAPE_HOLD_MS,shouldSnapShape} from '../src/shapePolicy.ts';
assert.equal(SHAPE_HOLD_MS,350);
assert.equal(shouldSnapShape(true,true),true);
assert.equal(shouldSnapShape(true,false),false);
assert.equal(shouldSnapShape(false,false),true);
assert.equal(shouldSnapShape(false,true),true);
console.log('shape hold policy verification passed');
