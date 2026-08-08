export const MIN_BRUSH_WIDTH=.5;
export const MAX_BRUSH_WIDTH=40;
export const MIN_BRUSH_OPACITY=.05;

const round=(value:number,places:number)=>Number(value.toFixed(places));
export function clampBrushWidth(value:number){return round(Math.min(MAX_BRUSH_WIDTH,Math.max(MIN_BRUSH_WIDTH,value)),1)}
export function stepBrushWidth(value:number,direction:-1|1){
  const step=value<3?.5:value<12?1:2;
  return clampBrushWidth(value+step*direction);
}
export function brushWidthPresets(kind:string):readonly [number,number,number]{
  switch(kind){
    case'monoline':return[2,4,8];
    case'pencil':return[1,2,5];
    case'crayon':return[5,10,18];
    case'watercolor':return[8,16,28];
    case'marker':return[6,12,20];
    case'shape':return[1,3,6];
    default:return[1,2,4];
  }
}
export function brushWidthToPosition(value:number){
  return Math.log(clampBrushWidth(value)/MIN_BRUSH_WIDTH)/Math.log(MAX_BRUSH_WIDTH/MIN_BRUSH_WIDTH);
}
export function brushPositionToWidth(position:number){
  const normalized=Math.min(1,Math.max(0,position));
  return clampBrushWidth(MIN_BRUSH_WIDTH*Math.pow(MAX_BRUSH_WIDTH/MIN_BRUSH_WIDTH,normalized));
}
export function clampBrushOpacity(value:number){return round(Math.min(1,Math.max(MIN_BRUSH_OPACITY,value)),2)}
export function stepBrushOpacity(value:number,direction:-1|1){return clampBrushOpacity(value+.05*direction)}
