export const SHAPE_HOLD_MS=350;
export const SHAPE_ENDPOINT_SNAP_MIN=12;
export const SHAPE_ENDPOINT_SNAP_MAX=24;
export function shouldSnapShape(holdRequired:boolean,heldAtEnd:boolean){return !holdRequired||heldAtEnd}
export function shapeEndpointSnapDistance(width:number){return Math.max(SHAPE_ENDPOINT_SNAP_MIN,Math.min(SHAPE_ENDPOINT_SNAP_MAX,width*4))}
export function nearestShapeAnchor(point:{x:number;y:number},anchors:{x:number;y:number}[],threshold:number){let result:{x:number;y:number}|undefined;let nearest=Infinity;for(const anchor of anchors){const distance=Math.hypot(anchor.x-point.x,anchor.y-point.y);if(distance<=threshold&&distance<nearest){result=anchor;nearest=distance}}return result}
