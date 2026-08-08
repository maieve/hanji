import assert from 'node:assert/strict';
import {clampBrushOpacity,clampBrushWidth,stepBrushOpacity,stepBrushWidth} from '../src/brushControls.ts';
import {defaultToolPresets,rememberInkTool,selectToolKind,type ToolPreferences} from '../src/toolPreferences.ts';

assert.equal(clampBrushWidth(-1),.5);assert.equal(clampBrushWidth(99),40);
assert.equal(stepBrushWidth(2,1),2.5);assert.equal(stepBrushWidth(3,1),4);assert.equal(stepBrushWidth(12,1),14);
assert.equal(stepBrushOpacity(.05,-1),.05);assert.equal(stepBrushOpacity(.95,1),1);
const base:ToolPreferences={presets:defaultToolPresets,recentColors:[],lastTools:{}};
const remembered=rememberInkTool(base,{kind:'watercolor',color:'#123456',width:23.5,opacity:.45});
assert.deepEqual(selectToolKind({kind:'pen',color:'#000000',width:2},'watercolor',remembered.lastTools),{kind:'watercolor',color:'#123456',width:23.5,opacity:.45});
assert.equal(rememberInkTool(remembered,{kind:'eraser',color:'#000000',width:2}),remembered);
console.log('brush control verification passed');
