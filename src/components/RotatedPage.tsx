import {useState,type ReactNode} from 'react';
import {StyleSheet,View,type StyleProp,type ViewStyle} from 'react-native';
import type {PageRotation} from '../types';

export function RotatedPage({rotation=0,style,children}:{rotation?:PageRotation;style?:StyleProp<ViewStyle>;children:ReactNode}){
 const [size,setSize]=useState({width:0,height:0});const odd=rotation===90||rotation===270;const innerWidth=odd?size.height:size.width,innerHeight=odd?size.width:size.height;
 return <View onLayout={event=>{const {width,height}=event.nativeEvent.layout;if(width!==size.width||height!==size.height)setSize({width,height})}} style={[s.outer,style,{aspectRatio:odd?1/1.414:1.414}]}>{size.width>0&&<View style={[s.inner,{width:innerWidth,height:innerHeight,left:(size.width-innerWidth)/2,top:(size.height-innerHeight)/2,transform:[{rotate:`${rotation}deg`}]}]}>{children}</View>}</View>;
}
const s=StyleSheet.create({outer:{overflow:'hidden'},inner:{position:'absolute'}});
