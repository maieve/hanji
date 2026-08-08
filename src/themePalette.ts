export const lightChrome = {
  ink: "#20201E", muted: "#76736B", line: "#E7E3DA",
  canvas: "#EFEEE9", accent: "#225D50", accentSoft: "#DCEAE5",
  sidebar: "#F7F5EF", surface: "#FFFFFF", danger: "#C55448", dangerSoft: "#FFF7F5",
} as const;

export const darkChrome = {
  ink: "#F4F1E8", muted: "#AAA79F", line: "#3B403C",
  canvas: "#111412", accent: "#65B89D", accentSoft: "#263D35",
  sidebar: "#1B1F1C", surface: "#202522", danger: "#E47A70", dangerSoft: "#3B2927",
} as const;

export function webDynamicColor(light:string,dark:string){return `light-dark(${light}, ${dark})`}

export function contrastRatio(a:string,b:string){
  const luminance=(hex:string)=>{
    const channels=[1,3,5].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4);
    return channels[0]!*0.2126+channels[1]!*0.7152+channels[2]!*0.0722;
  };
  const first=luminance(a),second=luminance(b),high=Math.max(first,second),low=Math.min(first,second);return (high+0.05)/(low+0.05);
}
