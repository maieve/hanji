import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type {Notebook} from './types';
type Stroke={d:string;color:string;width:number;opacity:number};
const esc=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
export async function exportNotebookPdf(note:Notebook){
 const pages=note.pages.map(page=>{let strokes:Stroke[]=[];try{strokes=JSON.parse(page.drawingData||'[]')}catch{}const paths=strokes.map(x=>`<path d="${esc(x.d)}" stroke="${esc(x.color)}" stroke-width="${x.width}" opacity="${x.opacity}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');return `<section class="page ${page.template}"><svg viewBox="0 0 900 636">${paths}</svg></section>`}).join('');
 const html=`<!doctype html><html><head><style>@page{size:A4 landscape;margin:0}body{margin:0}.page{width:297mm;height:210mm;page-break-after:always;background:#fff}.line{background-image:repeating-linear-gradient(#fff 0,#fff 27px,#dde2dd 28px)}.grid{background-image:linear-gradient(#dde2dd 1px,transparent 1px),linear-gradient(90deg,#dde2dd 1px,transparent 1px);background-size:28px 28px}.dot{background-image:radial-gradient(#bdc4bd 1px,transparent 1px);background-size:22px 22px}svg{width:100%;height:100%}</style></head><body>${pages}</body></html>`;
 const {uri}=await Print.printToFileAsync({html});await Sharing.shareAsync(uri,{mimeType:'application/pdf',dialogTitle:`${note.title} PDF 내보내기`});return uri;
}