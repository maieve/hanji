import { StyleSheet, View } from 'react-native';
import type { Page } from '../types';

export function Paper({ template }: { template: Page['template'] }) {
  if (template === 'plain') return null;
  if (template === 'line') {
    return <View pointerEvents="none" style={StyleSheet.absoluteFill}>{Array.from({ length: 24 }, (_, i) => <View key={i} style={[s.line, { top: 54 + i * 32 }]} />)}</View>;
  }
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, template === 'grid' ? s.grid : s.dots]} />
  );
}

const s = StyleSheet.create({
  line: { position: 'absolute', left: 42, right: 42, height: 1, backgroundColor: '#DFE4DD' },
  grid: { opacity: 0.32, backgroundColor: '#F8FAF7' },
  dots: { opacity: 0.25, backgroundColor: '#F7F7F3' },
});
