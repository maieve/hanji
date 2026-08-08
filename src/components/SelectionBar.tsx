import {Ionicons} from '@expo/vector-icons';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../theme';

type Props={count:number;color:string;onRecolor:()=>void;onCopy:()=>void;onCut:()=>void;onDuplicate:()=>void;onText:()=>void;onDelete:()=>void;onClose:()=>void};

export function SelectionBar({count,color,onRecolor,onCopy,onCut,onDuplicate,onText,onDelete,onClose}:Props){
 if(!count)return null;
 return <View style={s.bar}>
  <Text style={s.count}>{count}획</Text>
  <Pressable accessibilityLabel={`선택 획 색상을 ${color}로 변경`} onPress={onRecolor} style={s.action}><View style={[s.color,{backgroundColor:color}]}/></Pressable>
  <Pressable accessibilityLabel="선택 영역 PNG와 원본 획 복사" onPress={onCopy} style={s.action}><Ionicons name="clipboard-outline" size={16} color={C.accent}/></Pressable>
  <Pressable accessibilityLabel="선택 획 잘라내기" onPress={onCut} style={s.action}><Ionicons name="cut-outline" size={16} color={C.accent}/></Pressable>
  <Pressable accessibilityLabel="선택 획 복제" onPress={onDuplicate} style={s.action}><Ionicons name="copy-outline" size={16} color={C.accent}/></Pressable>
  <Pressable accessibilityLabel="선택 필기를 텍스트로 변환" onPress={onText} style={s.action}><Ionicons name="text-outline" size={16} color={C.accent}/></Pressable>
  <Pressable accessibilityLabel="선택 획 삭제" onPress={onDelete} style={s.action}><Ionicons name="trash-outline" size={16} color={C.danger}/></Pressable>
  <Pressable accessibilityLabel="선택 해제" onPress={onClose} style={s.close}><Ionicons name="close" size={17} color={C.muted}/></Pressable>
 </View>;
}

const s=StyleSheet.create({bar:{position:'absolute',top:16,left:'50%',transform:[{translateX:-190}],zIndex:30,height:44,minWidth:380,borderRadius:14,backgroundColor:'rgba(255,255,255,.97)',borderWidth:1,borderColor:C.line,shadowColor:'#000',shadowOpacity:.15,shadowRadius:12,flexDirection:'row',alignItems:'center',paddingHorizontal:10,gap:5},count:{fontSize:11,fontWeight:'800',color:C.ink,marginRight:2},action:{height:32,paddingHorizontal:7,borderRadius:9,backgroundColor:C.accentSoft,flexDirection:'row',alignItems:'center'},color:{width:14,height:14,borderRadius:7,borderWidth:1,borderColor:C.white},close:{width:30,height:30,alignItems:'center',justifyContent:'center'}});
