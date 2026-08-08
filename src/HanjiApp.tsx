import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { DocumentCanvas } from './components/DocumentCanvas';
import { Paper } from './components/Paper';
import { AudioPanel } from './components/AudioPanel';
import { CloudSyncPanel } from './components/CloudSyncPanel';
import { Toolbar } from './components/Toolbar';
import { blankPage, loadCategories, loadLibrary, makeId, newNotebook, pdfNotebook, saveCategories, saveLibrary } from './storage';
import { C } from './theme';
import type { AudioSession, ImageElement, Notebook, Sticker, TextElement, ToolSpec } from './types';
import { exportLibrary, importLibraryBackup, writeAutomaticBackup } from './backup';
import { recognizeDrawing } from './vision';
import { exportNotebookPdf, exportPagePng } from './export';
import { uploadArchiveIfEnabled } from './cloudSync';
import { rebuildSearchIndex, searchLibrary, type SearchHit } from './searchIndex';
import { FlashcardPanel } from './components/FlashcardPanel';
import { dueFlashcards } from './srs';
import { NotebookOrganizer } from './components/NotebookOrganizer';
import { PdfOutlinePanel } from './components/PdfOutlinePanel';
import type { PdfOutlineItem } from './components/DocumentCanvas';
import { DocumentTabs } from './components/DocumentTabs';
import { ElementsLayer } from './components/ElementsLayer';
import { pickPersistentImage } from './imageAssets';
import { usePrivacyLock } from './privacyLock';
import { LockScreen } from './components/LockScreen';
import { ContinuousDocument } from './components/ContinuousDocument';
import { childFolder, expandFolderPaths, folderBreadcrumb, folderContains, folderDepth, folderLabel } from './folders';
import { PageTransferPanel } from './components/PageTransferPanel';
import { transferPage as transferNotebookPage } from './pageTransfer';
import {loadUiPreferences,saveUiPreferences} from './uiPreferences';
import { RotatedPage } from './components/RotatedPage';
import { PageGridPanel } from './components/PageGridPanel';
import { StickerPanel } from './components/StickerPanel';
import { loadStickers, saveStickers, stickerFromImage } from './stickers';
import { mergeCloudRestore } from './cloudMerge';
import { transcribeAudio } from './speech';
import { SelectionBar } from './components/SelectionBar';

export function HanjiApp() {
  const { height: windowHeight,width:windowWidth } = useWindowDimensions();
  const privacy = usePrivacyLock();
  const [items, setItems] = useState<Notebook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const tabPages = useRef<Record<string, number>>({});
  const [query, setQuery] = useState('');
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStartRef = useRef<number | null>(null);
  const audioStrokesRef = useRef<{ pageId: string; createdAt: number; seekSec: number }[]>([]);
  const [tool, setToolState] = useState<ToolSpec>({
    kind: 'pen',
    color: C.ink,
    width: 2,
    opacity: 1,
    scratchEnabled: true,
    eraserAutoReturn: true,
  });
  const previousPencilTool = useRef<ToolSpec>(tool);
  const setTool = (value: ToolSpec | ((active: ToolSpec) => ToolSpec)) =>
    setToolState((active) => {
      const next = typeof value === 'function' ? value(active) : value;
      const inks = ['pen', 'fountainPen', 'monoline', 'pencil', 'crayon', 'watercolor', 'marker'];
      if (next.kind === 'eraser' && inks.includes(active.kind)) previousPencilTool.current = active;
      else if (inks.includes(next.kind)) previousPencilTool.current = next;
      return next;
    });
  const [audioSeek, setAudioSeek] = useState<{
    seconds: number;
    nonce: number;
  }>();
  const [replayCutoff, setReplayCutoff] = useState<number>();
  const [selection,setSelection]=useState<{pageId:string;count:number}>({pageId:'',count:0});
  const [selectionAction,setSelectionAction]=useState<{nonce:number;type:'delete'|'recolor'|'text'|'clear'|'copy'|'cut'|'paste'|'duplicate'|'shrink'|'grow'|'rotate';color?:string}>();
  const selectionUndoRef=useRef<{pageId:string;element:TextElement}|null>(null);const selectionRedoRef=useRef<{pageId:string;element:TextElement}|null>(null);
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [pdfOutline, setPdfOutline] = useState<PdfOutlineItem[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [undoSignal, setUndoSignal] = useState(0);
  const [redoSignal, setRedoSignal] = useState(0);
  const [fingerDrawingEnabled, setFingerDrawingEnabled] = useState(false);
  const [zoomWindowEnabled, setZoomWindowEnabled] = useState(false);
  const [elementMode, setElementMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [leftHanded,setLeftHanded]=useState(false);
  const [pageTransferOpen, setPageTransferOpen] = useState(false);
  const [pageGridOpen, setPageGridOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  useEffect(() => {
    Promise.all([loadLibrary(), loadCategories()]).then(([notes, cats]) => {
      setItems(notes);
      setCategories(expandFolderPaths([...cats, ...notes.map((n) => n.folder)]));
      setReady(true);
    });
    void loadStickers().then(setStickers);
    void loadUiPreferences().then(value=>setLeftHanded(value.leftHanded));
  }, []);
  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveLibrary(items), 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [items, ready]);
  useEffect(() => {
    if (!ready) return;
    if (backupTimer.current) clearTimeout(backupTimer.current);
    backupTimer.current = setTimeout(() => {
      void writeAutomaticBackup(items)
        .then((uri) => uri && uploadArchiveIfEnabled(uri))
        .catch(() => undefined);
    }, 15000);
    return () => {
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, [items, ready]);
  useEffect(() => {
    if (!ready) return;
    if (indexTimer.current) clearTimeout(indexTimer.current);
    indexTimer.current = setTimeout(() => {
      void rebuildSearchIndex(items);
    }, 800);
    return () => {
      if (indexTimer.current) clearTimeout(indexTimer.current);
    };
  }, [items, ready]);
  useEffect(() => {
    if (!query.trim()) {
      setSearchHits(null);
      return;
    }
    const timer = setTimeout(() => {
      void searchLibrary(query).then(setSearchHits);
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (openId) tabPages.current[openId] = pageIndex;
  }, [openId, pageIndex]);
  useEffect(() => {
    if (openId) setOpenTabs((tabs) => (tabs.includes(openId) ? tabs : [...tabs, openId]));
  }, [openId]);
  const importPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    const note = pdfNotebook(asset.name, asset.uri);
    setItems((all) => [note, ...all]);
    setOpenId(note.id);
    setPageIndex(0);
  };
  const queueOcr = (notebookId: string, pageId: string, drawingData: string) => {
    if (ocrTimer.current) clearTimeout(ocrTimer.current);
    if (!drawingData) return;
    ocrTimer.current = setTimeout(async () => {
      const result = await recognizeDrawing(drawingData);
      if (!result.text) return;
      update(notebookId, (n) => ({
        ...n,
        pages: n.pages.map((p) => (p.id === pageId ? { ...p, ocrText: result.text, ocrWords: result.words } : p)),
      }));
    }, 1400);
  };
  const current = items.find((x) => x.id === openId);
  const update = (id: string, fn: (n: Notebook) => Notebook) => setItems((all) => all.map((n) => (n.id === id ? fn(n) : n)));
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.accent} />
        <Text style={s.muted}>서재를 여는 중…</Text>
      </View>
    );
  if (privacy.locked) return <LockScreen onUnlock={() => void privacy.authenticate()} />;
  if (!current)
    return (
      <Library
        items={items}
        categories={categories}
        query={query}
        searchHits={searchHits}
        setQuery={setQuery}
        onOpen={(id, index = 0) => {
          update(id, (n) => ({ ...n, lastOpenedAt: new Date().toISOString() }));
          setOpenId(id);
          setPageIndex(index);
        }}
        onUpdate={(changed) => setItems((all) => all.map((n) => (n.id === changed.id ? changed : n)))}
        onCloudRestore={(restored) => {
          setCategories((all) => expandFolderPaths([...all, ...restored.map((n) => n.folder)]));
          setItems((existing) => mergeCloudRestore(existing, restored));
        }}
        onAddCategory={(name) => setCategories((all) => expandFolderPaths([...all, name]))}
        onMoveCategory={(id, folder) =>
          update(id, (n) => ({
            ...n,
            folder,
            updatedAt: new Date().toISOString(),
          }))
        }
        onExport={() => exportLibrary(items)}
        onRestore={async () => {
          try {
            const restored = await importLibraryBackup();
            if (restored) {
              setCategories((all) => expandFolderPaths([...all, ...restored.map((n) => n.folder)]));
              setItems((existing) => {
                const merged = new Map(existing.map((n) => [n.id, n]));
                restored.forEach((n) => merged.set(n.id, n));
                return [...merged.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
              });
            }
          } catch (error) {
            Alert.alert('복원 실패', error instanceof Error ? error.message : '백업 파일을 읽을 수 없습니다.');
          }
        }}
        onImport={importPdf}
        onCreate={(folder) => {
          const n = newNotebook();
          if (folder) n.folder = folder;
          setItems((x) => [n, ...x]);
          setOpenId(n.id);
        }}
        onDelete={(id) =>
          Alert.alert('노트 삭제', '이 노트를 삭제할까요?', [
            { text: '취소' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: () => setItems((x) => x.filter((n) => n.id !== id)),
            },
          ])
        }
      />
    );
  const page = current.pages[pageIndex] ?? current.pages[0];
  if (!page) return null;
  const selectTab = (id: string) => {
    setOpenId(id);
    setPageIndex(tabPages.current[id] ?? 0);
  };
  const closeTab = (id: string) => {
    const index = openTabs.indexOf(id),
      remaining = openTabs.filter((x) => x !== id);
    setOpenTabs(remaining);
    if (openId === id) {
      const next = remaining[Math.min(Math.max(index, 0), remaining.length - 1)];
      setOpenId(next ?? null);
      setPageIndex(next ? (tabPages.current[next] ?? 0) : 0);
    }
  };
  const addImage = async () => {
    const uri = await pickPersistentImage();
    if (!uri) return;
    setElementMode(true);
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              elements: [
                ...(p.elements ?? []),
                {
                  id: `image-${Date.now()}`,
                  kind: 'image',
                  uri,
                  x: 0.2,
                  y: 0.18,
                  width: 0.42,
                  height: 0.42,
                },
              ],
            }
          : p,
      ),
    }));
  };
  const updateStickers = (next: Sticker[]) => {
    setStickers(next);
    void saveStickers(next);
  };
  const saveImageSticker = (image: ImageElement) => {
    const existing = stickers.find((item) => item.uri === image.uri && item.fit === image.fit && item.rotation === image.rotation);
    const next = existing ? [existing, ...stickers.filter((item) => item.id !== existing.id)] : [stickerFromImage(image), ...stickers];
    updateStickers(next);
  };
  const importSticker = async () => {
    const uri = await pickPersistentImage();
    if (!uri) return;
    updateStickers([stickerFromImage({ id: makeId(), kind: 'image', uri, x: 0.2, y: 0.2, width: 0.34, height: 0.34 }), ...stickers]);
  };
  const insertSticker = (sticker: Sticker) => {
    setElementMode(true);
    const element: ImageElement = { id: makeId(), kind: 'image', uri: sticker.uri, x: Math.max(0.02, (1 - sticker.width) / 2), y: Math.max(0.02, (1 - sticker.height) / 2), width: sticker.width, height: sticker.height, fit: sticker.fit, rotation: sticker.rotation };
    update(current.id, (n) => ({ ...n, updatedAt: new Date().toISOString(), pages: n.pages.map((p) => (p.id === page.id ? { ...p, elements: [...(p.elements ?? []), element], updatedAt: new Date().toISOString() } : p)) }));
    setStickerOpen(false);
  };
  const applyCustomTemplate = async () => {
    const uri = await pickPersistentImage();
    if (!uri) return;
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              customTemplateUri: uri,
              template: 'plain',
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  };
  const manageCustomTemplate = () => {
    if (!page.customTemplateUri) {
      void applyCustomTemplate();
      return;
    }
    Alert.alert('커스텀 템플릿', '이 페이지의 배경을 변경하거나 제거할 수 있습니다.', [
      { text: '취소' },
      {
        text: '제거',
        style: 'destructive',
        onPress: () =>
          update(current.id, (n) => ({
            ...n,
            updatedAt: new Date().toISOString(),
            pages: n.pages.map((p) =>
              p.id === page.id
                ? {
                    ...p,
                    customTemplateUri: undefined,
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          })),
      },
      { text: '교체', onPress: () => void applyCustomTemplate() },
    ]);
  };
  const togglePencilEraser = () =>
    setTool((active) => {
      if (active.kind === 'eraser') return previousPencilTool.current;
      previousPencilTool.current = active;
      return { ...active, kind: 'eraser', eraserMode: 'vector' };
    });
  const movePage = (direction: -1 | 1) => {
    const target = pageIndex + direction;
    if (target < 0 || target >= current.pages.length) return;
    update(current.id, (n) => {
      const pages = [...n.pages];
      const moving = pages[pageIndex];
      if (!moving) return n;
      pages.splice(pageIndex, 1);
      pages.splice(target, 0, moving);
      return { ...n, pages, updatedAt: new Date().toISOString() };
    });
    setPageIndex(target);
  };
  const addPage = () =>
    update(current.id, (n) => ({
      ...n,
      pages: [...n.pages, blankPage()],
      updatedAt: new Date().toISOString(),
    }));
  const changeDrawing = (target: typeof page, drawingData: string) => {
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) => (p.id === target.id ? { ...p, drawingData, updatedAt: new Date().toISOString() } : p)),
    }));
    queueOcr(current.id, target.id, drawingData);
  };
  const changeElements = (target: typeof page, elements: NonNullable<typeof page.elements>) =>
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) => (p.id === target.id ? { ...p, elements, updatedAt: new Date().toISOString() } : p)),
    }));
  const handlePdfLink = (link: { pageIndex?: number; url?: string }) => {
    if (link.pageIndex !== undefined) setPageIndex(link.pageIndex);
    else if (link.url) void Linking.openURL(link.url);
  };
  const handleStrokeAdded = (target: typeof page, createdAt: number) => {
    const started = audioStartRef.current;
    if (started === null) return;
    audioStrokesRef.current.push({
      pageId: target.id,
      createdAt,
      seekSec: Math.max(0, createdAt - started),
    });
  };
  const handleStrokeTapped = (target: typeof page, createdAt: number) => {
    const session = [...(current.audioSessions ?? [])].reverse().find((x) => x.strokes.some((stroke) => stroke.pageId === target.id));
    const stroke = session?.strokes.filter((x) => x.pageId === target.id).sort((a, b) => Math.abs(a.createdAt - createdAt) - Math.abs(b.createdAt - createdAt))[0];
    if (stroke) setAudioSeek({ seconds: stroke.seekSec, nonce: Date.now() });
  };
  const transcribeSession = async (session: AudioSession) => {
    const result = await transcribeAudio(session.uri);
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      audioSessions: n.audioSessions?.map((item) => item.createdAt === session.createdAt ? { ...item, transcript: result.text, transcriptSegments: result.segments, transcribedAt: new Date().toISOString() } : item),
    }));
  };
  const handleSelection=(target:typeof page,value:{count:number})=>setSelection({pageId:target.id,count:value.count});
  const handleSelectionText=(target:typeof page,result:{text:string;x:number;y:number;width:number;height:number})=>{
    const element:TextElement={id:makeId(),kind:'text',text:result.text,x:Math.max(0,Math.min(.82,result.x)),y:Math.max(0,Math.min(.85,result.y)),width:Math.max(.18,Math.min(.8,result.width)),height:Math.max(.08,Math.min(.4,result.height)),fontSize:20,color:target.template==='dark'?'#F4F1E8':C.ink};
    update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===target.id?{...p,elements:[...(p.elements??[]),element],updatedAt:new Date().toISOString()}:p)}));setElementMode(true);setSelection({pageId:'',count:0});
    selectionUndoRef.current={pageId:target.id,element};selectionRedoRef.current=null;
  };
  const actOnSelection=(type:'delete'|'recolor'|'text'|'clear'|'copy'|'cut'|'paste'|'duplicate'|'shrink'|'grow'|'rotate')=>setSelectionAction({nonce:Date.now(),type,color:type==='recolor'?tool.color:undefined});
  const toggleLeftHanded=()=>setLeftHanded(value=>{const next=!value;void saveUiPreferences({leftHanded:next});return next});
  const activateLasso=()=>setTool(active=>({...active,kind:'lasso'}));
  const performUndo=()=>{const conversion=selectionUndoRef.current;if(conversion){update(current.id,n=>({...n,pages:n.pages.map(p=>p.id===conversion.pageId?{...p,elements:p.elements?.filter(element=>element.id!==conversion.element.id)}:p)}));selectionRedoRef.current=conversion;selectionUndoRef.current=null}setUndoSignal(v=>v+1)};
  const performRedo=()=>{const conversion=selectionRedoRef.current;if(conversion){update(current.id,n=>({...n,pages:n.pages.map(p=>p.id===conversion.pageId?{...p,elements:[...(p.elements??[]),conversion.element]}:p)}));selectionUndoRef.current=conversion;selectionRedoRef.current=null}setRedoSignal(v=>v+1)};
  const handlePageCount = (count: number, source: typeof page) => {
    if (count <= current.pages.length) return;
    update(current.id, (n) => ({
      ...n,
      pages: Array.from(
        { length: count },
        (_, i) =>
          n.pages[i] ?? {
            ...blankPage(),
            pdfUri: source.pdfUri,
            pdfName: source.pdfName,
            pdfPageIndex: i,
          },
      ),
    }));
  };
  const transferCurrentPage = (targetId: string, mode: 'copy' | 'move') => {
    setItems((all) => transferNotebookPage(all, current.id, page.id, targetId, mode));
    if (mode === 'move') setPageIndex(Math.max(0, Math.min(pageIndex, current.pages.length - 2)));
    setPageTransferOpen(false);
  };
  const rotatePage = () =>
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              rotation: (((p.rotation ?? 0) + 90) % 360) as 0 | 90 | 180 | 270,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  const reorderPages = (ids: string[]) => {
    const map = new Map(current.pages.map((p) => [p.id, p]));
    const pages = ids.map((id) => map.get(id)).filter((p): p is typeof page => Boolean(p));
    const active = pages.findIndex((p) => p.id === page.id);
    update(current.id, (n) => ({
      ...n,
      pages,
      updatedAt: new Date().toISOString(),
    }));
    if (active >= 0) setPageIndex(active);
  };
  const duplicatePage = (id: string) =>
    update(current.id, (n) => {
      const index = n.pages.findIndex((p) => p.id === id),
        source = n.pages[index];
      if (!source) return n;
      const copy = {
        ...source,
        id: makeId(),
        updatedAt: new Date().toISOString(),
        elements: source.elements?.map((element) => ({
          ...element,
          id: makeId(),
        })),
      };
      return {
        ...n,
        pages: [...n.pages.slice(0, index + 1), copy, ...n.pages.slice(index + 1)],
        updatedAt: new Date().toISOString(),
      };
    });
  const deletePageFromGrid = (id: string) => {
    if (current.pages.length === 1) return;
    const index = current.pages.findIndex((p) => p.id === id);
    update(current.id, (n) => {
      const timestamp=new Date().toISOString();
      return {...n,pages:n.pages.filter((p)=>p.id!==id),deletedPages:{...(n.deletedPages??{}),[id]:timestamp},updatedAt:timestamp};
    });
    if (index <= pageIndex) setPageIndex(Math.max(0, pageIndex - 1));
  };
  return (
    <SafeAreaView style={s.root}>
      {!focusMode && (
        <Toolbar
          tool={tool}
          setTool={setTool}
          onUndo={performUndo}
          onRedo={performRedo}
          fingerDrawingEnabled={fingerDrawingEnabled}
          onToggleFingerDrawing={() => setFingerDrawingEnabled((v) => !v)}
          zoomWindowEnabled={zoomWindowEnabled}
          onToggleZoomWindow={() => setZoomWindowEnabled((v) => !v)}
          viewMode={current.viewMode ?? 'page'}
          onToggleViewMode={() =>
            update(current.id, (n) => ({
              ...n,
              viewMode: (n.viewMode ?? 'page') === 'page' ? 'continuous' : 'page',
              updatedAt: new Date().toISOString(),
            }))
          }
          elementMode={elementMode}
          onAddText={() => {
            if (elementMode) {
              setElementMode(false);
              return;
            }
            setElementMode(true);
            update(current.id, (n) => ({
              ...n,
              pages: n.pages.map((p) =>
                p.id === page.id
                  ? {
                      ...p,
                      elements: [
                        ...(p.elements ?? []),
                        {
                          id: `text-${Date.now()}`,
                          kind: 'text',
                          text: '텍스트를 입력하세요',
                          x: 0.18,
                          y: 0.2,
                          width: 0.42,
                          height: 0.12,
                          fontSize: 20,
                          color: page.template === 'dark' ? '#F4F1E8' : C.ink,
                        },
                      ],
                    }
                  : p,
              ),
            }));
          }}
          onAddImage={() => void addImage()}
          onStickers={() => setStickerOpen(true)}
          privacyEnabled={privacy.enabled}
          onPrivacyToggle={() => void privacy.toggle()}
          onFocusMode={() => setFocusMode(true)}
          onExportPdf={() => exportNotebookPdf(current)}
          onFlashcards={() => setFlashcardsOpen(true)}
          dueCards={dueFlashcards(current.flashcards ?? []).length}
          onPdfOutline={page.pdfUri ? () => setOutlineOpen(true) : undefined}
          outlineCount={pdfOutline.length}
          title={current.title}
          onTitleChange={(title) =>
            update(current.id, (n) => ({
              ...n,
              title,
              updatedAt: new Date().toISOString(),
            }))
          }
          onLibrary={() => setOpenId(null)}
          onAddPage={addPage}
        />
      )}
      {!focusMode && <DocumentTabs ids={openTabs} items={items} activeId={current.id} onSelect={selectTab} onClose={closeTab} />}
      <View style={[s.editor,leftHanded&&s.editorLeftHanded,focusMode&&(leftHanded?{marginLeft:-112}:{marginRight:-112})]}>
        <View style={s.canvasArea}>
          {(current.viewMode ?? 'page') === 'continuous' ? (
            <ContinuousDocument pages={current.pages} activeIndex={pageIndex} tool={tool} fingerDrawingEnabled={fingerDrawingEnabled} zoomWindowEnabled={zoomWindowEnabled} elementMode={elementMode} replayCutoff={replayCutoff} selectionAction={selectionAction} undoSignal={undoSignal} redoSignal={redoSignal} onActiveIndexChange={setPageIndex} onDrawingChange={changeDrawing} onElementsChange={changeElements} onSaveSticker={saveImageSticker} onSelectionChange={handleSelection} onSelectionText={handleSelectionText} onCircleLasso={activateLasso} onAddPage={addPage} onPageCount={handlePageCount} onPdfOutline={setPdfOutline} onPdfLink={handlePdfLink} onPencilDoubleTap={togglePencilEraser} onPencilSqueeze={togglePencilEraser} onStrokeAdded={handleStrokeAdded} onStrokeTapped={handleStrokeTapped} />
          ) : (
            <RotatedPage
              rotation={page.rotation}
              style={[
                s.paper,
                (page.rotation === 90 || page.rotation === 270) && {
                  maxWidth: Math.max(300, (windowHeight - 190) / 1.414),
                },
              ]}
            >
              <Paper template={page.template} customTemplateUri={page.customTemplateUri} />
              <DocumentCanvas key={page.id} pdfUri={page.pdfUri} pageIndex={page.pdfPageIndex ?? pageIndex} drawingData={page.drawingData} tool={tool} fingerDrawingEnabled={fingerDrawingEnabled} zoomWindowEnabled={zoomWindowEnabled} interactionEnabled={!elementMode && replayCutoff === undefined} replayCutoff={replayCutoff} selectionAction={selectionAction} undoSignal={undoSignal} redoSignal={redoSignal} onPdfOutline={setPdfOutline} onPdfLink={handlePdfLink} onPencilDoubleTap={togglePencilEraser} onPencilSqueeze={togglePencilEraser} onStrokeAdded={(createdAt) => handleStrokeAdded(page, createdAt)} onStrokeTapped={(createdAt) => handleStrokeTapped(page, createdAt)} onSelectionChange={(value)=>handleSelection(page,value)} onSelectionText={(result)=>handleSelectionText(page,result)} onCircleLasso={activateLasso} onPageCount={(count) => handlePageCount(count, page)} onDrawingChange={(drawingData) => changeDrawing(page, drawingData)} />
              <ElementsLayer editable={elementMode} elements={page.elements ?? []} onChange={(elements) => changeElements(page, elements)} onSaveImage={saveImageSticker} />
            </RotatedPage>
          )}
          <AudioPanel
            sessions={current.audioSessions ?? []}
            seekRequest={audioSeek}
            onRecordingStart={(startedAt) => {
              audioStartRef.current = startedAt;
              audioStrokesRef.current = [];
            }}
            onSaved={(audio) => {
              const strokes = audioStrokesRef.current;
              update(current.id, (n) => ({
                ...n,
                audioSessions: [...(n.audioSessions ?? []), { ...audio, strokes }],
                updatedAt: new Date().toISOString(),
              }));
              audioStartRef.current = null;
              audioStrokesRef.current = [];
            }}
            onReplayCutoffChange={setReplayCutoff}
            onTranscribe={transcribeSession}
            leftHanded={leftHanded}
          />
          {tool.kind==='lasso'&&Platform.OS==='ios'&&<Pressable accessibilityLabel="원본 필기 붙여넣기" onPress={()=>actOnSelection('paste')} style={[s.lassoPaste,leftHanded&&s.lassoPasteLeft]}><Ionicons name="clipboard" size={18} color={C.accent}/><Text style={s.lassoPasteText}>붙여넣기</Text></Pressable>}
          <SelectionBar count={selection.pageId===page.id?selection.count:0} color={tool.color} availableWidth={windowWidth-(focusMode?48:160)} onRecolor={()=>actOnSelection('recolor')} onCopy={()=>actOnSelection('copy')} onCut={()=>actOnSelection('cut')} onDuplicate={()=>actOnSelection('duplicate')} onShrink={()=>actOnSelection('shrink')} onGrow={()=>actOnSelection('grow')} onRotate={()=>actOnSelection('rotate')} onText={()=>actOnSelection('text')} onDelete={()=>actOnSelection('delete')} onClose={()=>actOnSelection('clear')}/>
        </View>
        <View style={[s.rail,leftHanded&&s.railLeft]}>
          <Text style={s.railTitle}>페이지</Text>
          <View style={s.railActions}>
            <Pressable accessibilityLabel={leftHanded?'오른손 모드로 전환':'왼손 모드로 전환'} accessibilityState={{selected:leftHanded}} onPress={toggleLeftHanded} style={[s.railAction,leftHanded&&s.templateActive]}><Ionicons name="hand-left-outline" size={16} color={leftHanded?C.white:C.accent}/></Pressable>
            <Pressable accessibilityLabel="PNG 내보내기" onPress={() => exportPagePng(current, page, pageIndex)} style={s.railAction}>
              <Ionicons name="image-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 복제"
              onPress={() =>
                update(current.id, (n) => ({
                  ...n,
                  pages: [
                    ...n.pages.slice(0, pageIndex + 1),
                    {
                      ...page,
                      id: `${Date.now()}`,
                      updatedAt: new Date().toISOString(),
                    },
                    ...n.pages.slice(pageIndex + 1),
                  ],
                }))
              }
              style={s.railAction}
            >
              <Ionicons name="copy-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable accessibilityLabel="다른 노트로 복사 또는 이동" onPress={() => setPageTransferOpen(true)} style={s.railAction}>
              <Ionicons name="git-compare-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 삭제"
              disabled={current.pages.length === 1}
              onPress={() => {
                update(current.id, (n) => {
                  const timestamp=new Date().toISOString();
                  return {...n,pages:n.pages.filter((p)=>p.id!==page.id),deletedPages:{...(n.deletedPages??{}),[page.id]:timestamp},updatedAt:timestamp};
                });
                setPageIndex(Math.max(0, pageIndex - 1));
              }}
              style={s.railAction}
            >
              <Ionicons name="trash-outline" size={16} color={current.pages.length === 1 ? C.line : C.danger} />
            </Pressable>
            <Pressable accessibilityLabel="페이지 위로 이동" disabled={pageIndex === 0} onPress={() => movePage(-1)} style={s.railAction}>
              <Ionicons name="arrow-up" size={16} color={pageIndex === 0 ? C.line : C.accent} />
            </Pressable>
            <Pressable accessibilityLabel="페이지 아래로 이동" disabled={pageIndex === current.pages.length - 1} onPress={() => movePage(1)} style={s.railAction}>
              <Ionicons name="arrow-down" size={16} color={pageIndex === current.pages.length - 1 ? C.line : C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 북마크"
              onPress={() =>
                update(current.id, (n) => ({
                  ...n,
                  pages: n.pages.map((p) => (p.id === page.id ? { ...p, bookmarked: !p.bookmarked } : p)),
                }))
              }
              style={[s.railAction, page.bookmarked && s.templateActive]}
            >
              <Ionicons name={page.bookmarked ? 'bookmark' : 'bookmark-outline'} size={16} color={page.bookmarked ? C.white : C.accent} />
            </Pressable>
            <Pressable accessibilityLabel={page.customTemplateUri ? '커스텀 템플릿 변경 또는 제거' : '커스텀 템플릿 가져오기'} onPress={manageCustomTemplate} style={[s.railAction, page.customTemplateUri && s.templateActive]}>
              <Ionicons name="layers-outline" size={16} color={page.customTemplateUri ? C.white : C.accent} />
            </Pressable>
          </View>
          <View style={s.templatePicker}>
            {(['plain', 'line', 'grid', 'dot', 'cornell', 'planner', 'dark'] as const).map((t) => (
              <Pressable
                key={t}
                accessibilityLabel={`${t} 템플릿`}
                onPress={() => {
                  update(current.id, (n) => ({
                    ...n,
                    pages: n.pages.map((p) => (p.id === page.id ? { ...p, template: t, customTemplateUri: undefined } : p)),
                  }));
                  if (t === 'dark' && ['#20201E', '#000000'].includes(tool.color.toUpperCase())) setTool({ ...tool, color: '#F4F1E8' });
                  if (t !== 'dark' && tool.color.toUpperCase() === '#F4F1E8') setTool({ ...tool, color: C.ink });
                }}
                style={[s.templateDot, !page.customTemplateUri && page.template === t && s.templateActive]}
              >
                <Text
                  style={{
                    fontSize: 8,
                    color: !page.customTemplateUri && page.template === t ? C.white : C.muted,
                  }}
                >
                  {
                    (
                      {
                        plain: 'P',
                        line: 'L',
                        grid: 'G',
                        dot: 'D',
                        cornell: 'C',
                        planner: 'W',
                        dark: 'N',
                      } as const
                    )[t]
                  }
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={s.railList}>
            {current.pages.map((p, i) => (
              <Pressable key={p.id} onPress={() => setPageIndex(i)} style={[s.thumb, i === pageIndex && s.thumbActive]}>
                <View style={s.thumbLines} />
                {p.bookmarked && <Ionicons name="bookmark" size={12} color={C.accent} style={s.thumbBookmark} />}
                <Text style={s.pageNo}>{i + 1}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
      {focusMode && (
        <Pressable
          accessibilityLabel="집중 모드 종료"
          onPress={() => setFocusMode(false)}
          style={{
            position: 'absolute',
            right: leftHanded?undefined:20,
            left: leftHanded?20:undefined,
            top: 18,
            zIndex: 30,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(34,93,80,.82)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="contract-outline" size={22} color={C.white} />
        </Pressable>
      )}
      <FlashcardPanel
        visible={flashcardsOpen}
        cards={current.flashcards ?? []}
        onClose={() => setFlashcardsOpen(false)}
        onChange={(flashcards) =>
          update(current.id, (n) => ({
            ...n,
            flashcards,
            updatedAt: new Date().toISOString(),
          }))
        }
      />
      <PdfOutlinePanel visible={outlineOpen} items={pdfOutline} onClose={() => setOutlineOpen(false)} onSelect={setPageIndex} />
      <PageTransferPanel visible={pageTransferOpen} sourceId={current.id} notebooks={items} onClose={() => setPageTransferOpen(false)} onTransfer={transferCurrentPage} />
      <PageGridPanel
        visible={pageGridOpen}
        pages={current.pages}
        activeIndex={pageIndex}
        onClose={() => setPageGridOpen(false)}
        onSelect={setPageIndex}
        onReorder={reorderPages}
        onDuplicate={duplicatePage}
        onDelete={deletePageFromGrid}
        onBookmark={(id) =>
          update(current.id, (n) => ({
            ...n,
            pages: n.pages.map((p) => (p.id === id ? { ...p, bookmarked: !p.bookmarked } : p)),
            updatedAt: new Date().toISOString(),
          }))
        }
        onTransfer={(id) => {
          const index = current.pages.findIndex((p) => p.id === id);
          if (index >= 0) setPageIndex(index);
          setPageGridOpen(false);
          setTimeout(() => setPageTransferOpen(true), 0);
        }}
      />
      <StickerPanel visible={stickerOpen} stickers={stickers} onClose={() => setStickerOpen(false)} onInsert={insertSticker} onImport={() => void importSticker()} onDelete={(id) => updateStickers(stickers.filter((item) => item.id !== id))} />
      <Pressable accessibilityLabel="전체 페이지 관리" onPress={() => setPageGridOpen(true)} style={[s.pageGrid,leftHanded&&s.pageGridLeft]}>
        <Ionicons name="grid-outline" size={19} color={C.white} />
      </Pressable>
      <Pressable accessibilityLabel="페이지 시계 방향 90도 회전" onPress={rotatePage} style={[s.rotatePage,leftHanded&&s.rotatePageLeft]}>
        <Ionicons name="refresh-outline" size={19} color={C.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function Library({ items, categories, query, searchHits, setQuery, onOpen, onUpdate, onCloudRestore, onCreate, onImport, onExport, onRestore, onDelete, onAddCategory, onMoveCategory }: { items: Notebook[]; categories: string[]; query: string; searchHits: SearchHit[] | null; setQuery: (x: string) => void; onOpen: (id: string, pageIndex?: number) => void; onUpdate: (n: Notebook) => void; onCloudRestore: (items: Notebook[]) => void; onCreate: (folder?: string) => void; onImport: () => void; onExport: () => void; onRestore: () => void; onDelete: (id: string) => void; onAddCategory: (name: string) => void; onMoveCategory: (id: string, category: string) => void }) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [selected, setSelected] = useState('전체');
  const [draft, setDraft] = useState('');
  const [cloudOpen, setCloudOpen] = useState(false);
  const [managing, setManaging] = useState<Notebook | null>(null);
  const hitMap = useMemo(() => new Map(searchHits?.map((hit) => [hit.notebookId, hit]) ?? []), [searchHits]);
  const filtered = useMemo(() => items.filter((x) => (selected === '전체' || (selected === '즐겨찾기' && x.favorite) || (selected === '최근 문서' && x.lastOpenedAt) || folderContains(selected, x.folder)) && (!query.trim() || (searchHits ? hitMap.has(x.id) : `${x.title} ${x.tags.join(' ')} ${x.pages.map((p) => p.ocrText ?? '').join(' ')}`.toLowerCase().includes(query.toLowerCase())))).sort((a, b) => (selected === '최근 문서' ? (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '') : b.updatedAt.localeCompare(a.updatedAt))), [items, query, selected, searchHits, hitMap]);
  const addCategory = () => {
    const name = draft.trim();
    if (!name) return;
    const parent = ['전체', '즐겨찾기', '최근 문서'].includes(selected) ? '' : selected;
    onAddCategory(childFolder(parent, name));
    setDraft('');
  };
  const createHere = () => onCreate(categories.includes(selected) ? selected : undefined);
  const manage = (n: Notebook) => setManaging(n);
  const chips = (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 7 }}>
      {['전체', '즐겨찾기', '최근 문서', ...categories].map((category) => (
        <Pressable key={category} onPress={() => setSelected(category)} style={[s.categoryChip, selected === category && s.categoryChipActive]}>
          <Text style={[s.categoryChipText, selected === category && { color: C.white }]}>{categories.includes(category) ? folderBreadcrumb(category) : category}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
  return (
    <SafeAreaView style={s.root}>
      <View style={s.library}>
        {!compact && (
          <View style={s.sidebar}>
            <View style={s.brand}>
              <View style={s.mark}>
                <Text style={s.markText}>한</Text>
              </View>
              <Text style={s.brandText}>Hanji</Text>
            </View>
            <Text style={s.section}>라이브러리</Text>
            {(
              [
                { key: '전체', label: '모든 노트', icon: 'documents-outline' },
                { key: '즐겨찾기', label: '즐겨찾기', icon: 'star-outline' },
                { key: '최근 문서', label: '최근 문서', icon: 'time-outline' },
              ] as const
            ).map((item) => (
              <Pressable key={item.key} onPress={() => setSelected(item.key)} style={[s.sideItem, selected === item.key && s.sideActive]}>
                <Ionicons name={item.icon} size={19} color={selected === item.key ? C.accent : C.muted} />
                <Text style={selected === item.key ? s.sideActiveText : s.sideText}>{item.label}</Text>
              </Pressable>
            ))}
            <Text style={s.section}>폴더</Text>
            {categories.map((category) => (
              <Pressable accessibilityLabel={`${folderBreadcrumb(category)} 폴더`} key={category} onPress={() => setSelected(category)} style={[s.sideItem, { paddingLeft: 11 + folderDepth(category) * 16 }, selected === category && s.sideActive]}>
                <Ionicons name={selected === category ? 'folder-open-outline' : 'folder-outline'} size={18} color={selected === category ? C.accent : C.muted} />
                <Text numberOfLines={1} style={[{ flex: 1 }, selected === category ? s.sideActiveText : s.sideText]}>
                  {folderLabel(category)}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted }}>{items.filter((n) => folderContains(category, n.folder)).length}</Text>
              </Pressable>
            ))}
            <View style={s.categoryInput}>
              <TextInput value={draft} onChangeText={setDraft} onSubmitEditing={addCategory} placeholder={categories.includes(selected) ? `${folderLabel(selected)} 아래에 추가` : '폴더 추가'} style={{ flex: 1, fontSize: 12, color: C.ink }} />
              <Pressable accessibilityLabel="폴더 추가" onPress={addCategory}>
                <Ionicons name="add-circle" size={22} color={C.accent} />
              </Pressable>
            </View>
            <View style={s.sync}>
              <View style={s.syncDot} />
              <View>
                <Text style={s.syncTitle}>로컬 저장 완료</Text>
                <Text style={s.syncSub}>전체 백업으로 언제든 내보내기</Text>
              </View>
            </View>
          </View>
        )}
        <View style={s.main}>
          <View style={s.libraryTop}>
            <View>
              <Text style={s.eyebrow}>나의 공간</Text>
              <Text style={s.heading}>{selected === '전체' ? '모든 노트' : categories.includes(selected) ? folderBreadcrumb(selected) : selected}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setCloudOpen(true)} style={[s.newButton, s.secondaryButton]}>
                <Ionicons name="cloud-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>Cloudflare</Text>
              </Pressable>
              <Pressable onPress={onRestore} style={[s.newButton, s.secondaryButton]}>
                <Ionicons name="cloud-upload-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>복원</Text>
              </Pressable>
              <Pressable onPress={onExport} style={[s.newButton, s.secondaryButton]}>
                <Ionicons name="download-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>전체 백업</Text>
              </Pressable>
              <Pressable onPress={onImport} style={[s.newButton, s.secondaryButton]}>
                <Ionicons name="document-attach-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>PDF</Text>
              </Pressable>
              <Pressable onPress={createHere} style={s.newButton}>
                <Ionicons name="add" size={22} color="white" />
                <Text style={s.newText}>새 노트</Text>
              </Pressable>
            </View>
          </View>
          {compact && <View style={{ marginTop: 18 }}>{chips}</View>}
          <View style={s.search}>
            <Ionicons name="search" size={20} color={C.muted} />
            <TextInput value={query} onChangeText={setQuery} placeholder="제목·태그·손글씨 검색" placeholderTextColor="#99958C" style={s.searchInput} />
          </View>
          {filtered.length === 0 ? (
            <Pressable onPress={createHere} style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="document-text-outline" size={34} color={C.accent} />
              </View>
              <Text style={s.emptyTitle}>{query ? '검색 결과가 없어요' : '이 폴더에 노트가 없어요'}</Text>
              <Text style={s.emptyBody}>새 노트를 만들거나 다른 폴더를 선택하세요.</Text>
            </Pressable>
          ) : (
            <ScrollView contentContainerStyle={s.grid}>
              {filtered.map((n) => {
                const hit = hitMap.get(n.id);
                return (
                  <Pressable key={n.id} onPress={() => onOpen(n.id, hit?.pageIndex)} onLongPress={() => manage(n)} style={s.card}>
                    <View style={s.cover}>
                      <View style={s.coverBand} />
                      {Array.from({ length: 6 }, (_, i) => (
                        <View key={i} style={[s.coverLine, { top: 42 + i * 20 }]} />
                      ))}
                      <Pressable
                        accessibilityLabel={n.favorite ? '즐겨찾기 해제' : '즐겨찾기'}
                        onPress={() =>
                          onUpdate({
                            ...n,
                            favorite: !n.favorite,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        style={s.cardStar}
                      >
                        <Ionicons name={n.favorite ? 'star' : 'star-outline'} size={17} color={n.favorite ? '#B77A18' : C.muted} />
                      </Pressable>
                      <Text style={s.coverPage}>{hit ? `p.${hit.pageIndex + 1}` : `${n.pages.length}p`}</Text>
                    </View>
                    <Text numberOfLines={1} style={s.cardTitle}>
                      {n.title}
                    </Text>
                    {n.tags.length > 0 && (
                      <Text numberOfLines={1} style={s.tagLine}>
                        {n.tags.map((tag) => `#${tag}`).join(' ')}
                      </Text>
                    )}
                    {hit && (
                      <Text numberOfLines={2} style={s.hitSnippet}>
                        {hit.snippet.replace(/<\/?b>/g, '')}
                      </Text>
                    )}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text style={s.cardMeta}>{new Date(n.updatedAt).toLocaleDateString('ko-KR')}</Text>
                      <Pressable onPress={() => manage(n)} style={s.folderBadge}>
                        <Text numberOfLines={1} style={s.folderBadgeText}>
                          {folderBreadcrumb(n.folder)}
                        </Text>
                      </Pressable>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
      <CloudSyncPanel visible={cloudOpen} onClose={() => setCloudOpen(false)} items={items} onRestore={onCloudRestore} />
      <NotebookOrganizer
        notebook={managing}
        categories={categories}
        onClose={() => setManaging(null)}
        onDelete={onDelete}
        onSave={(next) => {
          onUpdate(next);
          setManaging(next);
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  muted: { color: C.muted },
  editor: { flex: 1, flexDirection: 'row' },
  editorLeftHanded:{flexDirection:'row-reverse'},
  canvasArea: { flex: 1, padding: 24, alignItems: 'center' },
  paper: {
    width: '100%',
    maxWidth: 900,
    aspectRatio: 1.414,
    backgroundColor: C.paper,
    borderRadius: 3,
    overflow: 'hidden',
    shadowColor: '#3B392F',
    shadowOpacity: 0.13,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
  },
  pageGrid: {
    position: 'absolute',
    right: 178,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  pageGridLeft:{right:undefined,left:178},
  rotatePage: {
    position: 'absolute',
    right: 128,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  rotatePageLeft:{right:undefined,left:128},
  rail: {
    width: 112,
    backgroundColor: C.sidebar,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
  },
  railLeft:{borderLeftWidth:0,borderRightWidth:1,borderRightColor:C.line},
  railActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
    marginBottom: 10,
  },
  railAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.line,
  },
  templateDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.white,
  },
  templateActive: { backgroundColor: C.accent },
  railTitle: { padding: 15, fontSize: 12, color: C.muted, fontWeight: '700' },
  railList: { alignItems: 'center', gap: 12, paddingBottom: 24 },
  thumb: {
    width: 76,
    height: 55,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 6,
  },
  thumbActive: { borderWidth: 2, borderColor: C.accent },
  thumbLines: {
    flex: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E4E8E1',
  },
  thumbBookmark: { position: 'absolute', right: 4, top: 0 },
  pageNo: {
    fontSize: 10,
    color: C.muted,
    position: 'absolute',
    bottom: -15,
    alignSelf: 'center',
  },
  templatePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  categoryChip: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  categoryChipText: { fontSize: 12, fontWeight: '700', color: C.muted },
  categoryInput: {
    height: 38,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  secondaryButton: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
  },
  folderBadge: {
    backgroundColor: C.accentSoft,
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  folderBadgeText: { fontSize: 9, color: C.accent, fontWeight: '700' },
  library: { flex: 1, flexDirection: 'row' },
  sidebar: {
    width: 238,
    backgroundColor: C.sidebar,
    borderRightWidth: 1,
    borderRightColor: C.line,
    padding: 18,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 30,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: 'white', fontWeight: '800', fontSize: 17 },
  brandText: { fontSize: 20, color: C.ink, fontWeight: '800' },
  section: {
    fontSize: 11,
    color: '#99958C',
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 7,
    paddingHorizontal: 10,
  },
  sideItem: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 11,
    paddingHorizontal: 11,
  },
  sideActive: { backgroundColor: C.accentSoft },
  sideText: { color: C.muted, fontWeight: '600' },
  sideActiveText: { color: C.accent, fontWeight: '700' },
  sync: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: 'row',
    gap: 9,
    alignItems: 'center',
  },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#64A37C' },
  syncTitle: { fontSize: 12, fontWeight: '700', color: C.ink },
  syncSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  main: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
    backgroundColor: '#FBFAF7',
  },
  libraryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: { color: C.muted, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  heading: {
    color: C.ink,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: C.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderRadius: 13,
    paddingHorizontal: 16,
  },
  newText: { color: 'white', fontWeight: '700' },
  search: {
    height: 46,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    backgroundColor: C.white,
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    outlineStyle: 'none',
  } as never,
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    paddingVertical: 28,
  },
  card: { width: 168 },
  cover: {
    width: 168,
    height: 216,
    backgroundColor: '#FFFDF8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
    shadowColor: '#4B493F',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  coverBand: {
    width: 12,
    height: '100%',
    backgroundColor: C.accentSoft,
    borderRightWidth: 1,
    borderRightColor: '#C7DAD3',
  },
  coverLine: {
    position: 'absolute',
    left: 31,
    right: 20,
    height: 1,
    backgroundColor: '#E3E6E0',
  },
  cardStar: {
    position: 'absolute',
    right: 9,
    top: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPage: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: C.muted,
    fontSize: 10,
  },
  lassoPaste:{position:'absolute',top:110,right:18,zIndex:31,height:38,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:'rgba(255,255,255,.97)',paddingHorizontal:12,flexDirection:'row',alignItems:'center',gap:6,shadowColor:'#000',shadowOpacity:.12,shadowRadius:8},
  lassoPasteLeft:{right:undefined,left:18},
  lassoPasteText:{fontSize:11,fontWeight:'800',color:C.accent},
  cardTitle: { marginTop: 11, fontWeight: '700', color: C.ink, fontSize: 14 },
  tagLine: { fontSize: 10, color: C.accent, marginTop: 4 },
  hitSnippet: { fontSize: 10, lineHeight: 14, color: C.muted, marginTop: 4 },
  cardMeta: { marginTop: 4, color: C.muted, fontSize: 11 },
  empty: {
    flex: 1,
    minHeight: 420,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { marginTop: 18, fontSize: 18, fontWeight: '800', color: C.ink },
  emptyBody: { marginTop: 7, color: C.muted },
});
