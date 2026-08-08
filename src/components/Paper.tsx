import { Image, StyleSheet, Text, View } from "react-native";
import type { Page } from "../types";
import { templateSpacingPoints } from "../templateSpacing";

const horizontal = (count: number, start = 48, step = 32) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <View key={`h${i}`} style={[s.horizontal, { top: start + i * step }]} />
    ))}
  </>
);
const vertical = (count: number, start = 42, step = 32) => (
  <>
    {Array.from({ length: count }, (_, i) => (
      <View key={`v${i}`} style={[s.vertical, { left: start + i * step }]} />
    ))}
  </>
);

export function Paper({
  template,
  templateSpacing,
  customTemplateUri,
  backgroundColor,
  backgroundOpacity = 0,
}: {
  template: Page["template"];
  templateSpacing?: Page["templateSpacing"];
  customTemplateUri?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
}) {
  const step = templateSpacingPoints(templateSpacing);
  let content: React.ReactNode = null;
  if (customTemplateUri)
    content = (
      <Image
        source={{ uri: customTemplateUri }}
        resizeMode="stretch"
        style={StyleSheet.absoluteFill}
      />
    );
  else if (template === "line") content = horizontal(36, step, step);
  else if (template === "grid")
    content = (
      <View style={[StyleSheet.absoluteFill, s.tint]}>
        {horizontal(40, 0, step)}
        {vertical(40, 0, step)}
      </View>
    );
  else if (template === "dot")
    content = Array.from({ length: 32 }, (_, row) => (
      <View key={row} style={[s.dotRow, { top: step + row * step }]}>
        {Array.from({ length: 36 }, (_, col) => (
          <View key={col} style={[s.dot, { marginRight: step - 2 }]} />
        ))}
      </View>
    ));
  else if (template === "cornell")
    content = (
      <>
        <View style={s.cornellLeft} />
        <View style={s.cornellBottom} />
        <Text style={[s.caption, { left: 28, top: 20 }]}>CUES</Text>
        <Text style={[s.caption, { left: "29%", top: 20 }]}>NOTES</Text>
        <Text style={[s.caption, { left: 28, bottom: 92 }]}>SUMMARY</Text>
        {horizontal(30, step * 2, step)}
      </>
    );
  else if (template === "planner")
    content = (
      <>
        <Text style={s.plannerTitle}>WEEKLY PLAN</Text>
        <View style={s.plannerGrid}>
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
            <View key={day} style={s.day}>
              <Text style={s.dayTitle}>{day}</Text>
              {Array.from({ length: 7 }, (_, i) => (
                <View key={i} style={[s.plannerRule, { top: 44 + i * 30 }]} />
              ))}
            </View>
          ))}
        </View>
      </>
    );
  else if(template==='flashcard')
    content=(<><View style={s.flashcardDivider}/><Text style={[s.flashcardLabel,{top:22}]}>QUESTION</Text><Text style={[s.flashcardLabel,{top:'52%'}]}>ANSWER</Text></>);
  else if (template === "dark")
    content = (
      <View style={[StyleSheet.absoluteFill, s.dark]}>
        {horizontal(36, step, step)}
        <Text style={s.darkCaption}>DARK PAPER</Text>
      </View>
    );
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {content}
      {backgroundColor && backgroundOpacity > 0 && (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor, opacity: backgroundOpacity },
          ]}
        />
      )}
    </View>
  );
}

const rule = "#D9E0D8";
const s = StyleSheet.create({
  horizontal: {
    position: "absolute",
    left: 32,
    right: 32,
    height: 1,
    backgroundColor: rule,
  },
  vertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: rule,
  },
  tint: { backgroundColor: "#FCFDF9" },
  dotRow: {
    position: "absolute",
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dot: { width: 2, height: 2, borderRadius: 1, backgroundColor: "#BFC9BF" },
  cornellLeft: {
    position: "absolute",
    left: "25%",
    top: 0,
    bottom: 118,
    width: 2,
    backgroundColor: "#BFD0C8",
  },
  cornellBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 118,
    height: 2,
    backgroundColor: "#BFD0C8",
  },
  caption: {
    position: "absolute",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#789086",
  },
  plannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 2,
    color: "#647A70",
    margin: 24,
  },
  plannerGrid: {
    flex: 1,
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: rule,
  },
  day: {
    flex: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: rule,
    overflow: "hidden",
  },
  dayTitle: {
    height: 34,
    paddingTop: 10,
    textAlign: "center",
    fontSize: 9,
    fontWeight: "800",
    color: "#647A70",
  },
  plannerRule: {
    position: "absolute",
    left: 6,
    right: 6,
    height: 1,
    backgroundColor: rule,
  },
  dark: { backgroundColor: "#202522" },
  flashcardDivider:{position:'absolute',left:24,right:24,top:'50%',height:2,backgroundColor:'#8CB6A6'},
  flashcardLabel:{position:'absolute',left:28,fontSize:10,fontWeight:'900',letterSpacing:1.5,color:'#5C8B79'},
  darkCaption: {
    position: "absolute",
    right: 24,
    top: 20,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#75827B",
  },
});
