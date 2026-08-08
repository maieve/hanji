import AsyncStorage from '@react-native-async-storage/async-storage';
import type {ToolKind,ToolSpec} from './types';

const KEY='hanji.tool-preferences.v1';
export const TOOL_PREFERENCES_VERSION=2;
export const MAX_RECENT_COLORS=8;
type InkToolKind=Exclude<ToolKind,'eraser'|'lasso'|'shape'>;
const inkKinds:InkToolKind[]=['pen','fountainPen','monoline','pencil','crayon','watercolor','marker'];

export type ToolPreset={id:string;name:string;tool:ToolSpec};
export type ToolPreferences={presets:ToolPreset[];recentColors:string[];lastTools:Partial<Record<InkToolKind,ToolSpec>>};

const defaults:Record<InkToolKind,Pick<ToolSpec,'width'|'opacity'>>={
  pen:{width:2,opacity:1},fountainPen:{width:2,opacity:1},monoline:{width:3,opacity:1},
  pencil:{width:2,opacity:.75},crayon:{width:9,opacity:.85},watercolor:{width:16,opacity:.5},marker:{width:12,opacity:.35},
};

export const defaultToolPresets:ToolPreset[]=[
  {id:'default-pen',name:'검정 펜',tool:{kind:'pen',color:'#20201E',width:2,opacity:1,scratchEnabled:true,circleToLasso:true}},
  {id:'default-fountain',name:'파랑 만년필',tool:{kind:'fountainPen',color:'#315E9C',width:2,opacity:1,scratchEnabled:true}},
  {id:'default-pencil',name:'연필',tool:{kind:'pencil',color:'#525252',width:2,opacity:.75,scratchEnabled:true}},
  {id:'default-marker',name:'형광펜',tool:{kind:'marker',color:'#F0C84B',width:12,opacity:.35,scratchEnabled:true,markerStraightLine:true}},
  {id:'default-watercolor',name:'하늘 수채화',tool:{kind:'watercolor',color:'#5D9FC6',width:18,opacity:.3}},
  {id:'default-crayon',name:'테라코타 크레용',tool:{kind:'crayon',color:'#B7654B',width:11,opacity:.85,scratchEnabled:true}},
];

export const isInkTool=(kind:ToolKind):kind is InkToolKind=>inkKinds.includes(kind as InkToolKind);

export function normalizeHexColor(value:unknown):string|null{
  if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return null;
  return value.toUpperCase();
}

export function normalizeRecentColors(value:unknown):string[]{
  if(!Array.isArray(value))return[];
  const result:string[]=[];
  for(const item of value){
    const color=normalizeHexColor(item);
    if(color&&!result.includes(color))result.push(color);
    if(result.length===MAX_RECENT_COLORS)break;
  }
  return result;
}

export function pushRecentColor(recentColors:string[],value:string):string[]{
  const color=normalizeHexColor(value);
  if(!color)return normalizeRecentColors(recentColors);
  return[color,...normalizeRecentColors(recentColors).filter(item=>item!==color)].slice(0,MAX_RECENT_COLORS);
}

export function selectToolKind(tool:ToolSpec,kind:ToolKind,lastTools:ToolPreferences['lastTools']={}):ToolSpec{
  if(!isInkTool(kind))return{...tool,kind,...(kind==='eraser'?{eraserMode:tool.eraserMode??'vector'}:{}),...(kind==='lasso'?{lassoMode:tool.lassoMode??'freeform'}:{}),...(kind==='shape'?{shapeKind:tool.shapeKind??'line',shapeLineStyle:tool.shapeLineStyle??'solid',shapeFillStyle:tool.shapeFillStyle??'none'}:{})};
  return lastTools[kind] ? {...lastTools[kind]!,kind} : {...tool,kind,...defaults[kind]};
}

export function rememberInkTool(preferences:ToolPreferences,tool:ToolSpec):ToolPreferences{
  return isInkTool(tool.kind)?{...preferences,lastTools:{...preferences.lastTools,[tool.kind]:{...tool}}}:preferences;
}

export function renameToolPreset(preferences:ToolPreferences,id:string,name:string):ToolPreferences{
  const clean=name.trim().slice(0,24);if(!clean)return preferences;
  return{...preferences,presets:preferences.presets.map(item=>item.id===id?{...item,name:clean}:item)};
}
export function replaceToolPreset(preferences:ToolPreferences,id:string,tool:ToolSpec):ToolPreferences{
  if(!isInkTool(tool.kind))return preferences;
  return{...preferences,presets:preferences.presets.map(item=>item.id===id?{...item,tool:{...tool}}:item)};
}
export function removeToolPreset(preferences:ToolPreferences,id:string):ToolPreferences{
  return{...preferences,presets:preferences.presets.filter(item=>item.id!==id)};
}
export function moveToolPreset(preferences:ToolPreferences,id:string,direction:-1|1):ToolPreferences{
  const index=preferences.presets.findIndex(item=>item.id===id),target=index+direction;
  if(index<0||target<0||target>=preferences.presets.length)return preferences;
  const presets=[...preferences.presets];[presets[index],presets[target]]=[presets[target]!,presets[index]!];return{...preferences,presets};
}

export function normalizeToolPreferences(value:unknown):ToolPreferences{
  if(!value||typeof value!=='object')return{presets:defaultToolPresets,recentColors:[],lastTools:{}};
  const stored=value as Partial<ToolPreferences>&{version?:number};
  const presets=Array.isArray(stored.presets)?stored.presets.slice(0,12):[...defaultToolPresets];
  if((stored.version??1)<TOOL_PREFERENCES_VERSION){
    for(const id of ['default-watercolor','default-crayon']){
      const preset=defaultToolPresets.find(item=>item.id===id);
      if(preset&&!presets.some(item=>item?.id===id)&&presets.length<12)presets.push(preset);
    }
  }
  return{presets,recentColors:normalizeRecentColors(stored.recentColors),lastTools:stored.lastTools&&typeof stored.lastTools==='object'?stored.lastTools:{}};
}

export async function loadToolPreferences():Promise<ToolPreferences>{
  try{const raw=await AsyncStorage.getItem(KEY);if(raw)return normalizeToolPreferences(JSON.parse(raw))}catch{}
  return{presets:defaultToolPresets,recentColors:[],lastTools:{}};
}

export async function saveToolPreferences(value:ToolPreferences){await AsyncStorage.setItem(KEY,JSON.stringify({...value,version:TOOL_PREFERENCES_VERSION,presets:value.presets.slice(0,12),recentColors:normalizeRecentColors(value.recentColors)}))}
