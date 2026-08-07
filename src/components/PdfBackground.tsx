import {StyleSheet,View} from 'react-native'; import {WebView} from 'react-native-webview';
export function PdfBackground({uri}:{uri?:string}){if(!uri)return null;return <View pointerEvents="none" style={StyleSheet.absoluteFill}><WebView source={{uri}} style={{flex:1,backgroundColor:'white'}} scrollEnabled={false} originWhitelist={['*']}/></View>}
