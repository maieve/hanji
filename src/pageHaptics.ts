import * as Haptics from 'expo-haptics';
import {Platform} from 'react-native';
import {shouldPlayPageHaptic} from './pageHapticPolicy';
let configuredEnabled=true;
export function configurePageHaptics(enabled:boolean){configuredEnabled=enabled}
export function playConfiguredPageHaptic(from:number,to:number){playPageHaptic(configuredEnabled,from,to)}

export function playPageHaptic(enabled:boolean,from:number,to:number){
 if(Platform.OS!=='ios'||!shouldPlayPageHaptic(enabled,from,to))return;
 void Haptics.selectionAsync().catch(()=>undefined);
}
