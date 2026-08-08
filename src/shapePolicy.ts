export const SHAPE_HOLD_MS=350;
export const SHAPE_ENDPOINT_SNAP_MIN=12;
export const SHAPE_ENDPOINT_SNAP_MAX=24;
export function shouldSnapShape(holdRequired:boolean,heldAtEnd:boolean){return !holdRequired||heldAtEnd}
export function shapeEndpointSnapDistance(width:number){return Math.max(SHAPE_ENDPOINT_SNAP_MIN,Math.min(SHAPE_ENDPOINT_SNAP_MAX,width*4))}
export function nearestShapeAnchor(point:{x:number;y:number},anchors:{x:number;y:number}[],threshold:number){let result:{x:number;y:number}|undefined;let nearest=Infinity;for(const anchor of anchors){const distance=Math.hypot(anchor.x-point.x,anchor.y-point.y);if(distance<=threshold&&distance<nearest){result=anchor;nearest=distance}}return result}
export type ShapePoint={x:number;y:number};
const distanceToSegment=(point:ShapePoint,start:ShapePoint,end:ShapePoint)=>{const dx=end.x-start.x,dy=end.y-start.y;if(dx===0&&dy===0)return Math.hypot(point.x-start.x,point.y-start.y);const t=Math.max(0,Math.min(1,((point.x-start.x)*dx+(point.y-start.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(point.x-(start.x+t*dx),point.y-(start.y+t*dy))};
export function simplifyPolygon(points:ShapePoint[],epsilon:number):ShapePoint[]{if(points.length<=2)return points;let distance=0,index=0;for(let i=1;i<points.length-1;i++){const candidate=distanceToSegment(points[i]!,points[0]!,points[points.length-1]!);if(candidate>distance){distance=candidate;index=i}}if(distance<=epsilon)return[points[0]!,points[points.length-1]!];const left:ShapePoint[]=simplifyPolygon(points.slice(0,index+1),epsilon),right:ShapePoint[]=simplifyPolygon(points.slice(index),epsilon);return[...left.slice(0,-1),...right]}
export function closedPolygon(points:ShapePoint[],epsilon=3):ShapePoint[]{const simplified=simplifyPolygon(points,epsilon);if(simplified.length<3)return points;const first=simplified[0]!,last=simplified[simplified.length-1]!;return Math.hypot(first.x-last.x,first.y-last.y)<0.001?simplified:[...simplified,first]}
export function supportsShapeFill(kind:string){return kind==='ellipse'||kind==='rectangle'||kind==='triangle'||kind==='polygon'}
