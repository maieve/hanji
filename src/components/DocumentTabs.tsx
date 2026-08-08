import {Ionicons} from '@expo/vector-icons';
import {Pressable,ScrollView,StyleSheet,Text,View} from 'react-native';
import {C} from '../theme';
import type {Notebook} from '../types';

export function DocumentTabs({ids,items,activeId,onSelect,onClose}:{ids:string[];items:Notebook[];activeId:string;onSelect:(id:string)=>void;onClose:(id:string)=>void}){
 const lookup=new Map(items.map(n=>[n.id,n]));
 return <View style={s.bar}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>{ids.map(id=>{const note=lookup.get(id);if(!note)return null;const active=id===activeId;return <Pressable key={id} onPress={()=>onSelect(id)} style={[s.tab,active&&s.active]}><Ionicons name={note.pages.some(p=>p.pdfUri)?'document-text-outline':'book-outline'} size={14} color={active?C.accent:C.muted}/><Text numberOfLines={1} style={[s.label,active&&s.activeLabel]}>{note.title}</Text><Pressable accessibilityLabel={`${note.title} 탭 닫기`} hitSlop={8} onPress={()=>onClose(id)} style={s.close}><Ionicons name="close" size={14} color={C.muted}/></Pressable></Pressable>})}</ScrollView></View>;
}
const s=StyleSheet.create({bar:{height:38,backgroundColor:'#F5F3EE',borderBottomWidth:1,borderBottomColor:C.line},list:{paddingHorizontal:12,alignItems:'flex-end',gap:4},tab:{height:32,minWidth:110,maxWidth:210,paddingHorizontal:10,borderTopLeftRadius:9,borderTopRightRadius:9,flexDirection:'row',alignItems:'center',gap:7},active:{backgroundColor:C.white,borderWidth:1,borderBottomWidth:0,borderColor:C.line},label:{flex:1,fontSize:11,fontWeight:'700',color:C.muted},activeLabel:{color:C.ink},close:{width:20,height:20,alignItems:'center',justifyContent:'center'}});
