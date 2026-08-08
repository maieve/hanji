import {Image,StyleSheet,Text,View} from 'react-native';
import type {Page} from '../types';

const horizontal=(count:number,start=48,step=32)=><>{Array.from({length:count},(_,i)=><View key={`h${i}`} style={[s.horizontal,{top:start+i*step}]}/>)}</>;
const vertical=(count:number,start=42,step=32)=><>{Array.from({length:count},(_,i)=><View key={`v${i}`} style={[s.vertical,{left:start+i*step}]}/>)}</>;

export function Paper({template,customTemplateUri}:{template:Page['template'];customTemplateUri?:string}){
 if(customTemplateUri)return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Image source={{uri:customTemplateUri}} resizeMode="stretch" style={StyleSheet.absoluteFill}/></View>;
 if(template==='plain')return null;
 if(template==='line')return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{horizontal(24,54)}</View>;
 if(template==='grid')return <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.tint]}>{horizontal(28,0)}{vertical(30,0)}</View>;
 if(template==='dot')return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({length:22},(_,row)=><View key={row} style={[s.dotRow,{top:24+row*34}]}>{Array.from({length:26},(_,col)=><View key={col} style={s.dot}/>)}</View>)}</View>;
 if(template==='cornell')return <View pointerEvents="none" style={StyleSheet.absoluteFill}><View style={s.cornellLeft}/><View style={s.cornellBottom}/><Text style={[s.caption,{left:28,top:20}]}>CUES</Text><Text style={[s.caption,{left:'29%',top:20}]}>NOTES</Text><Text style={[s.caption,{left:28,bottom:92}]}>SUMMARY</Text>{horizontal(19,58)}</View>;
 if(template==='planner')return <View pointerEvents="none" style={StyleSheet.absoluteFill}><Text style={s.plannerTitle}>WEEKLY PLAN</Text><View style={s.plannerGrid}>{['MON','TUE','WED','THU','FRI','SAT','SUN'].map(day=><View key={day} style={s.day}><Text style={s.dayTitle}>{day}</Text>{Array.from({length:7},(_,i)=><View key={i} style={[s.plannerRule,{top:44+i*30}]}/>)}</View>)}</View></View>;
 return <View pointerEvents="none" style={[StyleSheet.absoluteFill,s.dark]}>{horizontal(24,54)}<Text style={s.darkCaption}>DARK PAPER</Text></View>;
}

const rule='#D9E0D8';
const s=StyleSheet.create({horizontal:{position:'absolute',left:32,right:32,height:1,backgroundColor:rule},vertical:{position:'absolute',top:0,bottom:0,width:1,backgroundColor:rule},tint:{backgroundColor:'#FCFDF9'},dotRow:{position:'absolute',left:24,right:24,flexDirection:'row',justifyContent:'space-between'},dot:{width:2,height:2,borderRadius:1,backgroundColor:'#BFC9BF'},cornellLeft:{position:'absolute',left:'25%',top:0,bottom:118,width:2,backgroundColor:'#BFD0C8'},cornellBottom:{position:'absolute',left:0,right:0,bottom:118,height:2,backgroundColor:'#BFD0C8'},caption:{position:'absolute',fontSize:10,fontWeight:'800',letterSpacing:1.2,color:'#789086'},plannerTitle:{fontSize:16,fontWeight:'800',letterSpacing:2,color:'#647A70',margin:24},plannerGrid:{flex:1,flexDirection:'row',marginHorizontal:24,marginBottom:24,borderTopWidth:1,borderLeftWidth:1,borderColor:rule},day:{flex:1,borderRightWidth:1,borderBottomWidth:1,borderColor:rule,overflow:'hidden'},dayTitle:{height:34,paddingTop:10,textAlign:'center',fontSize:9,fontWeight:'800',color:'#647A70'},plannerRule:{position:'absolute',left:6,right:6,height:1,backgroundColor:rule},dark:{backgroundColor:'#202522'},darkCaption:{position:'absolute',right:24,top:20,fontSize:9,fontWeight:'800',letterSpacing:1.4,color:'#75827B'}});
