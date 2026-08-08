import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import type { PageRotation } from "../types";
import {normalizeCanvasExtent} from '../canvasExtent';
import { CANVAS_MAX_ZOOM, CANVAS_MIN_ZOOM, zoomNeedsPan } from "../zoomPolicy";
import { RotatedPage } from "./RotatedPage";

export const ZoomAutoAdvanceContext=createContext<((maxX:number,maxY:number)=>void)|undefined>(undefined);

export function ZoomablePage({
  rotation = 0,
  style,
  canvasExtent,
  fingerDrawingEnabled=false,
  zoomWindowEnabled=false,
  children,
}: {
  rotation?: PageRotation;
  style?: StyleProp<ViewStyle>;
  canvasExtent?: {columns:number;rows:number};
  fingerDrawingEnabled?:boolean;
  zoomWindowEnabled?:boolean;
  children: ReactNode;
}) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [multiTouch, setMultiTouch] = useState(false);
  const scroll=useRef<ScrollView>(null);
  const offset=useRef({x:0,y:0});
  const extent=normalizeCanvasExtent(canvasExtent),extended=extent.columns>1||extent.rows>1;
  useEffect(()=>{if(!zoomWindowEnabled){offset.current={x:0,y:0};scroll.current?.scrollTo({x:0,y:0,animated:false})}},[zoomWindowEnabled]);
  const autoAdvance=useCallback((maxX:number,_maxY:number)=>{
    if(!zoomWindowEnabled||size.width<=0)return;
    const scale=2.5,current=offset.current;
    if(maxX*scale<=current.x+size.width*.82)return;
    const maxXOffset=Math.max(0,size.width*extent.columns*scale-size.width),proposed=current.x+size.width*.58;
    if(proposed<=maxXOffset){offset.current={x:proposed,y:current.y};scroll.current?.scrollTo({x:proposed,y:current.y,animated:true})}
    else{const nextY=Math.min(Math.max(0,size.height*extent.rows*scale-size.height),current.y+size.height*.72);offset.current={x:0,y:nextY};scroll.current?.scrollTo({x:0,y:nextY,animated:true})}
  },[zoomWindowEnabled,size.width,size.height,extent.columns,extent.rows]);
  const layout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width !== size.width || height !== size.height)
      setSize({ width, height });
  };
  return (
    <ZoomAutoAdvanceContext.Provider value={zoomWindowEnabled?autoAdvance:undefined}>
    <View onLayout={layout} style={[s.frame, style]}>
      <ScrollView
        key={zoomWindowEnabled?'zoom-window':'free-zoom'}
        ref={scroll}
        style={StyleSheet.absoluteFill}
        contentContainerStyle={s.content}
        minimumZoomScale={CANVAS_MIN_ZOOM}
        maximumZoomScale={CANVAS_MAX_ZOOM}
        zoomScale={zoomWindowEnabled?2.5:undefined}
        bouncesZoom
        centerContent
        pinchGestureEnabled
        scrollEnabled={(extended&&!fingerDrawingEnabled) || multiTouch || zoomNeedsPan(zoom)}
        showsHorizontalScrollIndicator={extended || zoomNeedsPan(zoom)}
        showsVerticalScrollIndicator={extended || zoomNeedsPan(zoom)}
        scrollEventThrottle={32}
        onScroll={(event) => {const next=event.nativeEvent.contentOffset;offset.current={x:next.x,y:next.y};setZoom(event.nativeEvent.zoomScale ?? 1)}}
        onTouchStart={(event) => {
          if (event.nativeEvent.touches.length >= 2) setMultiTouch(true);
        }}
        onTouchEnd={(event) => {
          if (event.nativeEvent.touches.length < 2) setMultiTouch(false);
        }}
      >
        <View style={{ width: size.width*extent.columns, height: size.height*extent.rows }}>
          {size.width > 0 && (
            <RotatedPage rotation={rotation} style={s.page}>
              {children}
            </RotatedPage>
          )}
        </View>
      </ScrollView>
    </View>
    </ZoomAutoAdvanceContext.Provider>
  );
}

const s = StyleSheet.create({
  frame: { overflow: "hidden" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", height: "100%" },
});
