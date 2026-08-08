import {useState} from 'react';
import {Pressable,StyleSheet,Text,View,type GestureResponderEvent} from 'react-native';
import type {ToolKind} from '../types';
import {C} from '../theme';
import {brushPositionToWidth,brushWidthPresets,brushWidthToPosition,MAX_BRUSH_WIDTH,MIN_BRUSH_WIDTH,stepBrushWidth} from '../brushControls';

export function BrushWidthControl({kind,value,onChange,onComplete}:{kind:ToolKind;value:number;onChange:(value:number)=>void;onComplete:(value:number)=>void}){
  const [trackWidth,setTrackWidth]=useState(112);
  const presets=brushWidthPresets(kind);
  const update=(event:GestureResponderEvent,complete=false)=>{
    const width=brushPositionToWidth(event.nativeEvent.locationX/trackWidth);
    (complete?onComplete:onChange)(width);
  };
  const position=brushWidthToPosition(value);
  return <View accessibilityLabel="브러시 굵기 조절" style={s.root}>
    <View style={s.presets}>{presets.map(width=><Pressable key={width} accessibilityLabel={`굵기 프리셋 ${width}포인트`} accessibilityState={{selected:value===width}} onPress={()=>onComplete(width)} style={[s.preset,value===width&&s.active]}><View style={[s.dot,{width:Math.min(14,width+3),height:Math.min(14,width+3),borderRadius:9}]}/></Pressable>)}</View>
    <View
      accessible
      accessibilityLabel="브러시 굵기 슬라이더"
      accessibilityRole="adjustable"
      accessibilityValue={{min:MIN_BRUSH_WIDTH,max:MAX_BRUSH_WIDTH,now:value,text:`${value.toFixed(1)}포인트`}}
      accessibilityActions={[{name:'increment',label:'굵게'},{name:'decrement',label:'가늘게'}]}
      onAccessibilityAction={event=>onComplete(stepBrushWidth(value,event.nativeEvent.actionName==='increment'?1:-1))}
      onLayout={event=>setTrackWidth(Math.max(1,event.nativeEvent.layout.width))}
      onStartShouldSetResponder={()=>true}
      onMoveShouldSetResponder={()=>true}
      onResponderGrant={event=>update(event)}
      onResponderMove={event=>update(event)}
      onResponderRelease={event=>update(event,true)}
      onResponderTerminationRequest={()=>false}
      onResponderTerminate={event=>update(event,true)}
      style={s.slider}
    >
      <View pointerEvents="none" style={s.track}/><View pointerEvents="none" style={[s.fill,{width:`${position*100}%`}]} /><View pointerEvents="none" style={[s.thumb,{left:`${position*100}%`}]} />
    </View>
    <Text style={s.value}>{value.toFixed(1)}pt</Text>
  </View>;
}

const s=StyleSheet.create({
  root:{height:38,flexDirection:'row',alignItems:'center',gap:7,borderWidth:1,borderColor:C.line,borderRadius:10,paddingHorizontal:7},
  presets:{flexDirection:'row',alignItems:'center',gap:3},preset:{width:24,height:28,borderRadius:7,alignItems:'center',justifyContent:'center'},active:{backgroundColor:C.accentSoft},dot:{backgroundColor:C.accent},
  slider:{width:112,height:30,justifyContent:'center'},track:{height:4,borderRadius:2,backgroundColor:C.line},fill:{position:'absolute',left:0,height:4,borderRadius:2,backgroundColor:C.accent},thumb:{position:'absolute',marginLeft:-8,width:16,height:16,borderRadius:8,backgroundColor:C.white,borderWidth:2,borderColor:C.accent},
  value:{width:38,fontSize:9,fontWeight:'800',color:C.ink,textAlign:'right'},
});
