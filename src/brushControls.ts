export const MIN_BRUSH_WIDTH=.5;
export const MAX_BRUSH_WIDTH=40;
export const MIN_BRUSH_OPACITY=.05;

const round=(value:number,places:number)=>Number(value.toFixed(places));
export function clampBrushWidth(value:number){return round(Math.min(MAX_BRUSH_WIDTH,Math.max(MIN_BRUSH_WIDTH,value)),1)}
export function stepBrushWidth(value:number,direction:-1|1){
  const step=value<3?.5:value<12?1:2;
  return clampBrushWidth(value+step*direction);
}
export function clampBrushOpacity(value:number){return round(Math.min(1,Math.max(MIN_BRUSH_OPACITY,value)),2)}
export function stepBrushOpacity(value:number,direction:-1|1){return clampBrushOpacity(value+.05*direction)}
