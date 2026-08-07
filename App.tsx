import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HanjiApp } from './src/HanjiApp';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <HanjiApp />
    </SafeAreaProvider>
  );
}
