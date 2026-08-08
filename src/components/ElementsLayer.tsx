import { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import type { ImageElement, PageElement, TextElement } from '../types';
import {adjustImageCrop,normalizeCropOffset,normalizeCropZoom} from '../imageCrop';

export function ElementsLayer({ elements, editable, selectedIds=[], onChange,onCommit, onSaveImage,onNavigateSource }: { elements: PageElement[]; editable: boolean; selectedIds?:string[]; onChange: (v: PageElement[]) => void;onCommit?:(before:PageElement,after:PageElement)=>void; onSaveImage?: (image: ImageElement) => void;onNavigateSource?:(source:NonNullable<TextElement['source']>)=>void }) {
  const [size,setSize]=useState({width:900,height:636});
  const replace = (next: PageElement) => onChange(elements.map((x) => (x.id === next.id ? next : x)));
  return (
    <View onLayout={event=>setSize({width:event.nativeEvent.layout.width||900,height:event.nativeEvent.layout.height||636})} pointerEvents={editable||onNavigateSource ? 'box-none' : 'none'} style={StyleSheet.absoluteFill}>
      {elements.map((element) =>
        element.kind === 'text' ? (
          <TextBox key={element.id} element={element} selected={selectedIds.includes(element.id)} canvasSize={size} editable={editable} onChange={replace} onNavigateSource={onNavigateSource} onDelete={() => onChange(elements.filter((x) => x.id !== element.id))} />
        ) : (
          <ImageBox key={element.id} element={element} selected={selectedIds.includes(element.id)} canvasSize={size} editable={editable} onChange={replace} onCommit={next=>onCommit?onCommit(element,next):replace(next)} onSave={onSaveImage ? () => onSaveImage(element) : undefined} onDelete={() => onChange(elements.filter((x) => x.id !== element.id))} />
        ),
      )}
    </View>
  );
}

function ImageBox({ element, canvasSize, editable, selected, onChange,onCommit, onDelete, onSave }: { element: ImageElement;canvasSize:{width:number;height:number}; editable: boolean;selected:boolean; onChange: (v: ImageElement) => void;onCommit:(v:ImageElement)=>void; onDelete: () => void; onSave?: () => void }) {
  const start = useRef({ x: element.x, y: element.y }),
    latest = useRef(element);
  latest.current = element;
  const cropping=element.fit==='cover',cropZoom=cropping?normalizeCropZoom(element.cropZoom):1,cropX=cropping?normalizeCropOffset(element.cropX):0,cropY=cropping?normalizeCropOffset(element.cropY):0,boxWidth=element.width*canvasSize.width,boxHeight=element.height*canvasSize.height;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: (_, g) => editable && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderGrant: () => {
          start.current = { x: latest.current.x, y: latest.current.y };
        },
        onPanResponderMove: (_, g) =>
          onChange({
            ...latest.current,
            x: Math.max(0, Math.min(1 - latest.current.width, start.current.x + g.dx / canvasSize.width)),
            y: Math.max(0, Math.min(1 - latest.current.height, start.current.y + g.dy / canvasSize.height)),
          }),
      }),
    [canvasSize.height,canvasSize.width,editable, onChange],
  );
  return (
    <View
      {...pan.panHandlers}
      style={[s.box, { left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, height: `${element.height * 100}%` }, editable && s.editable,selected&&s.selected]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.imageClip]}>
        <Image source={{ uri: element.uri }} resizeMode={element.fit ?? 'contain'} style={[StyleSheet.absoluteFill, { transform: [{translateX:cropX*boxWidth*.3},{translateY:cropY*boxHeight*.3},{scale:cropZoom},{ rotate: `${element.rotation ?? 0}deg` }] }]} />
      </View>
      {editable && (
        <>
        <View style={s.controls}>
          <Pressable
            accessibilityLabel="이미지 축소"
            onPress={() => onCommit({ ...element, width: Math.max(0.1, element.width - 0.05), height: Math.max(0.1, element.height - 0.05) })}
            style={s.control}
          >
            <Text>−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="이미지 확대"
            onPress={() => onCommit({ ...element, width: Math.min(0.9, element.width + 0.05), height: Math.min(0.9, element.height + 0.05) })}
            style={s.control}
          >
            <Text>＋</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={element.fit === 'cover' ? '이미지 전체 맞춤' : '이미지 영역 채우기 크롭'}
            onPress={() => onCommit({ ...element, fit: element.fit === 'cover' ? 'contain' : 'cover' })}
            style={s.control}
          >
            <Text>{element.fit === 'cover' ? '맞춤' : '채움'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="이미지 90도 회전"
            onPress={() => onCommit({ ...element, rotation: (((element.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270 })}
            style={s.control}
          >
            <Text>↻</Text>
          </Pressable>
          {onSave && <Pressable accessibilityLabel="스티커 컬렉션에 보관" onPress={onSave} style={s.control}><Text>보관</Text></Pressable>}
          <Pressable accessibilityLabel="이미지 삭제" onPress={onDelete} style={s.control}>
            <Text style={{ color: C.danger }}>삭제</Text>
          </Pressable>
        </View>
        {cropping&&<View style={s.cropControls}><Pressable accessibilityLabel="이미지 크롭 축소" onPress={()=>onCommit({...element,...adjustImageCrop(element,{zoom:-.25})})} style={s.control}><Text>−</Text></Pressable><Pressable accessibilityLabel="이미지 크롭 확대" onPress={()=>onCommit({...element,...adjustImageCrop(element,{zoom:.25})})} style={s.control}><Text>＋</Text></Pressable><Pressable accessibilityLabel="이미지 크롭 초점 왼쪽" onPress={()=>onCommit({...element,...adjustImageCrop(element,{x:-.1})})} style={s.control}><Text>←</Text></Pressable><Pressable accessibilityLabel="이미지 크롭 초점 오른쪽" onPress={()=>onCommit({...element,...adjustImageCrop(element,{x:.1})})} style={s.control}><Text>→</Text></Pressable><Pressable accessibilityLabel="이미지 크롭 초점 위쪽" onPress={()=>onCommit({...element,...adjustImageCrop(element,{y:-.1})})} style={s.control}><Text>↑</Text></Pressable><Pressable accessibilityLabel="이미지 크롭 초점 아래쪽" onPress={()=>onCommit({...element,...adjustImageCrop(element,{y:.1})})} style={s.control}><Text>↓</Text></Pressable></View>}
        </>
      )}
    </View>
  );
}

function TextBox({ element,canvasSize, editable,selected, onChange, onDelete,onNavigateSource }: { element: TextElement;canvasSize:{width:number;height:number}; editable: boolean;selected:boolean; onChange: (v: TextElement) => void; onDelete: () => void;onNavigateSource?:(source:NonNullable<TextElement['source']>)=>void }) {
  const start = useRef({ x: element.x, y: element.y });
  const latest = useRef(element);
  latest.current = element;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => editable,
        onMoveShouldSetPanResponder: (_, g) => editable && (Math.abs(g.dx) > 3 || Math.abs(g.dy) > 3),
        onPanResponderGrant: () => {
          start.current = { x: latest.current.x, y: latest.current.y };
        },
        onPanResponderMove: (_, g) =>
          onChange({ ...latest.current, x: Math.max(0, Math.min(1-latest.current.width, start.current.x + g.dx / canvasSize.width)), y: Math.max(0, Math.min(1-latest.current.height, start.current.y + g.dy / canvasSize.height)) }),
      }),
    [canvasSize.height,canvasSize.width,editable, onChange],
  );
  return (
    <View
      {...pan.panHandlers}
      style={[s.box, { left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, minHeight: element.height * canvasSize.height }, editable && s.editable,selected&&s.selected]}
    >
      {editable ? (
        <TextInput accessibilityLabel="텍스트 상자 내용" multiline value={element.text} onChangeText={(text) => onChange({ ...element, text })} style={[s.input, { fontSize: element.fontSize, color: element.color }]} />
      ) : (
        <Text style={{ fontSize: element.fontSize, color: element.color }}>{element.text}</Text>
      )}
      {element.source&&<Pressable accessibilityLabel={`원문 PDF ${element.source.pageIndex+1}쪽으로 이동`} onPress={()=>onNavigateSource?.(element.source!)} style={s.source}><Text style={s.sourceText}>↩ {element.source.pdfName??'PDF'} · {element.source.pageIndex+1}쪽</Text></Pressable>}
      {editable && (
        <View style={s.controls}>
          <Pressable accessibilityLabel="텍스트 크기 줄이기" onPress={() => onChange({ ...element, fontSize: Math.max(10, element.fontSize - 2) })} style={s.control}>
            <Text>−</Text>
          </Pressable>
          <Pressable accessibilityLabel="텍스트 크기 키우기" onPress={() => onChange({ ...element, fontSize: Math.min(72, element.fontSize + 2) })} style={s.control}>
            <Text>＋</Text>
          </Pressable>
          <Pressable accessibilityLabel="텍스트 상자 삭제" onPress={onDelete} style={s.control}>
            <Text style={{ color: C.danger }}>삭제</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  box: { position: 'absolute', padding: 7, borderRadius: 6 },
  imageClip: { overflow: 'hidden', borderRadius: 5 },
  editable: { borderWidth: 1, borderColor: C.accent, backgroundColor: 'rgba(255,255,255,.82)' },
  selected:{borderWidth:2,borderColor:C.accent,backgroundColor:'rgba(47,125,102,.10)'},
  input: { minHeight: 34, padding: 0, textAlignVertical: 'top' },
  source:{marginTop:6,alignSelf:'flex-start',paddingHorizontal:8,height:24,borderRadius:12,backgroundColor:C.accentSoft,justifyContent:'center'},sourceText:{fontSize:10,fontWeight:'800',color:C.accent},
  controls: {
    position: 'absolute',
    right: 0,
    top: '100%',
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  cropControls:{position:'absolute',right:0,top:'100%',marginTop:31,flexDirection:'row',backgroundColor:C.white,borderRadius:7,borderWidth:1,borderColor:C.line,overflow:'hidden'},
  control: { height: 28, minWidth: 30, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
