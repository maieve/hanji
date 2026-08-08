import { DynamicColorIOS, Platform } from "react-native";
import {darkChrome,lightChrome,webDynamicColor} from './themePalette';

export const DOCUMENT_INK = "#20201E";
export const DOCUMENT_LIGHT_INK = "#F4F1E8";

const dynamic = (light: string, dark: string) =>
  (Platform.OS === "ios" ? DynamicColorIOS({ light, dark }) : Platform.OS === 'web' ? webDynamicColor(light,dark) : light) as unknown as string;

// App chrome follows iOS appearance. Document paper and stored ink colors do not.
export const C = {
  ink: dynamic(lightChrome.ink, darkChrome.ink),
  muted: dynamic(lightChrome.muted, darkChrome.muted),
  line: dynamic(lightChrome.line, darkChrome.line),
  paper: "#FFFEFA",
  canvas: dynamic(lightChrome.canvas, darkChrome.canvas),
  accent: dynamic(lightChrome.accent, darkChrome.accent),
  accentSoft: dynamic(lightChrome.accentSoft, darkChrome.accentSoft),
  sidebar: dynamic(lightChrome.sidebar, darkChrome.sidebar),
  white: dynamic(lightChrome.surface, darkChrome.surface),
  danger: dynamic(lightChrome.danger, darkChrome.danger),
  dangerSoft: dynamic(lightChrome.dangerSoft, darkChrome.dangerSoft),
};
