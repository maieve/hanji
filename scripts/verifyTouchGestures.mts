import assert from 'node:assert/strict';
import {normalizeEnabledPreference} from '../src/touchGestures.ts';

assert.equal(normalizeEnabledPreference(false,true),false);
assert.equal(normalizeEnabledPreference('false',true),true);
assert.equal(normalizeEnabledPreference(undefined,false),false);

console.log('touch gesture preference verification passed');
