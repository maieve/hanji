import assert from 'node:assert/strict';
import {DARK_PAPER_INK,DARK_PAPER_SOURCE_COLORS,resolveDarkInkTransition} from '../src/darkInkPolicy.ts';

let state=resolveDarkInkTransition('#20201e','dark',true,false);
assert.deepEqual(state,{color:DARK_PAPER_INK,autoInverted:true});
state=resolveDarkInkTransition(state.color,'line',true,state.autoInverted);
assert.deepEqual(state,{color:DARK_PAPER_SOURCE_COLORS[0],autoInverted:false});
assert.deepEqual(resolveDarkInkTransition('#000000','dark',true,false),{color:DARK_PAPER_INK,autoInverted:true});
assert.deepEqual(resolveDarkInkTransition('#315E9C','dark',true,false),{color:'#315E9C',autoInverted:false});
assert.deepEqual(resolveDarkInkTransition(DARK_PAPER_INK,'line',true,false),{color:DARK_PAPER_INK,autoInverted:false},'manual light ink must not be reversed');
assert.deepEqual(resolveDarkInkTransition('#20201E','dark',false,false),{color:'#20201E',autoInverted:false});
assert.deepEqual(resolveDarkInkTransition(DARK_PAPER_INK,'line',false,true),{color:DARK_PAPER_INK,autoInverted:false},'disabling must not mutate the current color');
console.log('dark ink policy verification passed');
