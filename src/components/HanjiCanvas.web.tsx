import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { HanjiCanvasProps } from './HanjiCanvas.types';
import {SHAPE_HOLD_MS,shouldSnapShape} from '../shapePolicy';

type Stroke = { d: string; color: string; width: number; opacity: number; dashed?: boolean };
const decode = (raw: string): Stroke[] => { try { return raw ? JSON.parse(raw) : []; } catch { return []; } };
const touches=(stroke:Stroke,x:number,y:number,radius:number)=>{const n=stroke.d.match(/-?\d+(?:\.\d+)?/g)??[];for(let i=0;i+1<n.length;i+=2)if(Math.hypot(Number(n[i])-x,Number(n[i+1])-y)<=radius+stroke.width/2)return true;return false};
const shapePath=(kind:NonNullable<HanjiCanvasProps['tool']['shapeKind']>,sx:number,sy:number,x:number,y:number)=>{
 if(kind==='line')return `M ${sx} ${sy} L ${x} ${y}`;
 if(kind==='arrow'){const angle=Math.atan2(y-sy,x-sx),length=Math.min(28,Math.hypot(x-sx,y-sy)*.3);return `M ${sx} ${sy} L ${x} ${y} M ${x} ${y} L ${x-length*Math.cos(angle-.55)} ${y-length*Math.sin(angle-.55)} M ${x} ${y} L ${x-length*Math.cos(angle+.55)} ${y-length*Math.sin(angle+.55)}`}
 const left=Math.min(sx,x),top=Math.min(sy,y),width=Math.abs(x-sx),height=Math.abs(y-sy);
 if(kind==='ellipse')return `M ${left} ${top+height/2} A ${width/2} ${height/2} 0 1 0 ${left+width} ${top+height/2} A ${width/2} ${height/2} 0 1 0 ${left} ${top+height/2}`;
 if(kind==='triangle')return `M ${left+width/2} ${top} L ${left+width} ${top+height} L ${left} ${top+height} Z`;
 return `M ${left} ${top} L ${left+width} ${top} L ${left+width} ${top+height} L ${left} ${top+height} Z`;
};

export function HanjiCanvas({ drawingData, tool, onDrawingChange }: HanjiCanvasProps) {
  const initial = useMemo(() => decode(drawingData), []);
  const [strokes, setStrokes] = useState<Stroke[]>(initial);
  const live = useRef<Stroke | null>(null);
  const shapeStart=useRef<{x:number;y:number}|null>(null);
  const strokeStart=useRef<{x:number;y:number}|null>(null);
  const strokeEnd=useRef<{x:number;y:number}|null>(null);
  const lastMoveAt=useRef(0);
  const rawShapePath=useRef('');
  const [, redraw] = useState(0);
  const eraseAt=(x:number,y:number)=>setStrokes(previous=>{const next=previous.filter(stroke=>!touches(stroke,x,y,Math.max(8,tool.width)));if(next.length!==previous.length)onDrawingChange(JSON.stringify(next));return next});
  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: ({ nativeEvent }) => {
      if (tool.kind === 'eraser') {eraseAt(nativeEvent.locationX,nativeEvent.locationY);return}
      if (tool.kind === 'lasso') return;
      if(tool.kind==='shape')shapeStart.current={x:nativeEvent.locationX,y:nativeEvent.locationY};
      strokeStart.current={x:nativeEvent.locationX,y:nativeEvent.locationY};strokeEnd.current=strokeStart.current;lastMoveAt.current=Date.now();
      rawShapePath.current=`M ${nativeEvent.locationX} ${nativeEvent.locationY}`;
      live.current = { d: rawShapePath.current, color: tool.color, width: tool.width, opacity: tool.opacity ?? (tool.kind === 'marker' ? 0.35 : tool.kind === 'watercolor' ? 0.45 : tool.kind === 'pencil' ? 0.65 : tool.kind === 'crayon' ? 0.85 : 1),dashed:tool.kind==='shape'&&tool.shapeLineStyle==='dashed' };
      redraw(v => v + 1);
    },
    onPanResponderMove: ({ nativeEvent }) => {
      if(tool.kind==='eraser'){eraseAt(nativeEvent.locationX,nativeEvent.locationY);return}
      if (!live.current) return;
      strokeEnd.current={x:nativeEvent.locationX,y:nativeEvent.locationY};lastMoveAt.current=Date.now();
      if(tool.kind==='shape'&&shapeStart.current){rawShapePath.current+=` L ${nativeEvent.locationX} ${nativeEvent.locationY}`;live.current.d=rawShapePath.current}else live.current.d += ` L ${nativeEvent.locationX} ${nativeEvent.locationY}`;
      redraw(v => v + 1);
    },
    onPanResponderRelease: () => {
      if (tool.kind === 'eraser'||tool.kind === 'lasso') return;
      if (!live.current) return;
      if(tool.kind==='shape'&&shapeStart.current&&strokeEnd.current&&shouldSnapShape(tool.shapeHoldRequired??true,Date.now()-lastMoveAt.current>=SHAPE_HOLD_MS))live.current.d=shapePath(tool.shapeKind??'line',shapeStart.current.x,shapeStart.current.y,strokeEnd.current.x,strokeEnd.current.y);
      if(tool.kind==='marker'&&(tool.markerStraightLine??true)&&Date.now()-lastMoveAt.current>=350&&strokeStart.current&&strokeEnd.current)live.current.d=shapePath('line',strokeStart.current.x,strokeStart.current.y,strokeEnd.current.x,strokeEnd.current.y);
      const next = [...strokes, live.current]; live.current = null; shapeStart.current=null;rawShapePath.current=''; setStrokes(next); onDrawingChange(JSON.stringify(next));
    },
  }), [onDrawingChange, strokes, tool]);
  return <View style={s.fill} {...responder.panHandlers}><Svg width="100%" height="100%">{[...strokes, ...(live.current ? [live.current] : [])].map((x, i) => <Path key={i} d={x.d} stroke={x.color} strokeWidth={x.width} strokeDasharray={x.dashed?'12 7':undefined} opacity={x.opacity} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}</Svg></View>;
}
const s = StyleSheet.create({ fill: { ...StyleSheet.absoluteFill } });

