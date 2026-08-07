import {Ionicons} from '@expo/vector-icons';
import {RecordingPresets,requestRecordingPermissionsAsync,useAudioPlayer,useAudioPlayerStatus,useAudioRecorder,useAudioRecorderState} from 'expo-audio';
import {Alert,Pressable,StyleSheet,Text,View} from 'react-native';
import {C} from '../theme'; import type {AudioSession} from '../types';
export type AudioSaved=Omit<AudioSession,'strokes'>;
type Props={sessions:AudioSession[];onRecordingStart:(startedAt:number)=>void;onSaved:(v:AudioSaved)=>void};
const clock=(seconds:number)=>`${Math.floor(seconds/60)}:${String(Math.floor(seconds)%60).padStart(2,'0')}`;
export function AudioPanel({sessions,onRecordingStart,onSaved}:Props){
  const recorder=useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recording=useAudioRecorderState(recorder,250);
  const latest=sessions.at(-1);
  const player=useAudioPlayer(latest?.uri??null,{updateInterval:250});
  const playback=useAudioPlayerStatus(player);
  const toggleRecord=async()=>{
    if(recording.isRecording){
      await recorder.stop();
      if(recorder.uri)onSaved({uri:recorder.uri,createdAt:new Date().toISOString(),startedAt:(recorder as unknown as {__hanjiStartedAt?:number}).__hanjiStartedAt??Date.now()/1000-recording.durationMillis/1000,durationMs:recording.durationMillis});
      return;
    }
    const permission=await requestRecordingPermissionsAsync();
    if(!permission.granted){Alert.alert('마이크 권한','녹음하려면 설정에서 마이크 권한을 허용해 주세요.');return}
    await recorder.prepareToRecordAsync();
    const startedAt=Date.now()/1000;
    (recorder as unknown as {__hanjiStartedAt?:number}).__hanjiStartedAt=startedAt;
    onRecordingStart(startedAt);
    recorder.record();
  };
  const togglePlay=()=>{if(!latest)return;playback.playing?player.pause():player.play()};
  return <View style={s.wrap}>
    {latest&&<View style={s.playback}><Pressable onPress={togglePlay} style={s.round}><Ionicons name={playback.playing?'pause':'play'} size={15} color={C.accent}/></Pressable><View><Text style={s.title}>{clock(playback.currentTime)} / {clock(playback.duration||latest.durationMs/1000)}</Text><Text style={s.sub}>{latest.strokes.length}개 획 동기화</Text></View></View>}
    <Pressable onPress={toggleRecord} style={[s.record,recording.isRecording&&s.active]}><Ionicons name={recording.isRecording?'stop':'mic'} size={18} color="white"/><Text style={s.recordText}>{recording.isRecording?clock(recording.durationMillis/1000):'녹음'}</Text></Pressable>
  </View>
}
const s=StyleSheet.create({wrap:{position:'absolute',left:18,bottom:18,zIndex:10,flexDirection:'row',gap:8,alignItems:'center'},record:{height:42,paddingHorizontal:15,borderRadius:21,backgroundColor:C.accent,flexDirection:'row',alignItems:'center',gap:7},active:{backgroundColor:C.danger},recordText:{color:'white',fontWeight:'700'},playback:{height:46,borderRadius:15,backgroundColor:'rgba(255,255,255,.96)',borderWidth:1,borderColor:C.line,paddingHorizontal:10,flexDirection:'row',alignItems:'center',gap:8},round:{width:30,height:30,borderRadius:15,backgroundColor:C.accentSoft,alignItems:'center',justifyContent:'center'},title:{fontSize:11,fontWeight:'700',color:C.ink},sub:{fontSize:9,color:C.muted,marginTop:2}});
