import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { summarizeNativeAvailability } from './nativeDiagnosticPolicy';

export type NativeDiagnostic = { name: string; label: string; available: boolean };

const expected = [
  { name: 'HanjiCanvas', label: 'PencilKit 캔버스' },
  { name: 'HanjiDocumentCanvas', label: 'PDFKit 문서' },
  { name: 'HanjiVision', label: 'Vision OCR·내보내기' },
  { name: 'HanjiColorPicker', label: '시스템 컬러피커' },
  { name: 'HanjiSpeech', label: '온디바이스 음성' },
] as const;

export function nativeBuildIdentity() {
  return `${Constants.expoConfig?.version ?? 'dev'} (${Constants.nativeBuildVersion ?? 'dev'}) · ${String(Constants.expoConfig?.extra?.hanjiBuild ?? 'dev')}`;
}

export function collectNativeDiagnostics(): NativeDiagnostic[] {
  if (Platform.OS !== 'ios') return expected.map((item) => ({ ...item, available: true, label: `${item.label} · 웹 대체` }));
  return expected.map((item) => {
    try { return { ...item, available: Boolean(requireOptionalNativeModule(item.name)) }; }
    catch { return { ...item, available: false }; }
  });
}

export function nativeDiagnosticSummary(items: NativeDiagnostic[]) {
  return summarizeNativeAvailability(items);
}
