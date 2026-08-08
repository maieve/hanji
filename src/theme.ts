import { DynamicColorIOS, Platform } from "react-native";

export const DOCUMENT_INK = "#20201E";
export const DOCUMENT_LIGHT_INK = "#F4F1E8";

const dynamic = (light: string, dark: string) =>
  (Platform.OS === "ios"
    ? DynamicColorIOS({ light, dark })
    : light) as unknown as string;

// App chrome follows iOS appearance. Document paper and stored ink colors do not.
export const C = {
  ink: dynamic("#20201E", "#F4F1E8"),
  muted: dynamic("#76736B", "#AAA79F"),
  line: dynamic("#E7E3DA", "#3B403C"),
  paper: "#FFFEFA",
  canvas: dynamic("#EFEEE9", "#111412"),
  accent: dynamic("#225D50", "#65B89D"),
  accentSoft: dynamic("#DCEAE5", "#263D35"),
  sidebar: dynamic("#F7F5EF", "#1B1F1C"),
  white: dynamic("#FFFFFF", "#202522"),
  danger: dynamic("#C55448", "#E47A70"),
};
