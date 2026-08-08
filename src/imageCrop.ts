export const normalizeCropZoom=(value:number|undefined)=>Math.max(1,Math.min(4,Number.isFinite(value)?value!:1));
export const normalizeCropOffset=(value:number|undefined)=>Math.max(-1,Math.min(1,Number.isFinite(value)?value!:0));
export const adjustImageCrop=(current:{cropZoom?:number;cropX?:number;cropY?:number},change:{zoom?:number;x?:number;y?:number})=>({
 cropZoom:normalizeCropZoom((current.cropZoom??1)+(change.zoom??0)),
 cropX:normalizeCropOffset((current.cropX??0)+(change.x??0)),
 cropY:normalizeCropOffset((current.cropY??0)+(change.y??0)),
});
