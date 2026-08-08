export type LassoPoint={x:number;y:number};
export function pointInLasso(point:LassoPoint,polygon:LassoPoint[]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i]!,b=polygon[j]!;if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
export function freeformLassoSelectsPath(path:LassoPoint[],polygon:LassoPoint[]){return polygon.length>=3&&path.some(point=>pointInLasso(point,polygon))}
