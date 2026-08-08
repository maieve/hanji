import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useWindowDimensions, type ViewToken } from 'react-native';
import type { Page, PageElement, ToolSpec } from '../types';
import { C } from '../theme';
import { DocumentCanvas, type PdfOutlineItem } from './DocumentCanvas';
import { ElementsLayer } from './ElementsLayer';
import { Paper } from './Paper';
import { RotatedPage } from './RotatedPage';

type Props = {
  pages: Page[];
  activeIndex: number;
  tool: ToolSpec;
  fingerDrawingEnabled: boolean;
  zoomWindowEnabled: boolean;
  elementMode: boolean;
  replayCutoff?: number;
  undoSignal: number;
  redoSignal: number;
  onActiveIndexChange: (index: number) => void;
  onDrawingChange: (page: Page, drawingData: string) => void;
  onElementsChange: (page: Page, elements: PageElement[]) => void;
  onAddPage: () => void;
  onPageCount: (count: number, page: Page) => void;
  onPdfOutline: (items: PdfOutlineItem[]) => void;
  onPdfLink: (link: { pageIndex?: number; url?: string }) => void;
  onPencilDoubleTap: () => void;
  onPencilSqueeze: () => void;
  onStrokeAdded: (page: Page, createdAt: number) => void;
  onStrokeTapped: (page: Page, createdAt: number) => void;
};

export function ContinuousDocument(props: Props) {
  const { width } = useWindowDimensions();
  const list = useRef<FlatList<Page>>(null);
  const interacted = useRef(false);
  const lastAddedLength = useRef(0);
  const visibleIndex = useRef(props.activeIndex);
  const [layoutWidth, setLayoutWidth] = useState(Math.min(900, width - 160));
  const pageWidth = Math.max(320, Math.min(900, layoutWidth - 48));
  const dimensions = (page: Page) => (page.rotation === 90 || page.rotation === 270 ? { width: pageWidth / 1.414, height: pageWidth } : { width: pageWidth, height: pageWidth / 1.414 });
  const itemHeight = (page: Page) => dimensions(page).height + 38;
  const itemOffset = (index: number) => props.pages.slice(0, index).reduce((sum, page) => sum + itemHeight(page), 0);
  useEffect(() => {
    if (visibleIndex.current === props.activeIndex) return;
    visibleIndex.current = props.activeIndex;
    const timer = setTimeout(
      () =>
        list.current?.scrollToIndex({
          index: Math.min(props.activeIndex, props.pages.length - 1),
          animated: false,
        }),
      50,
    );
    return () => clearTimeout(timer);
  }, [props.activeIndex, props.pages.length, pageWidth]);
  const visible = useRef(({ viewableItems }: { viewableItems: ViewToken<Page>[] }) => {
    const item = viewableItems.filter((x) => x.isViewable && x.index !== null).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))[0];
    if (item?.index !== null && item?.index !== undefined) {
      visibleIndex.current = item.index;
      props.onActiveIndexChange(item.index);
    }
  }).current;
  const render = ({ item, index }: { item: Page; index: number }) => {
    const size = dimensions(item);
    return (
      <View style={[s.item, { height: itemHeight(item) }]}>
        <RotatedPage rotation={item.rotation} style={[s.paper, size]}>
          <Paper template={item.template} customTemplateUri={item.customTemplateUri} />
          <DocumentCanvas key={item.id} pdfUri={item.pdfUri} pageIndex={item.pdfPageIndex ?? index} drawingData={item.drawingData} tool={props.tool} fingerDrawingEnabled={props.fingerDrawingEnabled} zoomWindowEnabled={props.zoomWindowEnabled && index === props.activeIndex} interactionEnabled={!props.elementMode && props.replayCutoff === undefined} replayCutoff={props.replayCutoff} undoSignal={index === props.activeIndex ? props.undoSignal : undefined} redoSignal={index === props.activeIndex ? props.redoSignal : undefined} onPdfOutline={props.onPdfOutline} onPdfLink={props.onPdfLink} onPencilDoubleTap={props.onPencilDoubleTap} onPencilSqueeze={props.onPencilSqueeze} onStrokeAdded={(createdAt) => props.onStrokeAdded(item, createdAt)} onStrokeTapped={(createdAt) => props.onStrokeTapped(item, createdAt)} onPageCount={(count) => props.onPageCount(count, item)} onDrawingChange={(drawingData) => props.onDrawingChange(item, drawingData)} />
          <ElementsLayer editable={props.elementMode && index === props.activeIndex} elements={item.elements ?? []} onChange={(elements) => props.onElementsChange(item, elements)} />
        </RotatedPage>
        <Text style={s.number}>
          {index + 1} / {props.pages.length}
        </Text>
      </View>
    );
  };
  return (
    <FlatList
      ref={list}
      data={props.pages}
      keyExtractor={(item) => item.id}
      renderItem={render}
      style={s.list}
      contentContainerStyle={s.content}
      onLayout={(event) => setLayoutWidth(event.nativeEvent.layout.width)}
      initialScrollIndex={Math.min(props.activeIndex, props.pages.length - 1)}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      removeClippedSubviews
      getItemLayout={(_, index) => ({
        length: itemHeight(props.pages[index] ?? props.pages[0]!),
        offset: itemOffset(index),
        index,
      })}
      viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
      onViewableItemsChanged={visible}
      onScrollBeginDrag={() => {
        interacted.current = true;
      }}
      onEndReachedThreshold={0.12}
      onEndReached={() => {
        if (!interacted.current || props.pages.some((p) => p.pdfUri) || lastAddedLength.current === props.pages.length) return;
        lastAddedLength.current = props.pages.length;
        interacted.current = false;
        props.onAddPage();
      }}
      onScrollToIndexFailed={({ index }) =>
        list.current?.scrollToOffset({
          offset: itemOffset(index),
          animated: false,
        })
      }
    />
  );
}

const s = StyleSheet.create({
  list: { flex: 1, width: '100%' },
  content: { alignItems: 'center', paddingVertical: 20 },
  item: { alignItems: 'center', justifyContent: 'flex-start' },
  paper: {
    backgroundColor: C.paper,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#3B392F',
    shadowOpacity: 0.13,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
  },
  number: { fontSize: 10, color: C.muted, marginTop: 9, fontWeight: '700' },
});
