import {Ionicons} from '@expo/vector-icons';
import {useEffect,useState} from 'react';
import {Modal,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {folderBreadcrumb,folderLabel} from '../folders';
import {C} from '../theme';

export function FolderManager({folder,noteCount,onRename,onDelete,onClose}:{folder:string|null;noteCount:number;onRename:(name:string)=>void;onDelete:()=>void;onClose:()=>void}){
 const [name,setName]=useState('');useEffect(()=>setName(folder?folderLabel(folder):''),[folder]);if(!folder)return null;
 const valid=!!name.trim()&&!/[\\/]/.test(name);
 return <Modal visible transparent animationType="fade" onRequestClose={onClose}><Pressable style={s.scrim} onPress={onClose}><Pressable style={s.sheet} onPress={()=>undefined}>
  <View style={s.header}><View style={{flex:1}}><Text style={s.eyebrow}>폴더 관리</Text><Text numberOfLines={1} style={s.path}>{folderBreadcrumb(folder)}</Text></View><Pressable accessibilityLabel="닫기" onPress={onClose} style={s.icon}><Ionicons name="close" size={22} color={C.ink}/></Pressable></View>
  <Text style={s.label}>폴더 이름</Text><TextInput autoFocus value={name} onChangeText={setName} selectTextOnFocus returnKeyType="done" onSubmitEditing={()=>{if(valid)onRename(name.trim())}} style={s.input}/><Text style={s.help}>하위 폴더와 {noteCount}개 노트의 경로도 함께 바뀝니다.</Text>
  <View style={s.footer}><Pressable accessibilityLabel="폴더 삭제" onPress={onDelete} style={s.delete}><Ionicons name="trash-outline" size={18} color={C.danger}/><Text style={s.deleteText}>폴더 삭제</Text></Pressable><Pressable disabled={!valid} onPress={()=>onRename(name.trim())} style={[s.done,!valid&&s.disabled]}><Text style={s.doneText}>이름 변경</Text></Pressable></View>
  <Text style={s.warning}>삭제해도 노트는 지워지지 않고 상위 폴더로 이동합니다.</Text>
 </Pressable></Pressable></Modal>;
}
const s=StyleSheet.create({scrim:{flex:1,backgroundColor:'rgba(25,27,24,.3)',alignItems:'center',justifyContent:'center',padding:24},sheet:{width:'100%',maxWidth:480,backgroundColor:C.white,borderRadius:24,padding:24,shadowColor:'#000',shadowOpacity:.18,shadowRadius:24},header:{flexDirection:'row',alignItems:'center'},eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:1,color:C.accent},path:{fontSize:20,fontWeight:'800',color:C.ink,marginTop:4},icon:{width:40,height:40,alignItems:'center',justifyContent:'center'},label:{fontSize:12,fontWeight:'800',color:C.muted,marginTop:24,marginBottom:8},input:{height:48,borderWidth:1,borderColor:C.line,borderRadius:13,paddingHorizontal:14,fontSize:16,color:C.ink},help:{fontSize:11,color:C.muted,marginTop:7},footer:{flexDirection:'row',alignItems:'center',marginTop:24},delete:{height:42,flexDirection:'row',alignItems:'center',gap:7},deleteText:{fontWeight:'800',color:C.danger},done:{marginLeft:'auto',height:42,borderRadius:12,backgroundColor:C.accent,paddingHorizontal:18,alignItems:'center',justifyContent:'center'},disabled:{opacity:.35},doneText:{color:C.white,fontWeight:'800'},warning:{fontSize:10,color:C.muted,marginTop:12}});
