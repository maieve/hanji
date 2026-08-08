import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import {useEffect,useRef,useState} from 'react';
import {AppState,Platform} from 'react-native';
const KEY='hanji.privacy-lock.v1';

export function usePrivacyLock(){
 const [enabled,setEnabled]=useState(false),[locked,setLocked]=useState(false),backgrounded=useRef(false);
 useEffect(()=>{void AsyncStorage.getItem(KEY).then(value=>{const active=value==='true'&&Platform.OS!=='web';setEnabled(active);setLocked(active)})},[]);
 useEffect(()=>{const subscription=AppState.addEventListener('change',state=>{if(state==='background'||state==='inactive')backgrounded.current=true;else if(state==='active'&&backgrounded.current&&enabled){backgrounded.current=false;setLocked(true)}});return()=>subscription.remove()},[enabled]);
 const authenticate=async()=>{const result=await LocalAuthentication.authenticateAsync({promptMessage:'Hanji 잠금 해제',cancelLabel:'취소',disableDeviceFallback:false});if(result.success)setLocked(false);return result.success};
 const toggle=async()=>{if(Platform.OS==='web')return false;const available=await LocalAuthentication.hasHardwareAsync();if(!available)return false;const success=await authenticate();if(!success)return false;const next=!enabled;setEnabled(next);setLocked(false);await AsyncStorage.setItem(KEY,String(next));return true};
 return{enabled,locked,authenticate,toggle};
}
