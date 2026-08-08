import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function HanjiRoot() {
  const { HanjiApp } = require('./src/HanjiApp') as typeof import('./src/HanjiApp');
  return <HanjiApp />;
}

class StartupErrorBoundary extends Component<
  { children: ReactNode },
  { error?: Error }
> {
  state: { error?: Error } = {};

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('yoojin note startup failed', error, info.componentStack);
  }

  render() {
    if (this.state.error)
      return (
        <View style={styles.failure}>
          <Text accessibilityRole="alert" style={styles.title}>
            앱을 시작하지 못했습니다
          </Text>
          <Text selectable style={styles.message}>
            {this.state.error.message}
          </Text>
          <Text style={styles.help}>
            이 화면을 캡처한 뒤 최신 IPA를 다시 설치하세요. 기존 노트 파일은
            삭제하지 않습니다.
          </Text>
        </View>
      );
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <StartupErrorBoundary>
        <HanjiRoot />
      </StartupErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  failure: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F7F5EF',
  },
  title: { fontSize: 22, fontWeight: '800', color: '#A53330' },
  message: {
    marginTop: 14,
    maxWidth: 680,
    color: '#302F2B',
    textAlign: 'center',
  },
  help: {
    marginTop: 12,
    maxWidth: 560,
    color: '#676B67',
    lineHeight: 20,
    textAlign: 'center',
  },
});
