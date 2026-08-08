import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { ToolKind, ToolSpec } from '../types';
import { C } from '../theme';

const tools: { kind: ToolKind; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { kind: 'pen', icon: 'pencil', label: '볼펜' },
  { kind: 'fountainPen', icon: 'create-outline', label: '만년필' },
  { kind: 'monoline', icon: 'remove-outline', label: '모노라인' },
  { kind: 'pencil', icon: 'pencil-outline', label: '연필' },
  { kind: 'crayon', icon: 'color-palette-outline', label: '크레용' },
  { kind: 'watercolor', icon: 'water-outline', label: '수채화' },
  { kind: 'marker', icon: 'brush', label: '형광펜' },
  { kind: 'eraser', icon: 'backspace-outline', label: '지우개' },
  { kind: 'lasso', icon: 'scan-outline', label: '라쏘' },
  { kind: 'shape', icon: 'shapes-outline', label: '도형' },
];
const colors = ['#20201E', '#225D50', '#315E9C', '#A4493D', '#8A653E'];
const eraserLabels = {vector:'획',bitmap:'픽셀',fixedWidthBitmap:'고정'} as const;
const shapeLabels = {line:'선',arrow:'화살표',ellipse:'원',rectangle:'사각',triangle:'삼각'} as const;

export function Toolbar({ tool, setTool, onLibrary, title, onTitleChange, onAddPage, onUndo, onRedo, fingerDrawingEnabled, onToggleFingerDrawing, zoomWindowEnabled, onToggleZoomWindow, elementMode, onAddText, onAddImage, onExportPdf, onFlashcards, dueCards, onPdfOutline, outlineCount }: { tool: ToolSpec; setTool: (v: ToolSpec) => void; onLibrary: () => void; title: string; onTitleChange: (v: string) => void; onAddPage: () => void; onUndo:()=>void; onRedo:()=>void; fingerDrawingEnabled:boolean; onToggleFingerDrawing:()=>void;zoomWindowEnabled:boolean;onToggleZoomWindow:()=>void;elementMode:boolean;onAddText:()=>void;onAddImage:()=>void; onExportPdf:()=>void;onFlashcards:()=>void;dueCards:number;onPdfOutline?:()=>void;outlineCount:number }) {
  return <View style={s.bar}>
    <Pressable onPress={onLibrary} style={s.nav}><Ionicons name="library-outline" size={20} color={C.ink} /><Text style={s.navText}>서재</Text></Pressable>
    <TextInput value={title} onChangeText={onTitleChange} selectTextOnFocus style={s.title} accessibilityLabel="노트 제목" /><View style={s.rule} />
    <ScrollView horizontal contentContainerStyle={s.tools} showsHorizontalScrollIndicator={false}>
      {tools.map(x => <Pressable accessibilityLabel={x.label} key={x.kind} onPress={() => setTool({ ...tool, kind: x.kind })} style={[s.tool, tool.kind === x.kind && s.selected]}><Ionicons name={x.icon} size={21} color={tool.kind === x.kind ? C.accent : C.muted} /></Pressable>)}
      <Pressable accessibilityLabel="자" onPress={()=>setTool({...tool,rulerActive:!tool.rulerActive})} style={[s.tool,tool.rulerActive&&s.selected]}><Ionicons name="resize-outline" size={21} color={tool.rulerActive?C.accent:C.muted}/></Pressable>
      <Pressable accessibilityLabel="긁어서 지우기" onPress={()=>setTool({...tool,scratchEnabled:!(tool.scratchEnabled??true)})} style={[s.tool,(tool.scratchEnabled??true)&&s.selected]}><Ionicons name="remove-circle-outline" size={21} color={(tool.scratchEnabled??true)?C.accent:C.muted}/></Pressable>
      {tool.kind==='eraser'&&<View style={s.segment}>{(Object.keys(eraserLabels) as (keyof typeof eraserLabels)[]).map(mode=><Pressable key={mode} onPress={()=>setTool({...tool,eraserMode:mode})} style={[s.segmentButton,(tool.eraserMode??'vector')===mode&&s.segmentActive]}><Text style={s.segmentText}>{eraserLabels[mode]}</Text></Pressable>)}</View>}
      {tool.kind==='shape'&&<View style={s.segment}>{(Object.keys(shapeLabels) as (keyof typeof shapeLabels)[]).map(shapeKind=><Pressable key={shapeKind} onPress={()=>setTool({...tool,shapeKind})} style={[s.segmentButton,(tool.shapeKind??'line')===shapeKind&&s.segmentActive]}><Text style={s.segmentText}>{shapeLabels[shapeKind]}</Text></Pressable>)}</View>}
      <View style={s.colors}>{colors.map(color => <Pressable key={color} onPress={() => setTool({ ...tool, color })} style={[s.color, { backgroundColor: color }, tool.color === color && s.colorSelected]} />)}</View>
      <TextInput accessibilityLabel="HEX 색상" value={tool.color} autoCapitalize="characters" maxLength={7} onChangeText={color=>{if(/^#[0-9A-Fa-f]{0,6}$/.test(color))setTool({...tool,color})}} style={s.hex} />
      {[1, 2, 5, 9, 16, 28].map(width => <Pressable key={width} onPress={() => setTool({ ...tool, width })} style={[s.width, tool.width === width && s.selected]}><View style={{ width: width + 3, height: width + 3, borderRadius: 20, backgroundColor: C.ink }} /></Pressable>)}
      <View style={{flexDirection:'row',alignItems:'center',gap:3,marginLeft:4}}>{[0.25,0.5,0.75,1].map(opacity=><Pressable accessibilityLabel={`불투명도 ${opacity*100}%`} key={opacity} onPress={()=>setTool({...tool,opacity})} style={[s.opacity,tool.opacity===opacity&&s.selected]}><Text style={s.opacityText}>{opacity*100}</Text></Pressable>)}</View>
    </ScrollView>
    <Pressable accessibilityLabel="플래시카드" onPress={onFlashcards} style={s.tool}><Ionicons name="albums-outline" size={20} color={C.accent}/>{dueCards>0&&<View style={s.badge}><Text style={s.badgeText}>{Math.min(99,dueCards)}</Text></View>}</Pressable>
    {onPdfOutline&&<Pressable accessibilityLabel={`PDF 목차 ${outlineCount}개`} disabled={!outlineCount} onPress={onPdfOutline} style={[s.tool,!outlineCount&&{opacity:.35}]}><Ionicons name="list-outline" size={20} color={C.accent}/></Pressable>}
    <Pressable accessibilityLabel="PDF 내보내기" onPress={onExportPdf} style={s.tool}><Ionicons name="share-outline" size={20} color={C.accent}/></Pressable>
    <Pressable accessibilityLabel="실행 취소" onPress={onUndo} style={s.tool}><Ionicons name="arrow-undo" size={20} color={C.muted}/></Pressable>
    <Pressable accessibilityLabel="다시 실행" onPress={onRedo} style={s.tool}><Ionicons name="arrow-redo" size={20} color={C.muted}/></Pressable>
    <Pressable accessibilityLabel="손가락 필기" onPress={onToggleFingerDrawing} style={[s.tool,fingerDrawingEnabled&&s.selected]}><Ionicons name="hand-left-outline" size={20} color={fingerDrawingEnabled?C.accent:C.muted}/></Pressable>
    <Pressable accessibilityLabel="확대 필기창 자동 전진" onPress={onToggleZoomWindow} style={[s.tool,zoomWindowEnabled&&s.selected]}><Ionicons name="scan-circle-outline" size={21} color={zoomWindowEnabled?C.accent:C.muted}/></Pressable>
    <Pressable accessibilityLabel="텍스트 상자 추가" onPress={onAddText} style={[s.tool,elementMode&&s.selected]}><Ionicons name="text-outline" size={21} color={elementMode?C.accent:C.muted}/></Pressable>
    <Pressable accessibilityLabel="이미지 삽입" onPress={onAddImage} style={s.tool}><Ionicons name="image-outline" size={21} color={C.accent}/></Pressable>
    <Pressable onPress={onAddPage} style={s.add}><Ionicons name="add" size={20} color="white" /><Text style={s.addText}>페이지</Text></Pressable>
  </View>;
}

const s = StyleSheet.create({
  bar: { height: 64, backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 }, navText: { fontSize: 14, fontWeight: '600', color: C.ink }, title: { maxWidth: 160, fontWeight: '700', color: C.ink },
  rule: { height: 28, width: 1, backgroundColor: C.line }, tools: { alignItems: 'center', gap: 6 }, tool: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, selected: { backgroundColor: C.accentSoft },
  segment:{height:34,flexDirection:'row',borderWidth:1,borderColor:C.line,borderRadius:9,overflow:'hidden'},segmentButton:{paddingHorizontal:8,alignItems:'center',justifyContent:'center'},segmentActive:{backgroundColor:C.accentSoft},segmentText:{fontSize:10,fontWeight:'700',color:C.muted},
  colors: { flexDirection: 'row', gap: 7, paddingHorizontal: 8 }, color: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: C.white }, colorSelected: { outlineWidth: 2, outlineColor: C.accent, outlineOffset: 2 } as never,
  hex:{height:32,width:72,borderWidth:1,borderColor:C.line,borderRadius:8,paddingHorizontal:7,fontSize:11,color:C.ink},opacity:{height:30,minWidth:31,borderRadius:8,alignItems:'center',justifyContent:'center',paddingHorizontal:3},opacityText:{fontSize:9,color:C.muted,fontWeight:'700'}, width: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },badge:{position:'absolute',right:0,top:0,minWidth:16,height:16,borderRadius:8,backgroundColor:C.danger,alignItems:'center',justifyContent:'center',paddingHorizontal:3},badgeText:{fontSize:9,fontWeight:'800',color:C.white}, add: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 12, height: 38, gap: 4 }, addText: { color: 'white', fontWeight: '700' },
});
