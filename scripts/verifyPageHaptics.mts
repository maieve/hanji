import assert from 'node:assert/strict';
import {shouldPlayPageHaptic} from '../src/pageHapticPolicy.ts';
assert.equal(shouldPlayPageHaptic(true,0,1),true);
assert.equal(shouldPlayPageHaptic(true,99,0),true);
assert.equal(shouldPlayPageHaptic(true,4,4),false);
assert.equal(shouldPlayPageHaptic(false,0,1),false);
assert.equal(shouldPlayPageHaptic(true,-1,0),false);
console.log('page haptic policy verification passed');
