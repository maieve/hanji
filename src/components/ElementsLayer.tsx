import {useMemo,useRef} from 'react';
import {PanResponder,Pressable,StyleSheet,Text,TextInput,View} from 'react-native';
import {C} from '../theme';
import type {TextElement} from '../types';

export function ElementsLayer({elements,editable,onChange}:{elements:TextElement[];editable:boolean;onChange:(v:TextElement[])=>void}){
 return <View pointerEvents={editable?'box-none':'none'} style={StyleSheet.absoluteFill}>{elements.map(element=><TextBox key={element.id} element={element} editable={editable} onChange={next=>onChange(elements.map(x=>x.id===next.id?next:x))} onDelete={()=>onChange(elements.filter(x=>x.id!==element.id))}/>)}</View>;
}

function TextBox({element,editable,onChange,onDelete}:{element:TextElement;editable:boolean;onChange:(v:TextElement)=>void;onDelete:()=>void}){
 const start=useRef({x:element.x,y:element.y});const latest=useRef(element);latest.current=element;
 const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>editable,onMoveShouldSetPanResponder:(_,g)=>editable&&(Math.abs(g.dx)>3||Math.abs(g.dy)>3),onPanResponderGrant:()=>{start.current={x:latest.current.x,y:latest.current.y}},onPanResponderMove:(_,g)=>onChange({...latest.current,x:Math.max(0,Math.min(.82,start.current.x+g.dx/900)),y:Math.max(0,Math.min(.85,start.current.y+g.dy/636))})}),[editable,onChange]);
 return <View {...pan.panHandlers} style={[s.box,{left:`${element.x*100}%`,top:`${element.y*100}%`,width:`${element.width*100}%`,minHeight:element.height*636},editable&&s.editable]}>{editable?<TextInput multiline value={element.text} onChangeText={text=>onChange({...element,text})} style={[s.input,{fontSize:element.fontSize,color:element.color}]}/>:<Text style={{fontSize:element.fontSize,color:element.color}}>{element.text}</Text>}{editable&&<View style={s.controls}><Pressable onPress={()=>onChange({...element,fontSize:Math.max(10,element.fontSize-2)})} style={s.control}><Text>−</Text></Pressable><Pressable onPress={()=>onChange({...element,fontSize:Math.min(72,element.fontSize+2)})} style={s.control}><Text>＋</Text></Pressable><Pressable onPress={onDelete} style={s.control}><Text style={{color:C.danger}}>삭제</Text></Pressable></View>}</View>;
}
const s=StyleSheet.create({box:{position:'absolute',padding:7,borderRadius:6},editable:{borderWidth:1,borderColor:C.accent,backgroundColor:'rgba(255,255,255,.82)'},input:{minHeight:34,padding:0,textAlignVertical:'top'},controls:{position:'absolute',right:0,top:'100%',flexDirection:'row',backgroundColor:C.white,borderRadius:7,borderWidth:1,borderColor:C.line,overflow:'hidden'},control:{height:28,minWidth:30,paddingHorizontal:6,alignItems:'center',justifyContent:'center'}});
