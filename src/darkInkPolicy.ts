import type {PageTemplate} from './types';

export const DARK_PAPER_INK='#F4F1E8';
export const DARK_PAPER_SOURCE_COLORS=['#20201E','#000000'] as const;

export type DarkInkTransition={color:string;autoInverted:boolean};

export function resolveDarkInkTransition(color:string,template:PageTemplate|undefined,enabled:boolean,autoInverted:boolean):DarkInkTransition{
  const normalized=color.toUpperCase();
  if(!enabled)return{color,autoInverted:false};
  if(template==='dark'){
    if(DARK_PAPER_SOURCE_COLORS.includes(normalized as typeof DARK_PAPER_SOURCE_COLORS[number]))return{color:DARK_PAPER_INK,autoInverted:true};
    return{color,autoInverted:autoInverted&&normalized===DARK_PAPER_INK};
  }
  if(autoInverted&&normalized===DARK_PAPER_INK)return{color:DARK_PAPER_SOURCE_COLORS[0],autoInverted:false};
  return{color,autoInverted:false};
}
