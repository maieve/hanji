import assert from 'node:assert/strict';
import {FOCUS_TOOLBAR_IDLE_MS,focusToolbarShouldHide} from '../src/focusPolicy.ts';
assert.equal(FOCUS_TOOLBAR_IDLE_MS,2000);
assert.equal(focusToolbarShouldHide(1000,2999),false);
assert.equal(focusToolbarShouldHide(1000,3000),true);
assert.equal(focusToolbarShouldHide(3000,3000),false);
console.log('focus toolbar policy verification passed');
