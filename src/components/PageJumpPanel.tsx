import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { pageJumpIndex } from "../pageJump";
import { C } from "../theme";

export function PageJumpPanel({
  visible,
  currentIndex,
  pageCount,
  pdfPageIndex,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentIndex: number;
  pageCount: number;
  pdfPageIndex?: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  const input = useRef<TextInput>(null);
  const [value, setValue] = useState(String(currentIndex + 1));
  const target = pageJumpIndex(value, pageCount);
  useEffect(() => {
    if (!visible) return;
    setValue(String(currentIndex + 1));
    const timer = setTimeout(() => input.current?.focus(), 250);
    return () => clearTimeout(timer);
  }, [visible, currentIndex]);
  const submit = () => {
    if (target === undefined) return;
    onSelect(target);
    onClose();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable accessibilityLabel="페이지 이동 닫기" style={s.scrim} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <Pressable accessibilityViewIsModal style={s.card} onPress={() => undefined}>
            <Text style={s.eyebrow}>PAGE NAVIGATION</Text>
            <Text style={s.title}>페이지로 이동</Text>
            <Text style={s.help}>
              현재 노트 {currentIndex + 1} / {pageCount}쪽
              {pdfPageIndex === undefined ? "" : ` · PDF 원본 ${pdfPageIndex + 1}쪽`}
            </Text>
            <View style={s.inputRow}>
              <TextInput
                ref={input}
                accessibilityLabel={`이동할 페이지, 1에서 ${pageCount}`}
                value={value}
                onChangeText={setValue}
                onSubmitEditing={submit}
                keyboardType="number-pad"
                returnKeyType="go"
                selectTextOnFocus
                style={[s.input, target === undefined && s.inputInvalid]}
              />
              <Text style={s.total}>/ {pageCount}</Text>
            </View>
            {target === undefined && <Text style={s.error}>1–{pageCount} 사이의 페이지를 입력하세요.</Text>}
            <View style={s.shortcuts}>
              <Pressable accessibilityLabel="첫 페이지" onPress={() => setValue("1")} style={s.secondary}><Text style={s.secondaryText}>처음</Text></Pressable>
              <Pressable accessibilityLabel="마지막 페이지" onPress={() => setValue(String(pageCount))} style={s.secondary}><Text style={s.secondaryText}>마지막</Text></Pressable>
            </View>
            <View style={s.actions}>
              <Pressable onPress={onClose} style={s.cancel}><Text style={s.cancelText}>취소</Text></Pressable>
              <Pressable accessibilityState={{ disabled: target === undefined }} disabled={target === undefined} onPress={submit} style={[s.go, target === undefined && s.disabled]}><Text style={s.goText}>이동</Text></Pressable>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  scrim:{flex:1,backgroundColor:"rgba(30,30,28,.42)",justifyContent:"center",padding:24},
  card:{width:"100%",maxWidth:430,alignSelf:"center",backgroundColor:C.sidebar,borderRadius:22,padding:24,shadowColor:"#000",shadowOpacity:.2,shadowRadius:24},
  eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.2,color:C.accent},
  title:{fontSize:25,fontWeight:"800",color:C.ink,marginTop:5},
  help:{fontSize:13,color:C.muted,marginTop:8},
  inputRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",marginTop:24},
  input:{width:128,height:64,borderWidth:2,borderColor:C.accent,borderRadius:14,backgroundColor:C.white,textAlign:"center",fontSize:30,fontWeight:"800",color:C.ink},
  inputInvalid:{borderColor:C.danger},
  total:{fontSize:17,fontWeight:"700",color:C.muted,marginLeft:12},
  error:{textAlign:"center",fontSize:12,color:C.danger,marginTop:8},
  shortcuts:{flexDirection:"row",justifyContent:"center",gap:8,marginTop:16},
  secondary:{minHeight:40,paddingHorizontal:18,borderRadius:11,borderWidth:1,borderColor:C.line,backgroundColor:C.white,alignItems:"center",justifyContent:"center"},
  secondaryText:{fontWeight:"700",color:C.accent},
  actions:{flexDirection:"row",gap:10,marginTop:22},
  cancel:{flex:1,minHeight:48,borderRadius:13,backgroundColor:C.white,borderWidth:1,borderColor:C.line,alignItems:"center",justifyContent:"center"},
  cancelText:{fontWeight:"800",color:C.muted},
  go:{flex:1,minHeight:48,borderRadius:13,backgroundColor:C.accent,alignItems:"center",justifyContent:"center"},
  disabled:{opacity:.4},
  goText:{fontWeight:"800",color:C.white},
});
