import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {useEffect,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
const KEY='hanji.privacy-lock.v1';

export function usePrivacyLock(){
 const [enabled,setEnabled]=useState(false),[locked,setLocked]=useState(false),[sessionRevision,setSessionRevision]=useState(0),backgrounded=useRef(false);
 useEffect(()=>{void AsyncStorage.getItem(KEY).then(value=>{const active=value==='true'&&Platform.OS!=='web';setEnabled(active);setLocked(active)})},[]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state==='background'||state==='inactive')backgrounded.current=true;else if(state==='active'&&backgrounded.current){backgrounded.current=false;setSessionRevision(value=>value+1);if(enabled)setLocked(true)}});return()=>subscription.remove()},[enabled]);
 const authenticate=async(promptMessage='yoojin note 잠금 해제')=>{if(Platform.OS==='web')return true;const result=await LocalAuthentication.authenticateAsync({promptMessage,cancelLabel:'취소',disableDeviceFallback:false});if(result.success)setLocked(false);return result.success};
 const toggle=async()=>{if(Platform.OS==='web')return false;const available=await LocalAuthentication.hasHardwareAsync();if(!available)return false;const success=await authenticate();if(!success)return false;const next=!enabled;setEnabled(next);setLocked(false);await AsyncStorage.setItem(KEY,String(next));return true};
 return{enabled,locked,sessionRevision,authenticate,toggle};
}
