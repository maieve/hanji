import {StyleSheet,View} from 'react-native';
import type {OcrWord} from '../types';

export function SearchHighlight({words,query}:{words:OcrWord[];query?:string}){
 const tokens=(query??'').toLocaleLowerCase().split(/\s+/).filter(Boolean);
 if(!tokens.length)return null;
 const matches=words.filter(word=>word.coordinateSpace==='canvas'&&tokens.some(token=>word.text.toLocaleLowerCase().includes(token)));
 if(!matches.length)return null;
 return <View pointerEvents="none" accessibilityLabel={`검색 결과 ${matches.length}개`} style={StyleSheet.absoluteFill}>{matches.map((word,index)=><View key={`${word.text}-${index}`} style={[s.box,{left:word.x-3,top:word.y-2,width:word.width+6,height:word.height+4}]}/>)}</View>;
}

const s=StyleSheet.create({box:{position:'absolute',borderRadius:4,backgroundColor:'rgba(255,210,46,.30)',borderWidth:2,borderColor:'rgba(232,160,0,.9)'}});
