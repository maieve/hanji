import { useMemo, useRef } from 'react';
import { Image, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';
import type { ImageElement, PageElement, TextElement } from '../types';

export function ElementsLayer({ elements, editable, onChange, onSaveImage,onNavigateSource }: { elements: PageElement[]; editable: boolean; onChange: (v: PageElement[]) => void; onSaveImage?: (image: ImageElement) => void;onNavigateSource?:(source:NonNullable<TextElement['source']>)=>void }) {
  const replace = (next: PageElement) => onChange(elements.map((x) => (x.id === next.id ? next : x)));
  return (
    <View pointerEvents={editable||onNavigateSource ? 'box-none' : 'none'} style={StyleSheet.absoluteFill}>
      {elements.map((element) =>
        element.kind === 'text' ? (
          <TextBox key={element.id} element={element} editable={editable} onChange={replace} onNavigateSource={onNavigateSource} onDelete={() => onChange(elements.filter((x) => x.id !== element.id))} />
        ) : (
          <ImageBox key={element.id} element={element} editable={editable} onChange={replace} onSave={onSaveImage ? () => onSaveImage(element) : undefined} onDelete={() => onChange(elements.filter((x) => x.id !== element.id))} />
        ),
      )}
    </View>
  );
}

function ImageBox({ element, editable, onChange, onDelete, onSave }: { element: ImageElement; editable: boolean; onChange: (v: ImageElement) => void; onDelete: () => void; onSave?: () => void }) {
  const start = useRef({ x: element.x, y: element.y }),
    latest = useRef(element);
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
          onChange({
            ...latest.current,
            x: Math.max(0, Math.min(1 - latest.current.width, start.current.x + g.dx / 900)),
            y: Math.max(0, Math.min(1 - latest.current.height, start.current.y + g.dy / 636)),
          }),
      }),
    [editable, onChange],
  );
  return (
    <View
      {...pan.panHandlers}
      style={[s.box, { left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, height: `${element.height * 100}%` }, editable && s.editable]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, s.imageClip]}>
        <Image source={{ uri: element.uri }} resizeMode={element.fit ?? 'contain'} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${element.rotation ?? 0}deg` }] }]} />
      </View>
      {editable && (
        <View style={s.controls}>
          <Pressable
            accessibilityLabel="이미지 축소"
            onPress={() => onChange({ ...element, width: Math.max(0.1, element.width - 0.05), height: Math.max(0.1, element.height - 0.05) })}
            style={s.control}
          >
            <Text>−</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="이미지 확대"
            onPress={() => onChange({ ...element, width: Math.min(0.9, element.width + 0.05), height: Math.min(0.9, element.height + 0.05) })}
            style={s.control}
          >
            <Text>＋</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={element.fit === 'cover' ? '이미지 전체 맞춤' : '이미지 영역 채우기 크롭'}
            onPress={() => onChange({ ...element, fit: element.fit === 'cover' ? 'contain' : 'cover' })}
            style={s.control}
          >
            <Text>{element.fit === 'cover' ? '맞춤' : '채움'}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="이미지 90도 회전"
            onPress={() => onChange({ ...element, rotation: (((element.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270 })}
            style={s.control}
          >
            <Text>↻</Text>
          </Pressable>
          {onSave && <Pressable accessibilityLabel="스티커 컬렉션에 보관" onPress={onSave} style={s.control}><Text>보관</Text></Pressable>}
          <Pressable onPress={onDelete} style={s.control}>
            <Text style={{ color: C.danger }}>삭제</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function TextBox({ element, editable, onChange, onDelete,onNavigateSource }: { element: TextElement; editable: boolean; onChange: (v: TextElement) => void; onDelete: () => void;onNavigateSource?:(source:NonNullable<TextElement['source']>)=>void }) {
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
          onChange({ ...latest.current, x: Math.max(0, Math.min(0.82, start.current.x + g.dx / 900)), y: Math.max(0, Math.min(0.85, start.current.y + g.dy / 636)) }),
      }),
    [editable, onChange],
  );
  return (
    <View
      {...pan.panHandlers}
      style={[s.box, { left: `${element.x * 100}%`, top: `${element.y * 100}%`, width: `${element.width * 100}%`, minHeight: element.height * 636 }, editable && s.editable]}
    >
      {editable ? (
        <TextInput multiline value={element.text} onChangeText={(text) => onChange({ ...element, text })} style={[s.input, { fontSize: element.fontSize, color: element.color }]} />
      ) : (
        <Text style={{ fontSize: element.fontSize, color: element.color }}>{element.text}</Text>
      )}
      {element.source&&<Pressable accessibilityLabel={`원문 PDF ${element.source.pageIndex+1}쪽으로 이동`} onPress={()=>onNavigateSource?.(element.source!)} style={s.source}><Text style={s.sourceText}>↩ {element.source.pdfName??'PDF'} · {element.source.pageIndex+1}쪽</Text></Pressable>}
      {editable && (
        <View style={s.controls}>
          <Pressable onPress={() => onChange({ ...element, fontSize: Math.max(10, element.fontSize - 2) })} style={s.control}>
            <Text>−</Text>
          </Pressable>
          <Pressable onPress={() => onChange({ ...element, fontSize: Math.min(72, element.fontSize + 2) })} style={s.control}>
            <Text>＋</Text>
          </Pressable>
          <Pressable onPress={onDelete} style={s.control}>
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
  control: { height: 28, minWidth: 30, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
