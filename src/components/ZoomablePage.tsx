import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ScrollView,
  Pressable,
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
  const [viewportOffset,setViewportOffset]=useState({x:0,y:0});
  const scroll=useRef<ScrollView>(null);
  const offset=useRef({x:0,y:0});
  const extent=normalizeCanvasExtent(canvasExtent),extended=extent.columns>1||extent.rows>1;
  useEffect(()=>{if(!zoomWindowEnabled){offset.current={x:0,y:0};setViewportOffset({x:0,y:0});scroll.current?.scrollTo({x:0,y:0,animated:false})}},[zoomWindowEnabled]);
  const autoAdvance=useCallback((maxX:number,_maxY:number)=>{
    if(!zoomWindowEnabled||size.width<=0)return;
    const scale=2.5,current=offset.current;
    if(maxX*scale<=current.x+size.width*.82)return;
    const maxXOffset=Math.max(0,size.width*extent.columns*scale-size.width),proposed=current.x+size.width*.58;
    if(proposed<=maxXOffset){offset.current={x:proposed,y:current.y};setViewportOffset(offset.current);scroll.current?.scrollTo({x:proposed,y:current.y,animated:true})}
    else{const nextY=Math.min(Math.max(0,size.height*extent.rows*scale-size.height),current.y+size.height*.72);offset.current={x:0,y:nextY};setViewportOffset(offset.current);scroll.current?.scrollTo({x:0,y:nextY,animated:true})}
  },[zoomWindowEnabled,size.width,size.height,extent.columns,extent.rows]);
  const zoomWindowScale=2.5;
  const minimapWidth=132,minimapHeight=size.width>0?Math.max(54,Math.min(112,minimapWidth*(size.height*extent.rows)/(size.width*extent.columns))):72;
  const minimapViewport={
    left:viewportOffset.x/(size.width*extent.columns*zoomWindowScale||1)*minimapWidth,
    top:viewportOffset.y/(size.height*extent.rows*zoomWindowScale||1)*minimapHeight,
    width:Math.min(minimapWidth,minimapWidth/(extent.columns*zoomWindowScale)),
    height:Math.min(minimapHeight,minimapHeight/(extent.rows*zoomWindowScale)),
  };
  const navigateMinimap=(x:number,y:number)=>{
    const maxX=Math.max(0,size.width*extent.columns*zoomWindowScale-size.width),maxY=Math.max(0,size.height*extent.rows*zoomWindowScale-size.height);
    const next={x:Math.max(0,Math.min(maxX,x/minimapWidth*size.width*extent.columns*zoomWindowScale-size.width/2)),y:Math.max(0,Math.min(maxY,y/minimapHeight*size.height*extent.rows*zoomWindowScale-size.height/2))};
    offset.current=next;setViewportOffset(next);scroll.current?.scrollTo({...next,animated:true});
  };
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
        minimumZoomScale={zoomWindowEnabled?zoomWindowScale:CANVAS_MIN_ZOOM}
        maximumZoomScale={zoomWindowEnabled?zoomWindowScale:CANVAS_MAX_ZOOM}
        zoomScale={zoomWindowEnabled?zoomWindowScale:undefined}
        bouncesZoom
        centerContent
        pinchGestureEnabled={!zoomWindowEnabled}
        scrollEnabled={zoomWindowEnabled || !fingerDrawingEnabled || multiTouch || zoomNeedsPan(zoom)}
        showsHorizontalScrollIndicator={extended || zoomNeedsPan(zoom)}
        showsVerticalScrollIndicator={extended || zoomNeedsPan(zoom)}
        scrollEventThrottle={16}
        decelerationRate="fast"
        directionalLockEnabled={false}
        onScroll={(event) => {const next=event.nativeEvent.contentOffset;offset.current={x:next.x,y:next.y};if(zoomWindowEnabled)setViewportOffset(offset.current);const nextZoom=event.nativeEvent.zoomScale ?? 1;setZoom(current=>Math.abs(current-nextZoom)>.005?nextZoom:current)}}
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
      {zoomWindowEnabled&&size.width>0&&<Pressable
        accessibilityRole="adjustable"
        accessibilityLabel="확대 창 페이지 미니맵"
        accessibilityHint="탭한 위치로 확대 창을 이동합니다"
        onPress={(event)=>navigateMinimap(event.nativeEvent.locationX,event.nativeEvent.locationY)}
        style={[s.minimap,{width:minimapWidth,height:minimapHeight}]}
      >
        <View style={s.minimapPaper}/>
        <View pointerEvents="none" style={[s.minimapViewport,minimapViewport]}/>
      </Pressable>}
    </View>
    </ZoomAutoAdvanceContext.Provider>
  );
}

const s = StyleSheet.create({
  frame: { overflow: "hidden" },
  content: { flexGrow: 1, alignItems: "center", justifyContent: "center" },
  page: { width: "100%", height: "100%" },
  minimap:{position:"absolute",right:14,top:14,borderRadius:9,borderWidth:1,borderColor:"rgba(47,125,102,.55)",backgroundColor:"rgba(250,250,246,.94)",overflow:"hidden",shadowColor:"#000",shadowOpacity:.16,shadowRadius:8,shadowOffset:{width:0,height:3}},
  minimapPaper:{position:"absolute",left:0,right:0,top:0,bottom:0,backgroundColor:"#FAFAF6"},
  minimapViewport:{position:"absolute",borderWidth:2,borderColor:"#2F7D66",backgroundColor:"rgba(47,125,102,.16)",borderRadius:3},
});
