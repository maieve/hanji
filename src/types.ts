export type ToolKind='pen'|'fountainPen'|'monoline'|'pencil'|'crayon'|'watercolor'|'marker'|'eraser';
export type ToolSpec={kind:ToolKind;color:string;width:number;opacity?:number};
export type OcrWord={text:string;confidence:number;x:number;y:number;width:number;height:number};
export type Page={id:string;drawingData:string;template:'plain'|'line'|'grid'|'dot';updatedAt:string;pdfUri?:string;pdfName?:string;ocrText?:string;ocrWords?:OcrWord[]};
export type StrokeSync={pageId:string;createdAt:number;seekSec:number};
export type AudioSession={uri:string;createdAt:string;startedAt:number;durationMs:number;strokes:StrokeSync[]};
export type Notebook={id:string;title:string;folder:string;tags:string[];favorite:boolean;createdAt:string;updatedAt:string;pages:Page[];audioSessions?:AudioSession[]};
