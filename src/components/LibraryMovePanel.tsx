import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { folderBreadcrumb, folderDepth } from "../folders";
import { C } from "../theme";

export function LibraryMovePanel({ visible, count, categories, onMove, onClose }: {
  visible: boolean;
  count: number;
  categories: string[];
  onMove: (folder: string) => void;
  onClose: () => void;
}) {
  const folders = ["내 노트", ...categories.filter((folder) => folder !== "내 노트")];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="폴더 이동 닫기" style={s.scrim} onPress={onClose}>
        <Pressable accessibilityRole="none" style={s.card} onPress={() => undefined}>
          <View style={s.header}>
            <View>
              <Text style={s.eyebrow}>카테고리 이동</Text>
              <Text style={s.title}>선택한 {count}권 옮기기</Text>
            </View>
            <Pressable accessibilityLabel="폴더 이동 취소" onPress={onClose} style={s.close}><Ionicons name="close" size={22} color={C.ink}/></Pressable>
          </View>
          <Text style={s.help}>노트 내용·태그·잠금·즐겨찾기는 유지되고 폴더 위치만 변경됩니다.</Text>
          <ScrollView style={s.list} contentContainerStyle={s.listContent}>
            {folders.map((folder) => (
              <Pressable
                accessibilityLabel={`${folderBreadcrumb(folder)} 폴더로 ${count}권 이동`}
                key={folder}
                onPress={() => onMove(folder)}
                style={[s.folder, { paddingLeft: 14 + folderDepth(folder) * 18 }]}
              >
                <Ionicons name="folder-outline" size={19} color={C.accent}/>
                <Text numberOfLines={1} style={s.folderText}>{folderBreadcrumb(folder)}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.muted}/>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim:{flex:1,backgroundColor:"rgba(20,24,22,.34)",alignItems:"center",justifyContent:"center",padding:22},
  card:{width:"100%",maxWidth:480,maxHeight:"78%",backgroundColor:C.white,borderRadius:22,padding:18,borderWidth:1,borderColor:C.line},
  header:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},
  eyebrow:{fontSize:9,fontWeight:"900",letterSpacing:1.2,color:C.accent},
  title:{fontSize:21,fontWeight:"800",color:C.ink,marginTop:3},
  close:{width:38,height:38,borderRadius:12,backgroundColor:C.accentSoft,alignItems:"center",justifyContent:"center"},
  help:{fontSize:11,lineHeight:17,color:C.muted,marginTop:12,marginBottom:8},
  list:{minHeight:120},listContent:{gap:6,paddingVertical:5},
  folder:{minHeight:48,borderRadius:13,borderWidth:1,borderColor:C.line,backgroundColor:C.sidebar,flexDirection:"row",alignItems:"center",gap:9,paddingRight:12},
  folderText:{flex:1,fontSize:13,fontWeight:"700",color:C.ink},
});
