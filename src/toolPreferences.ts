import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ToolKind,ToolSpec} from './types';

const KEY='hanji.tool-preferences.v1';
type InkToolKind=Exclude<ToolKind,'eraser'|'lasso'|'shape'>;
const inkKinds:InkToolKind[]=['pen','fountainPen','monoline','pencil','crayon','watercolor','marker'];

export type ToolPreset={id:string;name:string;tool:ToolSpec};
export type ToolPreferences={presets:ToolPreset[];recentColors:string[]};

const defaults:Record<InkToolKind,Pick<ToolSpec,'width'|'opacity'>>={
  pen:{width:2,opacity:1},fountainPen:{width:2,opacity:1},monoline:{width:3,opacity:1},
  pencil:{width:2,opacity:.75},crayon:{width:9,opacity:.85},watercolor:{width:16,opacity:.5},marker:{width:12,opacity:.35},
};

export const defaultToolPresets:ToolPreset[]=[
  {id:'default-pen',name:'검정 펜',tool:{kind:'pen',color:'#20201E',width:2,opacity:1,scratchEnabled:true,circleToLasso:true}},
  {id:'default-fountain',name:'파랑 만년필',tool:{kind:'fountainPen',color:'#315E9C',width:2,opacity:1,scratchEnabled:true}},
  {id:'default-pencil',name:'연필',tool:{kind:'pencil',color:'#525252',width:2,opacity:.75,scratchEnabled:true}},
  {id:'default-marker',name:'형광펜',tool:{kind:'marker',color:'#F0C84B',width:12,opacity:.35,scratchEnabled:true,markerStraightLine:true}},
];

export const isInkTool=(kind:ToolKind):kind is InkToolKind=>inkKinds.includes(kind as InkToolKind);

export function selectToolKind(tool:ToolSpec,kind:ToolKind):ToolSpec{
  if(!isInkTool(kind))return{...tool,kind,...(kind==='eraser'?{eraserMode:tool.eraserMode??'vector'}:{}),...(kind==='shape'?{shapeKind:tool.shapeKind??'line',shapeLineStyle:tool.shapeLineStyle??'solid'}:{})};
  return{...tool,kind,...defaults[kind]};
}

export async function loadToolPreferences():Promise<ToolPreferences>{
  try{const raw=await AsyncStorage.getItem(KEY);if(raw){const value=JSON.parse(raw) as Partial<ToolPreferences>;return{presets:Array.isArray(value.presets)?value.presets.slice(0,12):defaultToolPresets,recentColors:Array.isArray(value.recentColors)?value.recentColors.slice(0,8):[]}}}catch{}
  return{presets:defaultToolPresets,recentColors:[]};
}

export async function saveToolPreferences(value:ToolPreferences){await AsyncStorage.setItem(KEY,JSON.stringify({...value,presets:value.presets.slice(0,12),recentColors:value.recentColors.slice(0,8)}))}
