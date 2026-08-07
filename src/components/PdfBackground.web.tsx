import {createElement} from 'react'; import {StyleSheet,View} from 'react-native';
export function PdfBackground({uri}:{uri?:string}){if(!uri)return null;return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{createElement('iframe',{src:uri,style:{border:0,width:'100%',height:'100%',pointerEvents:'none'}})}</View>}
