import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Appearance,
  Image,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { DocumentCanvas } from "./components/DocumentCanvas";
import { Paper } from "./components/Paper";
import { AudioPanel } from "./components/AudioPanel";
import { CloudSyncPanel } from "./components/CloudSyncPanel";
import { Toolbar } from "./components/Toolbar";
import {
  blankPage,
  loadCategories,
  loadLibrary,
  makeId,
  newNotebook,
  pdfNotebook,
  replaceLibrary,
  saveCategories,
  saveLibrary,
} from "./storage";
import { C, DOCUMENT_INK, DOCUMENT_LIGHT_INK } from "./theme";
import type {
  AudioSession,
  ImageElement,
  Notebook,
  PageElement,
  Sticker,
  TextElement,
  ToolSpec,
  Page,
} from "./types";
import {
  exportLibrary,
  exportNotebookArchive,
  importLibraryBackup,
  writeAutomaticBackup,
} from "./backup";
import { isLowPowerModeEnabled, recognizeDrawing } from "./vision";
import { createPageFlashcardAssets, exportNotebookPdf, exportPagePng } from "./export";
import { uploadArchiveIfEnabled } from "./cloudSync";
import {
  rebuildSearchIndex,
  searchLibrary,
  type SearchHit,
} from "./searchIndex";
import { FlashcardPanel } from "./components/FlashcardPanel";
import { createPageFlashcard, dueFlashcards } from "./srs";
import { NotebookOrganizer } from "./components/NotebookOrganizer";
import { PdfOutlinePanel } from "./components/PdfOutlinePanel";
import type { PdfOutlineItem } from "./components/DocumentCanvas";
import { DocumentTabs } from "./components/DocumentTabs";
import {ReferencePanel} from './components/ReferencePanel';
import { ElementsLayer } from "./components/ElementsLayer";
import { pickPersistentImage, pickPersistentTemplate } from "./imageAssets";
import { usePrivacyLock } from "./privacyLock";
import { LockScreen } from "./components/LockScreen";
import { ContinuousDocument } from "./components/ContinuousDocument";
import {
  childFolder,
  deleteFolderPaths,
  expandFolderPaths,
  folderBreadcrumb,
  folderContains,
  folderDepth,
  folderLabel,
  parentFolder,
  renameFolderPaths,
  replaceFolderRoot,
} from "./folders";
import { PageTransferPanel } from "./components/PageTransferPanel";
import { duplicateNotebookPage, transferPage as transferNotebookPage } from "./pageTransfer";
import { loadUiPreferences, saveUiPreferences } from "./uiPreferences";
import { appearanceOverride } from "./themePolicy";
import { ZoomablePage } from "./components/ZoomablePage";
import { PageGridPanel } from "./components/PageGridPanel";
import { PageJumpPanel } from "./components/PageJumpPanel";
import { resolvePdfPageIndex } from "./pdfNavigation";
import { StickerPanel } from "./components/StickerPanel";
import { loadStickers, saveStickers, stickerFromImage } from "./stickers";
import { mergeCloudRestore, summarizeNewCloudConflicts } from "./cloudMerge";
import { transcribeAudio } from "./speech";
import { SelectionBar } from "./components/SelectionBar";
import { SearchHighlight } from "./components/SearchHighlight";
import { SettingsPanel } from "./components/SettingsPanel";
import { defaultUiPreferences, type UiPreferences } from "./uiPreferences";
import { DocumentSearchPanel } from "./components/DocumentSearchPanel";
import { PagePaintPanel } from "./components/PagePaintPanel";
import { selectionTextToQuestion } from "./flashcardDraft";
import {moveSelectedElements,selectElementIds} from './elementSelection';
import {normalizeCanvasExtent,resizePageCanvas} from './canvasExtent';
import {resolveReferenceNotebook} from './referenceDocument';
import { insertPage } from "./pageInsert";
import type { PencilAction } from "./pencilActions";
import { resolvePencilPreferredAction } from "./pencilPreferredAction";
import { templateSpacings } from "./templateSpacing";
import { normalizeNotebookCoverColor } from "./notebookCover";
import { backupFailureStage as resolveBackupFailureStage, backupIntervalMs, backupUploadUri } from "./backupPolicy";
import {pushBounded} from './boundedHistory';
import {resolveDarkInkTransition} from './darkInkPolicy';

type PagePaintSnapshot=Pick<Page,'backgroundColor'|'backgroundColor2'|'backgroundGradientDirection'|'backgroundOpacity'>;
type PagePaintPageSnapshot={pageId:string;paint:PagePaintSnapshot};
type SelectionHistoryEntry={kind:'element';pageId:string;element:TextElement}|{kind:'snapshot';pageId:string;before:PageElement[];after:PageElement[];native:boolean}|{kind:'pagePaint';pageId:string;before:PagePaintSnapshot;after:PagePaintSnapshot}|{kind:'pagePaintBatch';before:PagePaintPageSnapshot[];after:PagePaintPageSnapshot[]}|{kind:'native'};
import { ExportPanel } from "./components/ExportPanel";
import { FolderManager } from "./components/FolderManager";
import { LibraryMovePanel } from "./components/LibraryMovePanel";
import {
  librarySearchMatches,
  mayRevealNotebookSnippet,
} from "./notebookPrivacy";
import Constants from "expo-constants";
import {
  sortNotebooks,
  markNotebookOpened,
  libraryTagFromSelection,
  libraryTagSelectionKey,
  libraryTags,
  type LibrarySort,
  type LibraryViewMode,
} from "./libraryView";
import { deleteNotebookSelection, moveNotebookSelection, setNotebookSelectionFavorite, toggleNotebookSelection } from "./librarySelection";
import { FOCUS_TOOLBAR_IDLE_MS } from "./focusPolicy";
import { configurePageHaptics, playPageHaptic } from "./pageHaptics";
import { OCR_LOW_POWER_RETRY_MS, ocrJobDisposition } from "./ocrPolicy";
import { findAudioStroke } from "./audioSync";
import { persistImportedPdf } from "./pdfAssets";

const buildIdentity = `${Constants.expoConfig?.version ?? "0.1.0"} (${Constants.nativeBuildVersion ?? "dev"}) · ${String(Constants.expoConfig?.extra?.hanjiBuild ?? "dev")}`;

export function HanjiApp() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const privacy = usePrivacyLock();
  const [items, setItems] = useState<Notebook[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [loadRecoveryBusy, setLoadRecoveryBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [unlockedNotes, setUnlockedNotes] = useState<Set<string>>(
    () => new Set(),
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [pageJumpOpen, setPageJumpOpen] = useState(false);
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [referenceId,setReferenceId]=useState<string>();
  const tabPages = useRef<Record<string, number>>({});
  const [query, setQuery] = useState("");
  const [searchHits, setSearchHits] = useState<SearchHit[] | null>(null);
  const [searchFocus, setSearchFocus] = useState<{
    pageId: string;
    query: string;
    nonce: number;
  }>();
  const [pendingExcerpt, setPendingExcerpt] = useState<{
    text: string;
    source: NonNullable<TextElement["source"]>;
  }>();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const saveRevision = useRef(0);
  const appStateRef = useRef(AppState.currentState);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [saveError, setSaveError] = useState("");
  const runLibrarySave = (
    snapshot = itemsRef.current,
    revision = ++saveRevision.current,
  ) => {
    setSaveStatus("saving");
    setSaveError("");
    return saveLibrary(snapshot).then(
      () => {
        if (revision === saveRevision.current) setSaveStatus("saved");
      },
      (error: unknown) => {
        if (revision !== saveRevision.current) return;
        setSaveStatus("error");
        setSaveError(
          error instanceof Error ? error.message : "로컬 저장에 실패했습니다.",
        );
      },
    );
  };
  const backupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backupRevision = useRef(0);
  const pendingCloudUriRef = useRef<string | undefined>(undefined);
  const [backupStatus, setBackupStatus] = useState<
    "waiting" | "backing" | "success" | "error"
  >("waiting");
  const [backupError, setBackupError] = useState("");
  const [backupFailureStage, setBackupFailureStage] = useState<
    "local" | "cloud"
  >("local");
  const [lastBackupAt, setLastBackupAt] = useState<number>();
  const indexTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocrTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const ocrRevisions = useRef(new Map<string, number>());
  const ocrJobs = useRef<Array<() => Promise<void>>>([]);
  const ocrRunning = useRef(0);
  const audioStartRef = useRef<number | null>(null);
  const audioStrokesRef = useRef<
    { pageId: string; createdAt: number; seekSec: number }[]
  >([]);
  const [tool, setToolState] = useState<ToolSpec>({
    kind: "pen",
    color: DOCUMENT_INK,
    width: 2,
    opacity: 1,
    scratchEnabled: true,
    eraserAutoReturn: true,
  });
  const previousPencilTool = useRef<ToolSpec>(tool);
  const previousSystemTool = useRef<ToolSpec>(tool);
  const squeezeTemporaryTool = useRef<ToolSpec | undefined>(undefined);
  const setTool = (value: ToolSpec | ((active: ToolSpec) => ToolSpec)) =>
    setToolState((active) => {
      const next = typeof value === "function" ? value(active) : value;
      if (JSON.stringify(next) !== JSON.stringify(active))
        previousSystemTool.current = active;
      const inks = [
        "pen",
        "fountainPen",
        "monoline",
        "pencil",
        "crayon",
        "watercolor",
        "marker",
      ];
      if (next.kind === "eraser" && inks.includes(active.kind))
        previousPencilTool.current = active;
      else if (inks.includes(next.kind)) previousPencilTool.current = next;
      return next;
    });
  const [audioSeek, setAudioSeek] = useState<{
    seconds: number;
    nonce: number;
    sessionCreatedAt: string;
  }>();
  const [replayCutoff, setReplayCutoff] = useState<number>();
  const [selection, setSelection] = useState<{ pageId: string; count: number }>(
    { pageId: "", count: 0 },
  );
  const [selectedElements,setSelectedElements]=useState<{pageId:string;ids:string[]}>({pageId:"",ids:[]});
  const selectedElementsRef=useRef(selectedElements);selectedElementsRef.current=selectedElements;
  const selectionBoundsRef=useRef<{pageId:string;x:number;y:number;width:number;height:number}|undefined>(undefined);
  const selectionWasMovingRef=useRef(false);
  const selectionElementMoveOriginRef=useRef<{pageId:string;elements:PageElement[];x:number;y:number}|undefined>(undefined);
  const selectionInkCountRef=useRef(0),elementClipboardHasInkRef=useRef(false);
  const selectedElementClipboardRef=useRef<PageElement[]>([]);
  const [selectionAction, setSelectionAction] = useState<{
    nonce: number;
    type:
      | "delete"
      | "recolor"
      | "text"
      | "flashcard"
      | "imageFlashcard"
      | "clip"
      | "clear"
      | "copy"
      | "cut"
      | "paste"
      | "duplicate"
      | "shrink"
      | "grow"
      | "rotate";
    color?: string;
  }>();
  const selectionUndoRef = useRef<SelectionHistoryEntry[]>([]);
  const selectionRedoRef = useRef<SelectionHistoryEntry[]>([]);
  const recordSelectionHistory=(entry:SelectionHistoryEntry)=>{selectionUndoRef.current=pushBounded(selectionUndoRef.current,entry);selectionRedoRef.current=[]};
  const [flashcardsOpen, setFlashcardsOpen] = useState(false);
  const [flashcardDraft, setFlashcardDraft] = useState<string>();
  const [flashcardDraftImage, setFlashcardDraftImage] = useState<string>();
  const [pdfOutline, setPdfOutline] = useState<PdfOutlineItem[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [undoSignal, setUndoSignal] = useState(0);
  const [redoSignal, setRedoSignal] = useState(0);
  const [zoomWindowEnabled, setZoomWindowEnabled] = useState(false);
  const [elementMode, setElementMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusToolbarVisible, setFocusToolbarVisible] = useState(false);
  const focusHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [uiPreferences, setUiPreferences] =
    useState<UiPreferences>(defaultUiPreferences);
  const autoDarkInkRef=useRef(false);
  const activePageTemplate=openId?items.find(item=>item.id===openId)?.pages[pageIndex]?.template:undefined;
  useEffect(()=>{
    setToolState(active=>{
      const transition=resolveDarkInkTransition(active.color,activePageTemplate,uiPreferences.autoDarkInk,autoDarkInkRef.current);
      autoDarkInkRef.current=transition.autoInverted;
      if(transition.color===active.color)return active;
      const next={...active,color:transition.color};
      const previous=previousPencilTool.current;
      if(previous.color.toUpperCase()===active.color.toUpperCase())previousPencilTool.current={...previous,color:transition.color};
      if(['pen','fountainPen','monoline','pencil','crayon','watercolor','marker'].includes(next.kind))previousPencilTool.current=next;
      return next;
    });
  },[activePageTemplate,tool.color,uiPreferences.autoDarkInk]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [documentSearchOpen, setDocumentSearchOpen] = useState(false);
  const [pagePaintOpen, setPagePaintOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [indexStatus, setIndexStatus] = useState<
    "idle" | "running" | "success" | "error"
  >("idle");
  const { leftHanded, fingerDrawingEnabled } = uiPreferences;
  const [pageTransferOpen, setPageTransferOpen] = useState(false);
  const [pageGridOpen, setPageGridOpen] = useState(false);
  const [stickerOpen, setStickerOpen] = useState(false);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const runAutomaticBackup = async (
    snapshot = itemsRef.current,
    retryCloudOnly = false,
    revision = ++backupRevision.current,
  ) => {
    setBackupStatus("backing");
    setBackupError("");
    let localReady = retryCloudOnly;
    try {
      let uri = retryCloudOnly ? pendingCloudUriRef.current : undefined;
      if (!retryCloudOnly) {
        const created = await writeAutomaticBackup(
          snapshot,
          uiPreferences.backupRetention,
          backupIntervalMs(uiPreferences.backupIntervalMinutes),
        );
        localReady = true;
        uri = backupUploadUri(created, pendingCloudUriRef.current);
      }
      if (uri) {
        pendingCloudUriRef.current = uri;
        await uploadArchiveIfEnabled(uri);
        pendingCloudUriRef.current = undefined;
      }
      if (revision !== backupRevision.current) return;
      setBackupStatus("success");
      setLastBackupAt(Date.now());
    } catch (error) {
      if (revision !== backupRevision.current) return;
      setBackupFailureStage(resolveBackupFailureStage(localReady));
      setBackupStatus("error");
      setBackupError(
        error instanceof Error
          ? error.message
          : localReady
            ? "Cloud 백업에 실패했습니다."
            : "자동 백업에 실패했습니다.",
      );
    }
  };
  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    Promise.all([loadLibrary(), loadCategories()]).then(
      ([notes, cats]) => {
        if (cancelled) return;
        setItems(notes);
        setCategories(
          expandFolderPaths([...cats, ...notes.map((n) => n.folder)]),
        );
        setReady(true);
      },
      (error: unknown) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "저장된 노트를 읽지 못했습니다.",
        );
      },
    );
    void loadStickers().then(setStickers, () => undefined);
    void loadUiPreferences().then(setUiPreferences, () => undefined);
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);
  useEffect(
    () => () => {
      for (const timer of ocrTimers.current.values()) clearTimeout(timer);
      ocrTimers.current.clear();
      ocrJobs.current = [];
    },
    [],
  );
  useEffect(
    () => configurePageHaptics(uiPreferences.pageTurnHaptics),
    [uiPreferences.pageTurnHaptics],
  );
  useEffect(() => {
    if(Platform.OS==='web'&&typeof document!=='undefined')document.documentElement.style.colorScheme=uiPreferences.colorScheme==='system'?'light dark':uiPreferences.colorScheme;
    else Appearance.setColorScheme(appearanceOverride(uiPreferences.colorScheme) as never);
  }, [uiPreferences.colorScheme]);
  useEffect(() => {
    if (ready) saveCategories(categories);
  }, [categories, ready]);
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const revision = ++saveRevision.current;
    setSaveStatus("saving");
    saveTimer.current = setTimeout(
      () => void runLibrarySave(items, revision),
      350,
    );
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [items, ready]);
  useEffect(() => {
    if (!ready) return;
    const subscription = AppState.addEventListener("change", (state) => {
      const wasActive = appStateRef.current === "active";
      appStateRef.current = state;
      if (
        !wasActive ||
        (state !== "background" && state !== "inactive")
      )
        return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = null;
      void runLibrarySave(itemsRef.current);
    });
    return () => subscription.remove();
  }, [ready]);
  useEffect(() => {
    if (!ready) return;
    if (backupTimer.current) clearTimeout(backupTimer.current);
    const revision = ++backupRevision.current;
    setBackupStatus("waiting");
    backupTimer.current = setTimeout(() => {
      void runAutomaticBackup(items, false, revision);
    }, 15000);
    return () => {
      if (backupTimer.current) clearTimeout(backupTimer.current);
    };
  }, [
    items,
    ready,
    uiPreferences.backupRetention,
    uiPreferences.backupIntervalMinutes,
  ]);
  useEffect(() => {
    if (!ready) return;
    if (indexTimer.current) clearTimeout(indexTimer.current);
    indexTimer.current = setTimeout(() => {
      void rebuildSearchIndex(items).catch(() => undefined);
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
    if (!searchFocus) return;
    const timer = setTimeout(() => setSearchFocus(undefined), 5000);
    return () => clearTimeout(timer);
  }, [searchFocus?.nonce]);
  const showFocusToolbar = () => {
    if (!focusMode) return;
    setFocusToolbarVisible(true);
    if (focusHideTimer.current) clearTimeout(focusHideTimer.current);
    focusHideTimer.current = setTimeout(
      () => setFocusToolbarVisible(false),
      FOCUS_TOOLBAR_IDLE_MS,
    );
  };
  useEffect(() => {
    if (!focusMode) {
      if (focusHideTimer.current) clearTimeout(focusHideTimer.current);
      focusHideTimer.current = null;
      setFocusToolbarVisible(false);
      return;
    }
    setFocusToolbarVisible(true);
    focusHideTimer.current = setTimeout(
      () => setFocusToolbarVisible(false),
      FOCUS_TOOLBAR_IDLE_MS,
    );
    return () => {
      if (focusHideTimer.current) clearTimeout(focusHideTimer.current);
    };
  }, [focusMode]);
  useEffect(() => {
    if (openId) tabPages.current[openId] = pageIndex;
  }, [openId, pageIndex]);
  const trackedOpenId=useRef<string|null>(null);
  useEffect(()=>{
    if(!openId){trackedOpenId.current=null;return}
    if(trackedOpenId.current===openId)return;
    trackedOpenId.current=openId;
    setItems(all=>markNotebookOpened(all,openId,new Date().toISOString()));
  },[openId]);
  useEffect(() => {
    if (openId)
      setOpenTabs((tabs) => (tabs.includes(openId) ? tabs : [...tabs, openId]));
  }, [openId]);
  useEffect(() => setUnlockedNotes(new Set()), [privacy.sessionRevision]);
  const importPdf = async (folder?: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    try {
      const persistentUri = persistImportedPdf(asset.uri, asset.name);
      const note = pdfNotebook(asset.name, persistentUri);
      if (folder) note.folder = folder;
      setItems((all) => [note, ...all]);
      setOpenId(note.id);
      setPageIndex(0);
    } catch (error) {
      Alert.alert(
        "PDF 가져오기 실패",
        error instanceof Error ? error.message : "PDF 원본을 영구 저장하지 못했습니다.",
      );
    }
  };
  const drainOcr = () => {
    while (ocrRunning.current < 2 && ocrJobs.current.length) {
      const job = ocrJobs.current.shift();
      if (!job) break;
      ocrRunning.current += 1;
      void job().finally(() => {
        ocrRunning.current -= 1;
        drainOcr();
      });
    }
  };
  const queueOcr = (
    notebookId: string,
    pageId: string,
    drawingData: string,
  ) => {
    const key = `${notebookId}:${pageId}`,
      previous = ocrTimers.current.get(key);
    if (previous) clearTimeout(previous);
    const revision = (ocrRevisions.current.get(key) ?? 0) + 1;
    ocrRevisions.current.set(key, revision);
    if (!drawingData) {
      update(notebookId, (n) => ({
        ...n,
        pages: n.pages.map((p) =>
          p.id === pageId
            ? { ...p, ocrText: undefined, ocrWords: undefined }
            : p,
        ),
      }));
      return;
    }
    const timer = setTimeout(() => {
      ocrTimers.current.delete(key);
      const run = async () => {
        if (ocrRevisions.current.get(key) !== revision) return;
        try {
          const disposition = ocrJobDisposition(
            await isLowPowerModeEnabled(),
            ocrRevisions.current.get(key),
            revision,
          );
          if (disposition === "stale") return;
          if (disposition === "defer") {
            const retry = setTimeout(() => {
              ocrTimers.current.delete(key);
              if (ocrRevisions.current.get(key) !== revision) return;
              ocrJobs.current.push(run);
              drainOcr();
            }, OCR_LOW_POWER_RETRY_MS);
            ocrTimers.current.set(key, retry);
            return;
          }
          const result = await recognizeDrawing(drawingData);
          if (ocrRevisions.current.get(key) !== revision) return;
          update(notebookId, (n) => ({
            ...n,
            pages: n.pages.map((p) =>
              p.id === pageId && p.drawingData === drawingData
                ? {
                    ...p,
                    ocrText: result.text || undefined,
                    ocrWords: result.words.length ? result.words : undefined,
                  }
                : p,
            ),
          }));
        } catch {}
      };
      ocrJobs.current.push(run);
      drainOcr();
    }, 1400);
    ocrTimers.current.set(key, timer);
  };
  const current = items.find((x) => x.id === openId);
  const navigatePage = (index: number) => {
    playPageHaptic(uiPreferences.pageTurnHaptics, pageIndex, index);
    setPageIndex(index);
  };
  const unlockNotebook = async (note: Notebook) => {
    if (!note.locked || unlockedNotes.has(note.id)) return true;
    const success = await privacy.authenticate(`${note.title} 잠금 해제`);
    if (success)
      setUnlockedNotes((currentSet) => new Set(currentSet).add(note.id));
    return success;
  };
  const update = (id: string, fn: (n: Notebook) => Notebook) =>
    setItems((all) => all.map((n) => (n.id === id ? fn(n) : n)));
  const restoreFailedLibrary = async () => {
    setLoadRecoveryBusy(true);
    try {
      const restored = await importLibraryBackup();
      if (!restored) return;
      await replaceLibrary(restored);
      setLoadError("");
      setLoadAttempt((attempt) => attempt + 1);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "백업을 복원하지 못했습니다.",
      );
    } finally {
      setLoadRecoveryBusy(false);
    }
  };
  if (!ready && loadError)
    return (
      <SafeAreaView style={s.loadFailure}>
        <Ionicons name="alert-circle-outline" size={38} color="#C64B47" />
        <Text accessibilityRole="alert" style={s.loadFailureTitle}>
          노트를 열지 못했습니다
        </Text>
        <Text style={s.loadFailureMessage}>{loadError}</Text>
        <Text style={s.loadFailureHelp}>
          기존 데이터는 변경하지 않았습니다. 저장 공간을 확인한 뒤 다시
          시도하세요.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="저장된 노트 다시 읽기"
          onPress={() => setLoadAttempt((attempt) => attempt + 1)}
          style={s.loadRetry}
        >
          <Ionicons name="refresh" size={18} color={C.white} />
          <Text style={s.loadRetryText}>다시 시도</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="한지 백업 파일 복원"
          disabled={loadRecoveryBusy}
          onPress={() => void restoreFailedLibrary()}
          style={s.loadRestore}
        >
          {loadRecoveryBusy ? (
            <ActivityIndicator size="small" color={C.accent} />
          ) : (
            <Ionicons name="cloud-upload-outline" size={18} color={C.accent} />
          )}
          <Text style={s.loadRestoreText}>.hanji 백업 복원</Text>
        </Pressable>
      </SafeAreaView>
    );
  if (!ready)
    return (
      <View style={s.loading}>
        <ActivityIndicator color={C.accent} />
        <Text style={s.muted}>서재를 여는 중…</Text>
      </View>
    );
  if (privacy.locked)
    return <LockScreen onUnlock={() => void privacy.authenticate()} />;
  if (current?.locked && !unlockedNotes.has(current.id))
    return <LockScreen onUnlock={() => void unlockNotebook(current)} />;
  if (!current)
    return (
      <Library
        items={items}
        categories={categories}
        query={query}
        searchHits={searchHits}
        backupRetention={uiPreferences.backupRetention}
        librarySort={uiPreferences.librarySort}
        libraryView={uiPreferences.libraryView}
        saveStatus={saveStatus}
        saveError={saveError}
        onRetrySave={() => void runLibrarySave()}
        backupStatus={backupStatus}
        backupError={backupError}
        backupFailureStage={backupFailureStage}
        lastBackupAt={lastBackupAt}
        onRetryBackup={() =>
          void runAutomaticBackup(
            itemsRef.current,
            backupFailureStage === "cloud",
          )
        }
        onLibraryDisplayChange={(patch) => {
          const next = { ...uiPreferences, ...patch };
          setUiPreferences(next);
          void saveUiPreferences(next);
        }}
        setQuery={setQuery}
        onOpen={async (id, index = 0, searchQuery) => {
          const opening = items.find((note) => note.id === id);
          if (!opening || !(await unlockNotebook(opening))) return;
          const target = items.find((note) => note.id === id)?.pages[index];
          setSearchFocus(
            searchQuery && target
              ? { pageId: target.id, query: searchQuery, nonce: Date.now() }
              : undefined,
          );
          if (
            searchQuery &&
            target?.drawingData &&
            !target.ocrWords?.some((word) => word.coordinateSpace === "canvas")
          )
            queueOcr(id, target.id, target.drawingData);
          setOpenId(id);
          setPageIndex(index);
        }}
        onUpdate={(changed) =>
          setItems((all) => all.map((n) => (n.id === changed.id ? changed : n)))
        }
        onToggleNotebookLock={async (note) => {
          const success = await privacy.authenticate(
            note.locked ? `${note.title} 잠금 끄기` : `${note.title} 잠금 켜기`,
          );
          if (!success) return false;
          const changed = {
            ...note,
            locked: !note.locked,
            updatedAt: new Date().toISOString(),
          };
          setItems((all) =>
            all.map((item) => (item.id === note.id ? changed : item)),
          );
          setUnlockedNotes((currentSet) => {
            const next = new Set(currentSet);
            if (changed.locked) next.add(note.id);
            else next.delete(note.id);
            return next;
          });
          return true;
        }}
        onCloudRestore={(restored) => {
          setCategories((all) =>
            expandFolderPaths([...all, ...restored.map((n) => n.folder)]),
          );
          const merged = mergeCloudRestore(items, restored);
          const conflicts = summarizeNewCloudConflicts(items, merged);
          setItems(merged);
          if (conflicts.notebooks)
            Alert.alert(
              "페이지 충돌을 보존했습니다",
              `덮어쓰지 않은 이전 페이지 ${conflicts.pages}개를 충돌 사본 ${conflicts.notebooks}권에 보관했습니다. 서재의 빨간 배지에서 확인할 수 있습니다.`,
            );
        }}
        onAddCategory={(name) =>
          setCategories((all) => expandFolderPaths([...all, name]))
        }
        onRenameCategory={(folder, name) => {
          const target = childFolder(parentFolder(folder), name);
          if (target !== folder && categories.includes(target)) {
            Alert.alert(
              "이름 변경 불가",
              "같은 위치에 같은 이름의 폴더가 있습니다.",
            );
            return false;
          }
          setCategories((all) => renameFolderPaths(all, folder, name));
          setItems((all) =>
            all.map((note) =>
              folderContains(folder, note.folder)
                ? {
                    ...note,
                    folder: replaceFolderRoot(note.folder, folder, target),
                    updatedAt: new Date().toISOString(),
                  }
                : note,
            ),
          );
          return true;
        }}
        onDeleteCategory={(folder) => {
          const destination = parentFolder(folder) || "내 노트";
          setCategories((all) =>
            expandFolderPaths([
              ...deleteFolderPaths(all, folder, "내 노트"),
              destination,
            ]),
          );
          setItems((all) =>
            all.map((note) =>
              folderContains(folder, note.folder)
                ? {
                    ...note,
                    folder: replaceFolderRoot(note.folder, folder, destination),
                    updatedAt: new Date().toISOString(),
                  }
                : note,
            ),
          );
        }}
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
              setCategories((all) =>
                expandFolderPaths([...all, ...restored.map((n) => n.folder)]),
              );
              setItems((existing) => {
                const merged = new Map(existing.map((n) => [n.id, n]));
                restored.forEach((n) => merged.set(n.id, n));
                return [...merged.values()].sort((a, b) =>
                  b.updatedAt.localeCompare(a.updatedAt),
                );
              });
            }
          } catch (error) {
            Alert.alert(
              "복원 실패",
              error instanceof Error
                ? error.message
                : "백업 파일을 읽을 수 없습니다.",
            );
          }
        }}
        onImport={importPdf}
        onCreate={(folder) => {
          const n = newNotebook(
            undefined,
            uiPreferences.defaultTemplate,
            uiPreferences.defaultTemplateSpacing,
          );
          if (folder) n.folder = folder;
          setItems((x) => [n, ...x]);
          setOpenId(n.id);
        }}
        onDelete={(id) =>
          Alert.alert("노트 삭제", "이 노트를 삭제할까요?", [
            { text: "취소" },
            {
              text: "삭제",
              style: "destructive",
              onPress: () => setItems((x) => x.filter((n) => n.id !== id)),
            },
          ])
        }
        onDeleteMany={(ids, onDeleted) =>
          Alert.alert(
            "노트 여러 개 삭제",
            `선택한 노트 ${ids.length}권을 삭제할까요?`,
            [
              { text: "취소" },
              {
                text: "삭제",
                style: "destructive",
                onPress: () => {
                  const selected = new Set(ids);
                  setItems((all) => deleteNotebookSelection(all, selected));
                  onDeleted();
                },
              },
            ],
          )
        }
      />
    );
  const page = current.pages[pageIndex] ?? current.pages[0];
  if (!page) return null;
  const canvasExtent = normalizeCanvasExtent(page.canvasExtent);
  const referenceNote=resolveReferenceNotebook(items,referenceId,current.id);
  const selectTab = async (id: string) => {
    const note = items.find((item) => item.id === id);
    if (!note || !(await unlockNotebook(note))) return;
    setOpenId(id);
    if(referenceId===id)setReferenceId(undefined);
    setPageIndex(tabPages.current[id] ?? 0);
  };
  const selectReference=async(id:string)=>{const note=items.find(item=>item.id===id);if(!note||note.id===current.id||!(await unlockNotebook(note)))return;setItems(all=>markNotebookOpened(all,id,new Date().toISOString()));setReferenceId(id)};
  const closeTab = (id: string) => {
    const index = openTabs.indexOf(id),
      remaining = openTabs.filter((x) => x !== id);
    setOpenTabs(remaining);
    if(referenceId===id)setReferenceId(undefined);
    if (openId === id) {
      const next =
        remaining[Math.min(Math.max(index, 0), remaining.length - 1)];
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
                  kind: "image",
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
    const existing = stickers.find(
      (item) =>
        item.uri === image.uri &&
        item.fit === image.fit &&
        item.rotation === image.rotation&&item.cropZoom===image.cropZoom&&item.cropX===image.cropX&&item.cropY===image.cropY,
    );
    const next = existing
      ? [existing, ...stickers.filter((item) => item.id !== existing.id)]
      : [stickerFromImage(image), ...stickers];
    updateStickers(next);
  };
  const importSticker = async () => {
    const uri = await pickPersistentImage();
    if (!uri) return;
    updateStickers([
      stickerFromImage({
        id: makeId(),
        kind: "image",
        uri,
        x: 0.2,
        y: 0.2,
        width: 0.34,
        height: 0.34,
      }),
      ...stickers,
    ]);
  };
  const insertSticker = (sticker: Sticker) => {
    setElementMode(true);
    const element: ImageElement = {
      id: makeId(),
      kind: "image",
      uri: sticker.uri,
      x: Math.max(0.02, (1 - sticker.width) / 2),
      y: Math.max(0.02, (1 - sticker.height) / 2),
      width: sticker.width,
      height: sticker.height,
      fit: sticker.fit,
      rotation: sticker.rotation,
      cropZoom:sticker.cropZoom,
      cropX:sticker.cropX,
      cropY:sticker.cropY,
    };
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              elements: [...(p.elements ?? []), element],
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    setStickerOpen(false);
  };
  const applyCustomTemplate = async () => {
    let uri:string|null=null;
    try{uri=await pickPersistentTemplate()}catch(error){Alert.alert("템플릿을 가져올 수 없음",error instanceof Error?error.message:"파일을 확인해 주세요.");return}
    if (!uri) return;
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === page.id
          ? {
              ...p,
              customTemplateUri: uri,
              template: "plain",
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
    Alert.alert(
      "커스텀 템플릿",
      "이 페이지의 배경을 변경하거나 제거할 수 있습니다.",
      [
        { text: "취소" },
        {
          text: "제거",
          style: "destructive",
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
        { text: "교체", onPress: () => void applyCustomTemplate() },
      ],
    );
  };
  const togglePencilEraser = () =>
    setTool((active) => {
      if (active.kind === "eraser") return previousPencilTool.current;
      previousPencilTool.current = active;
      return { ...active, kind: "eraser", eraserMode: "vector" };
    });
  const restorePencilTool = () =>
    setTool((active) =>
      active.kind === "eraser" ? previousPencilTool.current : active,
    );
  const movePage = (direction: -1 | 1) => {
    const target = pageIndex + direction;
    if (target < 0 || target >= current.pages.length) return;
    update(current.id, (n) => {
      const pages = [...n.pages];
      const moving = pages[pageIndex];
      if (!moving) return n;
      pages.splice(pageIndex, 1);
      pages.splice(target, 0, moving);
      const timestamp=new Date().toISOString();return { ...n, pages, updatedAt: timestamp,pageOrderUpdatedAt:timestamp };
    });
    setPageIndex(target);
  };
  const addPage = (placement?: "end") => {
    const targetPlacement =
      placement === "end" ? "end" : uiPreferences.newPagePlacement;
    const created = blankPage(
      uiPreferences.defaultTemplate,
      uiPreferences.defaultTemplateSpacing,
    );
    const inserted = insertPage(
      current.pages,
      created,
      pageIndex,
      targetPlacement,
    );
    update(current.id, (n) => {const timestamp=new Date().toISOString();return{
      ...n,
      pages: inserted.pages,
      updatedAt: timestamp,
      pageOrderUpdatedAt:timestamp,
    }});
    setPageIndex(inserted.index);
  };
  const changeDrawing = (target: typeof page, drawingData: string) => {
    showFocusToolbar();
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === target.id
          ? { ...p, drawingData, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));
    queueOcr(current.id, target.id, drawingData);
  };
  const changeCanvasMetrics = (target: typeof page, drawingViewport: NonNullable<Page["drawingViewport"]>) =>
    update(current.id, (notebook) => ({
      ...notebook,
      pages: notebook.pages.map((candidate) => {
        if (candidate.id !== target.id) return candidate;
        const previous = candidate.drawingViewport;
        if (previous && (["x", "y", "width", "height", "canvasWidth", "canvasHeight"] as const).every((key) => Math.abs(previous[key] - drawingViewport[key]) < 0.5)) return candidate;
        return { ...candidate, drawingViewport };
      }),
    }));
  const changeElements = (
    target: typeof page,
    elements: NonNullable<typeof page.elements>,
  ) =>
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === target.id
          ? { ...p, elements, updatedAt: new Date().toISOString() }
          : p,
      ),
    }));
  const commitElementChange=(target:typeof page,before:PageElement,after:PageElement)=>{const previous=target.elements??[],next=previous.map(element=>element.id===after.id?after:element);recordSelectionHistory({kind:'snapshot',pageId:target.id,before:previous,after:next,native:false});changeElements(target,next)};
  const handlePdfLink = (
    link: { pageIndex?: number; url?: string },
    sourcePage: Page,
  ) => {
    if (link.pageIndex !== undefined) {
      const target = resolvePdfPageIndex(current.pages, sourcePage, link.pageIndex);
      if (target !== undefined) navigatePage(target);
    } else if (link.url) {
      void (async () => {
        try {
          if (!(await Linking.canOpenURL(link.url!)))
            throw new Error("이 링크 형식을 열 수 없습니다.");
          await Linking.openURL(link.url!);
        } catch (error) {
          Alert.alert(
            "PDF 링크 열기 실패",
            error instanceof Error ? error.message : "외부 링크를 열 수 없습니다.",
          );
        }
      })();
    }
  };
  const capturePdfExcerpt = (
    sourcePage: typeof page,
    excerpt: { text: string; pageIndex: number },
  ) =>
    setPendingExcerpt({
      text: excerpt.text,
      source: {
        notebookId: current.id,
        pageId: sourcePage.id,
        pageIndex: excerpt.pageIndex,
        pdfName: sourcePage.pdfName,
      },
    });
  const pastePdfExcerpt = () => {
    if (!pendingExcerpt) return;
    const element: TextElement = {
      id: makeId(),
      kind: "text",
      text: pendingExcerpt.text,
      x: 0.58,
      y: 0.12,
      width: 0.34,
      height: 0.18,
      fontSize: 16,
      color: DOCUMENT_INK,
      source: pendingExcerpt.source,
    };
    changeElements(page, [...(page.elements ?? []), element]);
    setPendingExcerpt(undefined);
    setElementMode(true);
  };
  const navigateExcerptSource = (
    source: NonNullable<TextElement["source"]>,
  ) => {
    const note = items.find((item) => item.id === source.notebookId);
    if (!note) return;
    const index = note.pages.findIndex((item) => item.id === source.pageId);
    setOpenId(note.id);
    navigatePage(
      index >= 0
        ? index
        : Math.max(0, Math.min(source.pageIndex, note.pages.length - 1)),
    );
  };
  const navigateDocumentSearch = (index: number, searchQuery: string) => {
    const target = current.pages[index];
    if (!target) return;
    navigatePage(index);
    setSearchFocus({
      pageId: target.id,
      query: searchQuery,
      nonce: Date.now(),
    });
    if (
      target.drawingData &&
      !target.ocrWords?.some((word) => word.coordinateSpace === "canvas")
    )
      queueOcr(current.id, target.id, target.drawingData);
  };
  const handleStrokeAdded = (target: typeof page, createdAt: number) => {
    selectionUndoRef.current=[];selectionRedoRef.current=[];
    const started = audioStartRef.current;
    if (started === null) return;
    audioStrokesRef.current.push({
      pageId: target.id,
      createdAt,
      seekSec: Math.max(0, createdAt - started),
    });
  };
  const handleStrokeTapped = (target: typeof page, createdAt: number) => {
    const match = findAudioStroke(current.audioSessions ?? [], target.id, createdAt);
    if (match)
      setAudioSeek({
        seconds: match.stroke.seekSec,
        sessionCreatedAt: match.session.createdAt,
        nonce: Date.now(),
      });
  };
  const transcribeSession = async (session: AudioSession) => {
    const result = await transcribeAudio(session.uri);
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      audioSessions: n.audioSessions?.map((item) =>
        item.createdAt === session.createdAt
          ? {
              ...item,
              transcript: result.text,
              transcriptSegments: result.segments,
              transcribedAt: new Date().toISOString(),
            }
          : item,
      ),
    }));
  };
  const handleSelection = (target: typeof page, value: { count: number;x?:number;y?:number;width?:number;height?:number;moving?:boolean;moveCancelled?:boolean }) => {
    selectionInkCountRef.current=value.count;
    const hasBounds=value.x!==undefined&&value.y!==undefined&&value.width!==undefined&&value.height!==undefined;
    const previous=selectionBoundsRef.current,selected=selectedElementsRef.current;
    if(value.moveCancelled&&selectionElementMoveOriginRef.current?.pageId===target.id){const origin=selectionElementMoveOriginRef.current;update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===target.id?{...p,elements:origin.elements,updatedAt:new Date().toISOString()}:p)}));selectionElementMoveOriginRef.current=undefined;selectionWasMovingRef.current=false;if(hasBounds)selectionBoundsRef.current={pageId:target.id,x:value.x!,y:value.y!,width:value.width!,height:value.height!};setSelection({pageId:target.id,count:value.count+selected.ids.length});return}
    if(hasBounds&&value.moving&&previous?.pageId===target.id&&selected.pageId===target.id&&selected.ids.length){
      if(!selectionWasMovingRef.current)selectionElementMoveOriginRef.current={pageId:target.id,elements:(target.elements??[]).map(element=>({...element})),x:previous.x,y:previous.y};
      const dx=value.x!-previous.x,dy=value.y!-previous.y,ids=new Set(selected.ids);
      update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===target.id?{...p,elements:moveSelectedElements(p.elements??[],ids,dx,dy),updatedAt:new Date().toISOString()}:p)}));
      selectionBoundsRef.current={pageId:target.id,x:value.x!,y:value.y!,width:value.width!,height:value.height!};selectionWasMovingRef.current=true;
      setSelection({pageId:target.id,count:value.count+selected.ids.length});return;
    }
    if(hasBounds&&!value.moving&&selectionWasMovingRef.current&&previous?.pageId===target.id&&selected.pageId===target.id){const origin=selectionElementMoveOriginRef.current;if(origin)recordSelectionHistory({kind:'snapshot',pageId:target.id,before:origin.elements,after:moveSelectedElements(origin.elements,new Set(selected.ids),value.x!-origin.x,value.y!-origin.y),native:value.count>0});selectionWasMovingRef.current=false;selectionElementMoveOriginRef.current=undefined;selectionBoundsRef.current={pageId:target.id,x:value.x!,y:value.y!,width:value.width!,height:value.height!};setSelection({pageId:target.id,count:value.count+selected.ids.length});return}
    const ids=hasBounds?selectElementIds(target.elements??[],{x:value.x!,y:value.y!,width:value.width!,height:value.height!},{text:tool.lassoText??true,images:tool.lassoImages??true}):[];
    selectionBoundsRef.current=hasBounds?{pageId:target.id,x:value.x!,y:value.y!,width:value.width!,height:value.height!}:undefined;
    setSelectedElements({pageId:ids.length?target.id:"",ids});
    setSelection({ pageId: target.id, count: value.count+ids.length });
  };
  const handleSelectionText = (
    target: typeof page,
    result: {
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) => {
    if (selectionAction?.type === "flashcard") {
      const question = selectionTextToQuestion(result.text);
      if (question) {
        setFlashcardDraft(question);
        setFlashcardsOpen(true);
      }
      setSelection({ pageId: "", count: 0 });
      actOnSelection("clear");
      return;
    }
    const element: TextElement = {
      id: makeId(),
      kind: "text",
      text: result.text,
      x: Math.max(0, Math.min(0.82, result.x)),
      y: Math.max(0, Math.min(0.85, result.y)),
      width: Math.max(0.18, Math.min(0.8, result.width)),
      height: Math.max(0.08, Math.min(0.4, result.height)),
      fontSize: 20,
      color: target.template === "dark" ? DOCUMENT_LIGHT_INK : DOCUMENT_INK,
    };
    update(current.id, (n) => ({
      ...n,
      updatedAt: new Date().toISOString(),
      pages: n.pages.map((p) =>
        p.id === target.id
          ? {
              ...p,
              elements: [...(p.elements ?? []), element],
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    setElementMode(true);
    setSelection({ pageId: "", count: 0 });
    recordSelectionHistory({ kind:'element',pageId: target.id, element });
  };
  const handleSelectionClip = (
    target: typeof page,
    result: {
      uri: string;
      x: number;
      y: number;
      width: number;
      height: number;
    },
  ) => {
    if (selectionAction?.type === "imageFlashcard") {
      setFlashcardDraft("이미지 질문");
      setFlashcardDraftImage(result.uri);
      setFlashcardsOpen(true);
      setSelection({ pageId: "", count: 0 });
      actOnSelection("clear");
      return;
    }
    const element: ImageElement = {
      id: makeId(),
      kind: "image",
      uri: result.uri,
      x: Math.max(0, Math.min(0.94, result.x)),
      y: Math.max(0, Math.min(0.94, result.y)),
      width: Math.max(0.04, Math.min(1, result.width)),
      height: Math.max(0.04, Math.min(1, result.height)),
      fit: "contain",
      rotation: 0,
    };
    changeElements(target, [...(target.elements ?? []), element]);
    setElementMode(true);
    actOnSelection("clear");
  };
  const actOnSelection = (
    type:
      | "delete"
      | "recolor"
      | "text"
      | "flashcard"
      | "imageFlashcard"
      | "clip"
      | "clear"
      | "copy"
      | "cut"
      | "paste"
      | "duplicate"
      | "shrink"
      | "grow"
      | "rotate",
  ) => {
    const ids=new Set(selectedElements.ids),targetPage=current.pages.find(p=>p.id===selectedElements.pageId);
    if(type==='copy'||type==='cut'){selectedElementClipboardRef.current=(targetPage?.elements??[]).filter(element=>ids.has(element.id)).map(element=>({...element}));elementClipboardHasInkRef.current=selectionInkCountRef.current>0}
    if(type==='paste'&&selectedElementClipboardRef.current.length){const before=page.elements??[],pasted=selectedElementClipboardRef.current.map(element=>({...element,id:makeId(),x:Math.min(.94,element.x+.02),y:Math.min(.94,element.y+.02)})),after=[...before,...pasted];changeElements(page,after);recordSelectionHistory({kind:'snapshot',pageId:page.id,before,after,native:elementClipboardHasInkRef.current});setSelectedElements({pageId:page.id,ids:pasted.map(x=>x.id)});setSelection({pageId:page.id,count:pasted.length})}
    else if(targetPage&&ids.size&&(type==='delete'||type==='cut'||type==='duplicate'||type==='recolor'||type==='shrink'||type==='grow'||type==='rotate')){
      let next=targetPage.elements??[];
      if(type==='delete'||type==='cut')next=next.filter(element=>!ids.has(element.id));
      else if(type==='duplicate'){const copies=next.filter(element=>ids.has(element.id)).map(element=>({...element,id:makeId(),x:Math.min(.94,element.x+.02),y:Math.min(.94,element.y+.02)}));next=[...next,...copies];setSelectedElements({pageId:targetPage.id,ids:copies.map(x=>x.id)})}
      else next=next.map(element=>{if(!ids.has(element.id))return element;if(type==='recolor'&&element.kind==='text')return{...element,color:tool.color};if(type==='rotate'&&element.kind==='image')return{...element,rotation:(((element.rotation??0)+90)%360) as 0|90|180|270};const scale=type==='shrink'?.8:type==='grow'?1.25:1;if(scale!==1){const width=Math.max(.04,Math.min(1,element.width*scale)),height=Math.max(.04,Math.min(1,element.height*scale));return{...element,width,height,x:Math.max(0,Math.min(1-width,element.x+(element.width-width)/2)),y:Math.max(0,Math.min(1-height,element.y+(element.height-height)/2))}}return element});
      recordSelectionHistory({kind:'snapshot',pageId:targetPage.id,before:targetPage.elements??[],after:next,native:selectionInkCountRef.current>0});changeElements(targetPage,next);if(type==='delete'||type==='cut'){setSelectedElements({pageId:"",ids:[]});setSelection({pageId:"",count:0})}
    }
    if(type==='clear'){setSelectedElements({pageId:"",ids:[]});setSelection({pageId:"",count:0})}
    setSelectionAction({
      nonce: Date.now(),
      type,
      color: type === "recolor" ? tool.color : undefined,
    });
  };
  const changeUiPreferences = (value: UiPreferences) => {
    setUiPreferences(value);
    void saveUiPreferences(value);
  };
  const rebuildIndex = () => {
    if (indexStatus === "running") return;
    setIndexStatus("running");
    void rebuildSearchIndex(items)
      .then(() => setIndexStatus("success"))
      .catch(() => setIndexStatus("error"));
  };
  const toggleLeftHanded = () =>
    changeUiPreferences({ ...uiPreferences, leftHanded: !leftHanded });
  const activateLasso = () =>
    setTool((active) => ({ ...active, kind: "lasso" }));
  const performUndo = () => {
    const conversion = selectionUndoRef.current.pop();
    if (conversion) {
      if(conversion.kind==='pagePaintBatch')update(current.id,n=>{const paintByPage=new Map(conversion.before.map(entry=>[entry.pageId,entry.paint]));const updatedAt=new Date().toISOString();return{...n,updatedAt,pages:n.pages.map(p=>paintByPage.has(p.id)?{...p,...paintByPage.get(p.id),updatedAt}:p)}});
      else if(conversion.kind==='pagePaint')update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===conversion.pageId?{...p,...conversion.before,updatedAt:new Date().toISOString()}:p)}));
      else if(conversion.kind!=='native')update(current.id, (n) => ({...n,pages:n.pages.map((p)=>p.id===conversion.pageId?{...p,elements:conversion.kind==='snapshot'?conversion.before:p.elements?.filter(element=>element.id!==conversion.element.id)}:p)}));
      selectionRedoRef.current=pushBounded(selectionRedoRef.current,conversion);
      if(conversion.kind==='native'||conversion.kind==='element'||(conversion.kind==='snapshot'&&conversion.native))setUndoSignal((v)=>v+1);
      return;
    }
    setUndoSignal((v) => v + 1);
  };
  const performRedo = () => {
    const conversion = selectionRedoRef.current.pop();
    if (conversion) {
      if(conversion.kind==='pagePaintBatch')update(current.id,n=>{const paintByPage=new Map(conversion.after.map(entry=>[entry.pageId,entry.paint]));const updatedAt=new Date().toISOString();return{...n,updatedAt,pages:n.pages.map(p=>paintByPage.has(p.id)?{...p,...paintByPage.get(p.id),updatedAt}:p)}});
      else if(conversion.kind==='pagePaint')update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===conversion.pageId?{...p,...conversion.after,updatedAt:new Date().toISOString()}:p)}));
      else if(conversion.kind!=='native')update(current.id, (n) => ({...n,pages:n.pages.map((p)=>p.id===conversion.pageId?{...p,elements:conversion.kind==='snapshot'?conversion.after:[...(p.elements ?? []),conversion.element]}:p)}));
      selectionUndoRef.current=pushBounded(selectionUndoRef.current,conversion);
      if(conversion.kind==='native'||conversion.kind==='element'||(conversion.kind==='snapshot'&&conversion.native))setRedoSignal((v)=>v+1);
      return;
    }
    setRedoSignal((v) => v + 1);
  };
  const applyPagePaintToAll=(paint:PagePaintSnapshot)=>{
    const clearing=!paint.backgroundColor||!paint.backgroundOpacity;
    const changed=current.pages.filter(item=>clearing
      ? Boolean(item.backgroundColor||item.backgroundColor2||item.backgroundGradientDirection||(item.backgroundOpacity??0)>0)
      : JSON.stringify({backgroundColor:item.backgroundColor,backgroundColor2:item.backgroundColor2,backgroundGradientDirection:item.backgroundGradientDirection,backgroundOpacity:item.backgroundOpacity})!==JSON.stringify(paint));
    if(!changed.length)return;
    const before=changed.map(item=>({pageId:item.id,paint:{backgroundColor:item.backgroundColor,backgroundColor2:item.backgroundColor2,backgroundGradientDirection:item.backgroundGradientDirection,backgroundOpacity:item.backgroundOpacity}}));
    const after=changed.map(item=>({pageId:item.id,paint}));
    recordSelectionHistory({kind:'pagePaintBatch',before,after});
    update(current.id,n=>{const ids=new Set(changed.map(item=>item.id));const updatedAt=new Date().toISOString();return{...n,updatedAt,pages:n.pages.map(item=>ids.has(item.id)?{...item,...paint,updatedAt}:item)}});
  };
  const performPencilAction = (action: PencilAction) => {
    if (action === "eraser") togglePencilEraser();
    else if (action === "undo") performUndo();
    else if (action === "redo") performRedo();
    else if (action === "toolbar") showFocusToolbar();
  };
  const performSystemPencilAction = (preferredAction?: string) => {
    const resolved = resolvePencilPreferredAction(preferredAction);
    if (resolved === "eraser") togglePencilEraser();
    else if (resolved === "previous") {
      setToolState((active) => {
        const previous = previousSystemTool.current;
        previousSystemTool.current = active;
        return previous;
      });
    } else if (resolved === "toolbar") showFocusToolbar();
  };
  const handlePencilDoubleTap = (preferredAction?: string) => {
    if (uiPreferences.pencilDoubleTapAction === "system")
      performSystemPencilAction(preferredAction);
    else performPencilAction(uiPreferences.pencilDoubleTapAction);
  };
  const handlePencilSqueeze = (
    phase: "began" | "ended",
    preferredAction?: string,
  ) => {
    if (uiPreferences.pencilSqueezeAction === "system") {
      if (phase === "began") performSystemPencilAction(preferredAction);
      return;
    }
    if (uiPreferences.pencilSqueezeAction !== "temporaryEraser") {
      if (phase === "began")
        performPencilAction(uiPreferences.pencilSqueezeAction);
      return;
    }
    if (phase === "began") {
      setTool((active) => {
        if (active.kind === "eraser") return active;
        squeezeTemporaryTool.current = active;
        return { ...active, kind: "eraser", eraserMode: "vector" };
      });
    } else if (squeezeTemporaryTool.current) {
      const original = squeezeTemporaryTool.current;
      squeezeTemporaryTool.current = undefined;
      setTool((active) => (active.kind === "eraser" ? original : active));
    }
  };
  const handlePageCount = (count: number, source: typeof page) => {
    if (count <= current.pages.length) return;
    update(current.id, (n) => {const timestamp=new Date().toISOString();return({
      ...n,
      pages: Array.from(
        { length: count },
        (_, i) =>
          n.pages[i] ?? {
            ...blankPage("plain"),
            pdfUri: source.pdfUri,
            pdfName: source.pdfName,
            pdfPageIndex: i,
          },
      ),updatedAt:timestamp,pageOrderUpdatedAt:timestamp,
    })});
  };
  const transferCurrentPage = (targetId: string, mode: "copy" | "move") => {
    setItems((all) =>
      transferNotebookPage(all, current.id, page.id, targetId, mode),
    );
    if (mode === "move")
      setPageIndex(Math.max(0, Math.min(pageIndex, current.pages.length - 2)));
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
  const resizeCanvas=(columns:number,rows:number)=>update(current.id,n=>({...n,updatedAt:new Date().toISOString(),pages:n.pages.map(p=>p.id===page.id?resizePageCanvas(p,{columns,rows}):p)}));
  const reorderPages = (ids: string[]) => {
    const map = new Map(current.pages.map((p) => [p.id, p]));
    const pages = ids
      .map((id) => map.get(id))
      .filter((p): p is typeof page => Boolean(p));
    const active = pages.findIndex((p) => p.id === page.id);
    update(current.id, (n) => {const timestamp=new Date().toISOString();return({
      ...n,
      pages,
      updatedAt: timestamp,pageOrderUpdatedAt:timestamp,
    })});
    if (active >= 0) setPageIndex(active);
  };
  const duplicatePage = (id: string) => update(current.id,n=>duplicateNotebookPage(n,id));
  const rotatePageById=(id:string)=>update(current.id,n=>{const timestamp=new Date().toISOString();return{...n,updatedAt:timestamp,pages:n.pages.map(p=>p.id===id?{...p,rotation:(((p.rotation??0)+90)%360) as 0|90|180|270,updatedAt:timestamp}:p)}});
  const togglePageBookmark=(id:string)=>update(current.id,n=>{const timestamp=new Date().toISOString();return{...n,updatedAt:timestamp,pages:n.pages.map(p=>p.id===id?{...p,bookmarked:!p.bookmarked,updatedAt:timestamp}:p)}});
  const deletePageFromGrid = (id: string) => {
    if (current.pages.length === 1) return;
    const index = current.pages.findIndex((p) => p.id === id);
    update(current.id, (n) => {
      const timestamp = new Date().toISOString();
      return {
        ...n,
        pages: n.pages.filter((p) => p.id !== id),
        deletedPages: { ...(n.deletedPages ?? {}), [id]: timestamp },
        updatedAt: timestamp,
        pageOrderUpdatedAt:timestamp,
      };
    });
    if (index <= pageIndex) setPageIndex(Math.max(0, pageIndex - 1));
  };
  return (
    <SafeAreaView style={s.root}>
      {(!focusMode || focusToolbarVisible) && (
        <Toolbar
          focusMode={focusMode}
          focusOverlay={focusMode}
          onActivity={showFocusToolbar}
          tool={tool}
          setTool={setTool}
          onUndo={performUndo}
          onRedo={performRedo}
          fingerDrawingEnabled={fingerDrawingEnabled}
          onToggleFingerDrawing={() =>
            changeUiPreferences({
              ...uiPreferences,
              fingerDrawingEnabled: !fingerDrawingEnabled,
            })
          }
          zoomWindowEnabled={zoomWindowEnabled}
          onToggleZoomWindow={() => setZoomWindowEnabled((v) => !v)}
          viewMode={current.viewMode ?? "page"}
          onToggleViewMode={() =>
            update(current.id, (n) => ({
              ...n,
              viewMode:
                (n.viewMode ?? "page") === "page" ? "continuous" : "page",
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
                          kind: "text",
                          text: "텍스트를 입력하세요",
                          x: 0.18,
                          y: 0.2,
                          width: 0.42,
                          height: 0.12,
                          fontSize: 20,
                          color: page.template === "dark" ? DOCUMENT_LIGHT_INK : DOCUMENT_INK,
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
          onFocusMode={() => setFocusMode(!focusMode)}
          onSettings={() => setSettingsOpen(true)}
          onSearch={() => setDocumentSearchOpen(true)}
          onExportPdf={() => setExportOpen(true)}
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
      {!focusMode && (
        <DocumentTabs
          ids={openTabs}
          items={items}
          activeId={current.id}
          referenceId={referenceId}
          onSelect={selectTab}
          onReference={selectReference}
          onClose={closeTab}
        />
      )}
      <View
        style={[
          s.editor,
          leftHanded && s.editorLeftHanded,
          focusMode &&
            (leftHanded ? { marginLeft: -112 } : { marginRight: -112 }),
        ]}
      >
        <View style={s.canvasArea}>
          {(current.viewMode ?? "page") === "continuous" ? (
            <ContinuousDocument
              pages={current.pages}
              searchFocus={searchFocus}
              activeIndex={pageIndex}
              tool={tool}
              fingerDrawingEnabled={fingerDrawingEnabled}
              twoFingerUndoEnabled={uiPreferences.twoFingerUndoEnabled}
              threeFingerRedoEnabled={uiPreferences.threeFingerRedoEnabled}
              zoomWindowEnabled={zoomWindowEnabled}
              elementMode={elementMode}
              selectedElements={selectedElements}
              replayCutoff={replayCutoff}
              selectionAction={selectionAction}
              undoSignal={undoSignal}
              redoSignal={redoSignal}
              onActiveIndexChange={setPageIndex}
              onDrawingChange={changeDrawing}
              onCanvasMetrics={changeCanvasMetrics}
              onElementsChange={changeElements}
              onElementCommit={commitElementChange}
              onSaveSticker={saveImageSticker}
              onSelectionChange={handleSelection}
              onSelectionText={handleSelectionText}
              onSelectionClip={handleSelectionClip}
              onCircleLasso={activateLasso}
              onAddPage={addPage}
              onPageCount={handlePageCount}
              onPdfOutline={setPdfOutline}
              onPdfLink={handlePdfLink}
              onPdfExcerpt={capturePdfExcerpt}
              onNavigateSource={navigateExcerptSource}
              onPencilDoubleTap={handlePencilDoubleTap}
              onPencilSqueeze={handlePencilSqueeze}
              onEraserEnded={restorePencilTool}
              onStrokeAdded={handleStrokeAdded}
              onStrokeTapped={handleStrokeTapped}
            />
          ) : (
            <ZoomablePage
              rotation={page.rotation}
              canvasExtent={page.canvasExtent}
              fingerDrawingEnabled={fingerDrawingEnabled}
              style={[
                s.paper,
                (page.rotation === 90 || page.rotation === 270) && {
                  maxWidth: Math.max(300, (windowHeight - 190) / 1.414),
                },
              ]}
            >
              <Paper
                template={page.template}
                templateSpacing={page.templateSpacing}
                customTemplateUri={page.customTemplateUri}
                backgroundColor={page.backgroundColor}
                backgroundColor2={page.backgroundColor2}
                backgroundGradientDirection={page.backgroundGradientDirection}
                backgroundOpacity={page.backgroundOpacity}
              />
              <DocumentCanvas
                key={page.id}
                pdfUri={page.pdfUri}
                pageIndex={page.pdfPageIndex ?? pageIndex}
                drawingData={page.drawingData}
                tool={tool}
                fingerDrawingEnabled={fingerDrawingEnabled}
                twoFingerUndoEnabled={uiPreferences.twoFingerUndoEnabled}
                threeFingerRedoEnabled={uiPreferences.threeFingerRedoEnabled}
                zoomWindowEnabled={zoomWindowEnabled}
                interactionEnabled={!elementMode && replayCutoff === undefined}
                replayCutoff={replayCutoff}
                selectionAction={selectionAction}
                selectedElementCount={selectedElements.pageId===page.id?selectedElements.ids.length:0}
                undoSignal={undoSignal}
                redoSignal={redoSignal}
                onPdfOutline={setPdfOutline}
                onPdfLink={(link) => handlePdfLink(link, page)}
                onPdfExcerpt={(excerpt) => capturePdfExcerpt(page, excerpt)}
                onPencilDoubleTap={handlePencilDoubleTap}
                onPencilSqueeze={handlePencilSqueeze}
                onEraserEnded={restorePencilTool}
                onStrokeAdded={(createdAt) =>
                  handleStrokeAdded(page, createdAt)
                }
                onStrokeTapped={(createdAt) =>
                  handleStrokeTapped(page, createdAt)
                }
                onSelectionChange={(value) => handleSelection(page, value)}
                onSelectionText={(result) => handleSelectionText(page, result)}
                onSelectionClip={(result) => handleSelectionClip(page, result)}
                onCircleLasso={activateLasso}
                onPageCount={(count) => handlePageCount(count, page)}
                onDrawingChange={(drawingData) =>
                  changeDrawing(page, drawingData)
                }
                onCanvasMetrics={(metrics) => changeCanvasMetrics(page, metrics)}
              />
              <ElementsLayer
                editable={elementMode}
                elements={page.elements ?? []}
                selectedIds={selectedElements.pageId===page.id?selectedElements.ids:[]}
                onChange={(elements) => changeElements(page, elements)}
                onCommit={(before,after)=>commitElementChange(page,before,after)}
                onSaveImage={saveImageSticker}
                onNavigateSource={navigateExcerptSource}
              />
              {searchFocus?.pageId === page.id && (
                <SearchHighlight
                  words={page.ocrWords ?? []}
                  query={searchFocus.query}
                />
              )}
            </ZoomablePage>
          )}
          {referenceNote && (
            <ReferencePanel
              notebook={referenceNote}
              initialIndex={tabPages.current[referenceNote.id] ?? 0}
              onPageChange={(index) => {
                tabPages.current[referenceNote.id] = index;
              }}
              onClose={() => setReferenceId(undefined)}
            />
          )}
          <AudioPanel
            sessions={current.audioSessions ?? []}
            seekRequest={audioSeek}
            onRecordingStart={(startedAt) => {
              audioStartRef.current = startedAt;
              audioStrokesRef.current = [];
            }}
            onRecordingCancelled={() => {
              audioStartRef.current = null;
              audioStrokesRef.current = [];
            }}
            onSaved={(audio) => {
              const strokes = audioStrokesRef.current;
              update(current.id, (n) => ({
                ...n,
                audioSessions: [
                  ...(n.audioSessions ?? []),
                  { ...audio, strokes },
                ],
                updatedAt: new Date().toISOString(),
              }));
              audioStartRef.current = null;
              audioStrokesRef.current = [];
            }}
            onReplayCutoffChange={setReplayCutoff}
            onTranscribe={transcribeSession}
            leftHanded={leftHanded}
          />
          {pendingExcerpt && (
            <View
              style={[
                s.excerptTray,
                {
                  width: Math.max(
                    140,
                    Math.min(360, windowWidth - (focusMode ? 48 : 160)),
                  ),
                },
                leftHanded && s.excerptTrayLeft,
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.excerptLabel}>
                  PDF 발췌 · {pendingExcerpt.source.pageIndex + 1}쪽
                </Text>
                <Text numberOfLines={2} style={s.excerptText}>
                  {pendingExcerpt.text}
                </Text>
              </View>
              <Pressable
                accessibilityLabel="현재 페이지에 발췌 붙여넣기"
                onPress={pastePdfExcerpt}
                style={s.excerptPaste}
              >
                <Ionicons
                  name="return-down-forward"
                  size={17}
                  color={C.white}
                />
                <Text style={s.excerptPasteText}>붙이기</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="발췌 취소"
                onPress={() => setPendingExcerpt(undefined)}
                style={s.excerptClose}
              >
                <Ionicons name="close" size={18} color={C.muted} />
              </Pressable>
            </View>
          )}
          {tool.kind === "lasso" && Platform.OS === "ios" && (
            <Pressable
              accessibilityLabel="원본 필기 붙여넣기"
              onPress={() => actOnSelection("paste")}
              style={[s.lassoPaste, leftHanded && s.lassoPasteLeft]}
            >
              <Ionicons name="clipboard" size={18} color={C.accent} />
              <Text style={s.lassoPasteText}>붙여넣기</Text>
            </Pressable>
          )}
          <SelectionBar
            count={selection.pageId === page.id ? selection.count : 0}
            color={tool.color}
            availableWidth={windowWidth - (focusMode ? 48 : 160)}
            onRecolor={() => actOnSelection("recolor")}
            onCopy={() => actOnSelection("copy")}
            onClip={() => actOnSelection("clip")}
            onImageFlashcard={() => actOnSelection("imageFlashcard")}
            onCut={() => actOnSelection("cut")}
            onDuplicate={() => actOnSelection("duplicate")}
            onShrink={() => actOnSelection("shrink")}
            onGrow={() => actOnSelection("grow")}
            onRotate={() => actOnSelection("rotate")}
            onText={() => actOnSelection("text")}
            onFlashcard={() => actOnSelection("flashcard")}
            onDelete={() => actOnSelection("delete")}
            onClose={() => actOnSelection("clear")}
          />
        </View>
        <View style={[s.rail, leftHanded && s.railLeft]}>
          <Text style={s.railTitle}>페이지</Text>
          {(canvasExtent.columns>1||canvasExtent.rows>1)&&<Text style={s.railTitle}>{canvasExtent.columns}×{canvasExtent.rows} 보드</Text>}
          <View style={s.railActions}>
            <Pressable
              accessibilityLabel={`페이지 직접 이동, 현재 ${pageIndex + 1} / ${current.pages.length}`}
              onPress={() => setPageJumpOpen(true)}
              style={s.railAction}
            >
              <Ionicons name="reader-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel={
                leftHanded ? "오른손 모드로 전환" : "왼손 모드로 전환"
              }
              accessibilityState={{ selected: leftHanded }}
              onPress={toggleLeftHanded}
              style={[s.railAction, leftHanded && s.templateActive]}
            >
              <Ionicons
                name="hand-left-outline"
                size={16}
                color={leftHanded ? C.white : C.accent}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 색상 채우기"
              accessibilityState={{
                selected: (page.backgroundOpacity ?? 0) > 0,
              }}
              onPress={() => setPagePaintOpen(true)}
              style={[
                s.railAction,
                (page.backgroundOpacity ?? 0) > 0 && s.templateActive,
              ]}
            >
              <Ionicons
                name="color-fill-outline"
                size={16}
                color={(page.backgroundOpacity ?? 0) > 0 ? C.white : C.accent}
              />
            </Pressable>
            <Pressable accessibilityLabel={`캔버스 오른쪽 확장, 현재 ${canvasExtent.columns}칸`} disabled={Boolean(page.pdfUri)||canvasExtent.columns>=4} onPress={()=>resizeCanvas(canvasExtent.columns+1,canvasExtent.rows)} style={s.railAction}><Ionicons name="arrow-forward-circle-outline" size={16} color={page.pdfUri||canvasExtent.columns>=4?C.line:C.accent}/></Pressable>
            <Pressable accessibilityLabel={`캔버스 아래쪽 확장, 현재 ${canvasExtent.rows}칸`} disabled={Boolean(page.pdfUri)||canvasExtent.rows>=4} onPress={()=>resizeCanvas(canvasExtent.columns,canvasExtent.rows+1)} style={s.railAction}><Ionicons name="arrow-down-circle-outline" size={16} color={page.pdfUri||canvasExtent.rows>=4?C.line:C.accent}/></Pressable>
            <Pressable
              accessibilityLabel="PNG 내보내기"
              onPress={() => exportPagePng(current, page, pageIndex)}
              style={s.railAction}
            >
              <Ionicons name="image-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 복제"
              onPress={() => duplicatePage(page.id)}
              style={s.railAction}
            >
              <Ionicons name="copy-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="다른 노트로 복사 또는 이동"
              onPress={() => setPageTransferOpen(true)}
              style={s.railAction}
            >
              <Ionicons name="git-compare-outline" size={16} color={C.accent} />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 삭제"
              disabled={current.pages.length === 1}
              onPress={() => {
                update(current.id, (n) => {
                  const timestamp = new Date().toISOString();
                  return {
                    ...n,
                    pages: n.pages.filter((p) => p.id !== page.id),
                    deletedPages: {
                      ...(n.deletedPages ?? {}),
                      [page.id]: timestamp,
                    },
                    updatedAt: timestamp,
                    pageOrderUpdatedAt:timestamp,
                  };
                });
                setPageIndex(Math.max(0, pageIndex - 1));
              }}
              style={s.railAction}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color={current.pages.length === 1 ? C.line : C.danger}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 위로 이동"
              disabled={pageIndex === 0}
              onPress={() => movePage(-1)}
              style={s.railAction}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={pageIndex === 0 ? C.line : C.accent}
              />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 아래로 이동"
              disabled={pageIndex === current.pages.length - 1}
              onPress={() => movePage(1)}
              style={s.railAction}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={
                  pageIndex === current.pages.length - 1 ? C.line : C.accent
                }
              />
            </Pressable>
            <Pressable
              accessibilityLabel="페이지 북마크"
              onPress={() => togglePageBookmark(page.id)}
              style={[s.railAction, page.bookmarked && s.templateActive]}
            >
              <Ionicons
                name={page.bookmarked ? "bookmark" : "bookmark-outline"}
                size={16}
                color={page.bookmarked ? C.white : C.accent}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={
                page.customTemplateUri
                  ? "커스텀 템플릿 변경 또는 제거"
                  : "이미지 또는 단일 페이지 PDF 템플릿 가져오기"
              }
              onPress={manageCustomTemplate}
              style={[s.railAction, page.customTemplateUri && s.templateActive]}
            >
              <Ionicons
                name="layers-outline"
                size={16}
                color={page.customTemplateUri ? C.white : C.accent}
              />
            </Pressable>
          </View>
          <View style={s.templatePicker}>
            {(
              [
                "plain",
                "line",
                "grid",
                "dot",
                "cornell",
                "planner",
                "flashcard",
                "dark",
              ] as const
            ).map((t) => (
              <Pressable
                key={t}
                accessibilityLabel={`${t} 템플릿`}
                onPress={() => {
                  update(current.id, (n) => ({
                    ...n,
                    pages: n.pages.map((p) =>
                      p.id === page.id
                        ? { ...p, template: t, customTemplateUri: undefined }
                        : p,
                    ),
                  }));
                }}
                style={[
                  s.templateDot,
                  !page.customTemplateUri &&
                    page.template === t &&
                    s.templateActive,
                ]}
              >
                <Text
                  style={{
                    fontSize: 8,
                    color:
                      !page.customTemplateUri && page.template === t
                        ? C.white
                        : C.muted,
                  }}
                >
                  {
                    (
                      {
                        plain: "P",
                        line: "L",
                        grid: "G",
                        dot: "D",
                        cornell: "C",
                        planner: "W",
                        flashcard: "Q/A",
                        dark: "N",
                      } as const
                    )[t]
                  }
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={s.templatePicker}>
            {templateSpacings.map((spacing) => (
              <Pressable
                key={spacing.value}
                accessibilityLabel={`현재 페이지 템플릿 간격 ${spacing.label}`}
                accessibilityState={{
                  selected:
                    (page.templateSpacing ?? "medium") === spacing.value,
                }}
                onPress={() =>
                  update(current.id, (n) => ({
                    ...n,
                    pages: n.pages.map((p) =>
                      p.id === page.id
                        ? {
                            ...p,
                            templateSpacing: spacing.value,
                            updatedAt: new Date().toISOString(),
                          }
                        : p,
                    ),
                    updatedAt: new Date().toISOString(),
                  }))
                }
                style={[
                  s.templateDot,
                  (page.templateSpacing ?? "medium") === spacing.value &&
                    s.templateActive,
                ]}
              >
                <Text
                  style={{
                    fontSize: 8,
                    color:
                      (page.templateSpacing ?? "medium") === spacing.value
                        ? C.white
                        : C.muted,
                  }}
                >
                  {spacing.label.slice(0, 1)}
                </Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={s.railList}>
            {current.pages.map((p, i) => (
              <Pressable
                key={p.id}
                accessibilityLabel={`페이지 ${i + 1}${p.bookmarked ? ", 북마크됨" : ""}${p.rotation ? `, ${p.rotation}도 회전` : ""}`}
                accessibilityHint="두 번 탭하여 이 페이지로 이동"
                accessibilityState={{ selected: i === pageIndex }}
                onPress={() => navigatePage(i)}
                style={[s.thumb, i === pageIndex && s.thumbActive]}
              >
                <View style={s.thumbLines} />
                {p.bookmarked && (
                  <Ionicons
                    name="bookmark"
                    size={12}
                    color={C.accent}
                    style={s.thumbBookmark}
                  />
                )}
                <Text style={s.pageNo}>{i + 1}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
      {focusMode && !focusToolbarVisible && (
        <Pressable
          accessibilityLabel="집중 모드 도구 열기"
          onPress={showFocusToolbar}
          style={{
            position: "absolute",
            right: leftHanded ? undefined : 20,
            left: leftHanded ? 20 : undefined,
            top: 18,
            zIndex: 30,
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(34,93,80,.82)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="chevron-down" size={22} color={C.white} />
        </Pressable>
      )}
      <FlashcardPanel
        visible={flashcardsOpen}
        initialQuestion={flashcardDraft}
        initialQuestionImageUri={flashcardDraftImage}
        cards={current.flashcards ?? []}
        onCreatePageCard={Platform.OS==='ios'?async()=>{try{const assets=await createPageFlashcardAssets(page,pageIndex);const card=createPageFlashcard(assets.questionUri,assets.answerUri);update(current.id,n=>({...n,flashcards:[...(n.flashcards??[]),card],updatedAt:new Date().toISOString()}))}catch(error){Alert.alert('페이지 카드 생성 실패',error instanceof Error?error.message:'페이지 이미지를 만들 수 없습니다.')}}:undefined}
        onClose={() => { setFlashcardsOpen(false); setFlashcardDraft(undefined); setFlashcardDraftImage(undefined); }}
        onChange={(flashcards) =>
          update(current.id, (n) => ({
            ...n,
            flashcards,
            updatedAt: new Date().toISOString(),
          }))
        }
      />
      <PdfOutlinePanel
        visible={outlineOpen}
        items={pdfOutline}
        onClose={() => setOutlineOpen(false)}
        onSelect={(pdfPageIndex) => {
          const target = resolvePdfPageIndex(current.pages, page, pdfPageIndex);
          if (target !== undefined) navigatePage(target);
        }}
      />
      <PageJumpPanel
        visible={pageJumpOpen}
        currentIndex={pageIndex}
        pageCount={current.pages.length}
        pdfPageIndex={page.pdfPageIndex}
        onSelect={navigatePage}
        onClose={() => setPageJumpOpen(false)}
      />
      <PageTransferPanel
        visible={pageTransferOpen}
        sourceId={current.id}
        notebooks={items}
        onClose={() => setPageTransferOpen(false)}
        onTransfer={transferCurrentPage}
      />
      <PageGridPanel
        visible={pageGridOpen}
        pages={current.pages}
        activeIndex={pageIndex}
        onClose={() => setPageGridOpen(false)}
        onSelect={navigatePage}
        onReorder={reorderPages}
        onDuplicate={duplicatePage}
        onDelete={deletePageFromGrid}
        onBookmark={togglePageBookmark}
        onRotate={rotatePageById}
        onTransfer={(id) => {
          const index = current.pages.findIndex((p) => p.id === id);
          if (index >= 0) navigatePage(index);
          setPageGridOpen(false);
          setTimeout(() => setPageTransferOpen(true), 0);
        }}
      />
      <StickerPanel
        visible={stickerOpen}
        stickers={stickers}
        onClose={() => setStickerOpen(false)}
        onInsert={insertSticker}
        onImport={() => void importSticker()}
        onDelete={(id) =>
          updateStickers(stickers.filter((item) => item.id !== id))
        }
      />
      <SettingsPanel
        visible={settingsOpen}
        value={uiPreferences}
        indexStatus={indexStatus}
        onRebuildIndex={rebuildIndex}
        onChange={changeUiPreferences}
        onClose={() => setSettingsOpen(false)}
      />
      <DocumentSearchPanel
        visible={documentSearchOpen}
        notebook={current}
        activePageIndex={pageIndex}
        onSelect={navigateDocumentSearch}
        onClose={() => setDocumentSearchOpen(false)}
      />
      <PagePaintPanel
        visible={pagePaintOpen}
        color={page.backgroundColor}
        color2={page.backgroundColor2}
        gradientDirection={page.backgroundGradientDirection}
        opacity={page.backgroundOpacity ?? 0}
        onChange={(backgroundColor, backgroundOpacity, backgroundColor2, backgroundGradientDirection) => {
          const before:PagePaintSnapshot={backgroundColor:page.backgroundColor,backgroundColor2:page.backgroundColor2,backgroundGradientDirection:page.backgroundGradientDirection,backgroundOpacity:page.backgroundOpacity};
          const after:PagePaintSnapshot={backgroundColor,backgroundColor2,backgroundGradientDirection,backgroundOpacity};
          if(JSON.stringify(before)===JSON.stringify(after))return;
          recordSelectionHistory({kind:'pagePaint',pageId:page.id,before,after});
          update(current.id, (n) => ({
            ...n,
            updatedAt: new Date().toISOString(),
            pages: n.pages.map((item) =>
              item.id === page.id
                ? {
                    ...item,
                    backgroundColor,
                    backgroundColor2,
                    backgroundGradientDirection,
                    backgroundOpacity,
                    updatedAt: new Date().toISOString(),
                  }
                : item,
            ),
          }));
        }}
        onApplyAll={() => applyPagePaintToAll({backgroundColor:page.backgroundColor,backgroundColor2:page.backgroundColor2,backgroundGradientDirection:page.backgroundGradientDirection,backgroundOpacity:page.backgroundOpacity})}
        onClearAll={() => applyPagePaintToAll({backgroundColor:undefined,backgroundColor2:undefined,backgroundGradientDirection:undefined,backgroundOpacity:0})}
        onClose={() => setPagePaintOpen(false)}
      />
      <ExportPanel
        visible={exportOpen}
        onClose={() => setExportOpen(false)}
        onPdf={() => exportNotebookPdf(current)}
        onPng={() => exportPagePng(current, page, pageIndex)}
        onHanji={() => exportNotebookArchive(current)}
      />
      <Pressable
        accessibilityLabel="전체 페이지 관리"
        onPress={() => setPageGridOpen(true)}
        style={[s.pageGrid, leftHanded && s.pageGridLeft]}
      >
        <Ionicons name="grid-outline" size={19} color={C.white} />
      </Pressable>
      <Pressable
        accessibilityLabel="페이지 시계 방향 90도 회전"
        onPress={rotatePage}
        style={[s.rotatePage, leftHanded && s.rotatePageLeft]}
      >
        <Ionicons name="refresh-outline" size={19} color={C.white} />
      </Pressable>
    </SafeAreaView>
  );
}

function Library({
  items,
  categories,
  query,
  searchHits,
  backupRetention,
  librarySort,
  libraryView,
  saveStatus,
  saveError,
  onRetrySave,
  backupStatus,
  backupError,
  backupFailureStage,
  lastBackupAt,
  onRetryBackup,
  onLibraryDisplayChange,
  setQuery,
  onOpen,
  onUpdate,
  onToggleNotebookLock,
  onCloudRestore,
  onCreate,
  onImport,
  onExport,
  onRestore,
  onDelete,
  onDeleteMany,
  onAddCategory,
  onRenameCategory,
  onDeleteCategory,
  onMoveCategory,
}: {
  items: Notebook[];
  categories: string[];
  query: string;
  searchHits: SearchHit[] | null;
  backupRetention: number;
  librarySort: LibrarySort;
  libraryView: LibraryViewMode;
  saveStatus: "saved" | "saving" | "error";
  saveError: string;
  onRetrySave: () => void;
  backupStatus: "waiting" | "backing" | "success" | "error";
  backupError: string;
  backupFailureStage: "local" | "cloud";
  lastBackupAt?: number;
  onRetryBackup: () => void;
  onLibraryDisplayChange: (
    patch: Partial<Pick<UiPreferences, "librarySort" | "libraryView">>,
  ) => void;
  setQuery: (x: string) => void;
  onOpen: (
    id: string,
    pageIndex?: number,
    searchQuery?: string,
  ) => void | Promise<void>;
  onUpdate: (n: Notebook) => void;
  onToggleNotebookLock: (n: Notebook) => Promise<boolean>;
  onCloudRestore: (items: Notebook[]) => void;
  onCreate: (folder?: string) => void;
  onImport: (folder?: string) => void;
  onExport: () => void;
  onRestore: () => void;
  onDelete: (id: string) => void;
  onDeleteMany: (ids: string[], onDeleted: () => void) => void;
  onAddCategory: (name: string) => void;
  onRenameCategory: (folder: string, name: string) => boolean;
  onDeleteCategory: (folder: string) => void;
  onMoveCategory: (id: string, category: string) => void;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [selected, setSelected] = useState("전체");
  const [draft, setDraft] = useState("");
  const [cloudOpen, setCloudOpen] = useState(false);
  const [managing, setManaging] = useState<Notebook | null>(null);
  const [managingFolder, setManagingFolder] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [moveSelectionOpen, setMoveSelectionOpen] = useState(false);
  const tags = useMemo(() => libraryTags(items), [items]);
  const selectedTag = libraryTagFromSelection(selected);
  const hitMap = useMemo(
    () => new Map(searchHits?.map((hit) => [hit.notebookId, hit]) ?? []),
    [searchHits],
  );
  const filtered = useMemo(
    () =>
      sortNotebooks(
        items.filter(
          (x) =>
            (selected === "전체" ||
              (selected === "즐겨찾기" && x.favorite) ||
              (selected === "최근 문서" && x.lastOpenedAt) ||
              (selectedTag !== undefined && x.tags.some((tag) => tag.trim() === selectedTag)) ||
              folderContains(selected, x.folder)) &&
            librarySearchMatches(
              x,
              query,
              searchHits ? hitMap.has(x.id) : false,
            ),
        ),
        librarySort,
        selected === "최근 문서",
      ),
    [items, query, selected, selectedTag, searchHits, hitMap, librarySort],
  );
  const addCategory = () => {
    const name = draft.trim();
    if (!name) return;
    const parent = ["전체", "즐겨찾기", "최근 문서"].includes(selected) || selectedTag !== undefined
      ? ""
      : selected;
    onAddCategory(childFolder(parent, name));
    setDraft("");
  };
  const createHere = () =>
    onCreate(categories.includes(selected) ? selected : undefined);
  const manage = (n: Notebook) => setManaging(n);
  const toggleSelection = (id: string) =>
    setSelectedIds((current) => toggleNotebookSelection(current, id));
  const beginSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  };
  const closeSelectionMode = () => {
    setMoveSelectionOpen(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };
  const setSelectedFavorite = (favorite: boolean) => {
    const updatedAt = new Date().toISOString();
    setNotebookSelectionFavorite(items, selectedIds, favorite, updatedAt)
      .filter((note, index) => note !== items[index])
      .forEach(onUpdate);
    closeSelectionMode();
  };
  const chips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 7 }}
    >
      {["전체", "즐겨찾기", "최근 문서", ...tags.map(libraryTagSelectionKey), ...categories].map((category) => (
        <Pressable
          key={category}
          onPress={() => setSelected(category)}
          onLongPress={() =>
            categories.includes(category) && setManagingFolder(category)
          }
          delayLongPress={450}
          accessibilityLabel={
            libraryTagFromSelection(category) !== undefined
              ? `태그 ${libraryTagFromSelection(category)}`
              : categories.includes(category)
              ? `${folderBreadcrumb(category)} 폴더, 길게 눌러 관리`
              : category
          }
          style={[
            s.categoryChip,
            selected === category && s.categoryChipActive,
          ]}
        >
          <Text
            style={[
              s.categoryChipText,
              selected === category && { color: C.white },
            ]}
          >
            {libraryTagFromSelection(category) !== undefined
              ? `#${libraryTagFromSelection(category)}`
              : categories.includes(category)
              ? folderBreadcrumb(category)
              : category}
          </Text>
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
              <Text style={s.brandText}>yoojin note</Text>
            </View>
            <ScrollView
              style={s.sidebarNavigation}
              contentContainerStyle={s.sidebarNavigationContent}
              showsVerticalScrollIndicator={false}
            >
            <Text style={s.section}>라이브러리</Text>
            {(
              [
                { key: "전체", label: "모든 노트", icon: "documents-outline" },
                { key: "즐겨찾기", label: "즐겨찾기", icon: "star-outline" },
                { key: "최근 문서", label: "최근 문서", icon: "time-outline" },
              ] as const
            ).map((item) => (
              <Pressable
                key={item.key}
                onPress={() => setSelected(item.key)}
                style={[s.sideItem, selected === item.key && s.sideActive]}
              >
                <Ionicons
                  name={item.icon}
                  size={19}
                  color={selected === item.key ? C.accent : C.muted}
                />
                <Text
                  style={selected === item.key ? s.sideActiveText : s.sideText}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
            <Text style={s.section}>폴더</Text>
            {categories.map((category) => (
              <Pressable
                accessibilityLabel={`${folderBreadcrumb(category)} 폴더, 길게 눌러 관리`}
                key={category}
                onPress={() => setSelected(category)}
                onLongPress={() => setManagingFolder(category)}
                delayLongPress={450}
                style={[
                  s.sideItem,
                  { paddingLeft: 11 + folderDepth(category) * 16 },
                  selected === category && s.sideActive,
                ]}
              >
                <Ionicons
                  name={
                    selected === category
                      ? "folder-open-outline"
                      : "folder-outline"
                  }
                  size={18}
                  color={selected === category ? C.accent : C.muted}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    { flex: 1 },
                    selected === category ? s.sideActiveText : s.sideText,
                  ]}
                >
                  {folderLabel(category)}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted }}>
                  {
                    items.filter((n) => folderContains(category, n.folder))
                      .length
                  }
                </Text>
              </Pressable>
            ))}
            <View style={s.categoryInput}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                onSubmitEditing={addCategory}
                placeholder={
                  categories.includes(selected)
                    ? `${folderLabel(selected)} 아래에 추가`
                    : "폴더 추가"
                }
                style={{ flex: 1, fontSize: 12, color: C.ink }}
              />
              <Pressable accessibilityLabel="폴더 추가" onPress={addCategory}>
                <Ionicons name="add-circle" size={22} color={C.accent} />
              </Pressable>
            </View>
            {!!tags.length && <>
              <Text style={s.section}>태그</Text>
              <View style={s.tagNavContent}>
                {tags.map((tag) => {
                  const key = libraryTagSelectionKey(tag);
                  const count = items.filter((note) => note.tags.some((value) => value.trim() === tag)).length;
                  return <Pressable
                    accessibilityLabel={`태그 ${tag}, 노트 ${count}권`}
                    accessibilityState={{ selected: selected === key }}
                    key={tag}
                    onPress={() => setSelected(key)}
                    style={[s.sideItem, selected === key && s.sideActive]}
                  >
                    <Ionicons name="pricetag-outline" size={17} color={selected === key ? C.accent : C.muted}/>
                    <Text numberOfLines={1} style={[{ flex: 1 }, selected === key ? s.sideActiveText : s.sideText]}>#{tag}</Text>
                    <Text style={s.sideCount}>{count}</Text>
                  </Pressable>;
                })}
              </View>
            </>}
            </ScrollView>
            <Pressable
              accessibilityRole={saveStatus === "error" ? "button" : undefined}
              accessibilityLabel={
                saveStatus === "error"
                  ? `로컬 저장 실패. 다시 저장. ${saveError}`
                  : saveStatus === "saving"
                    ? "로컬 저장 중"
                    : "로컬 저장 완료"
              }
              disabled={saveStatus !== "error"}
              onPress={onRetrySave}
              style={s.sync}
            >
              {saveStatus === "saving" ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <View
                  style={[
                    s.syncDot,
                    saveStatus === "error" && s.syncDotError,
                  ]}
                />
              )}
              <View>
                <Text style={[s.syncTitle, saveStatus === "error" && s.syncTitleError]}>
                  {saveStatus === "saving"
                    ? "로컬 저장 중…"
                    : saveStatus === "error"
                      ? "저장 실패 · 다시 시도"
                      : "로컬 저장 완료"}
                </Text>
                <Text numberOfLines={1} style={s.syncSub}>
                  {saveStatus === "error" ? saveError : `빌드 ${buildIdentity}`}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole={backupStatus === "error" ? "button" : undefined}
              accessibilityLabel={
                backupStatus === "error"
                  ? `${backupFailureStage === "cloud" ? "Cloud" : "자동"} 백업 실패. 다시 시도. ${backupError}`
                  : backupStatus === "backing"
                    ? "자동 백업 중"
                    : backupStatus === "waiting"
                      ? "자동 백업 예약됨"
                      : "자동 백업 완료"
              }
              disabled={backupStatus !== "error"}
              onPress={onRetryBackup}
              style={s.sync}
            >
              {backupStatus === "backing" ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <Ionicons
                  name={backupStatus === "error" ? "cloud-offline-outline" : "shield-checkmark-outline"}
                  size={17}
                  color={backupStatus === "error" ? C.danger : C.accent}
                />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[s.syncTitle, backupStatus === "error" && s.syncTitleError]}>
                  {backupStatus === "backing"
                    ? "자동 백업 중…"
                    : backupStatus === "waiting"
                      ? "자동 백업 대기"
                      : backupStatus === "error"
                        ? `${backupFailureStage === "cloud" ? "Cloud" : "자동"} 백업 실패 · 재시도`
                        : "자동 백업 완료"}
                </Text>
                <Text numberOfLines={1} style={s.syncSub}>
                  {backupStatus === "error"
                    ? backupError
                    : lastBackupAt
                      ? new Date(lastBackupAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
                      : "편집 후 15초에 실행"}
                </Text>
              </View>
            </Pressable>
          </View>
        )}
        <View style={s.main}>
          <View style={[s.libraryTop, compact && s.libraryTopCompact]}>
            <View>
              <Text style={s.eyebrow}>나의 공간</Text>
              <Text style={s.heading}>
                {selected === "전체"
                  ? "모든 노트"
                  : selectedTag !== undefined
                    ? `#${selectedTag}`
                  : categories.includes(selected)
                    ? folderBreadcrumb(selected)
                    : selected}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={compact ? { width: "100%" } : undefined}
              contentContainerStyle={s.libraryActions}
            >
              <Pressable
                accessibilityLabel={selectionMode ? "노트 선택 모드 종료" : "노트 여러 개 선택"}
                accessibilityState={{ selected: selectionMode }}
                onPress={() => selectionMode ? closeSelectionMode() : setSelectionMode(true)}
                style={[s.newButton, s.secondaryButton, selectionMode && s.selectionModeButton]}
              >
                <Ionicons name={selectionMode ? "close" : "checkmark-circle-outline"} size={20} color={selectionMode ? C.white : C.accent} />
                <Text style={[s.newText, { color: selectionMode ? C.white : C.accent }]}>{selectionMode ? "완료" : "선택"}</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Cloudflare 백업 설정"
                onPress={() => setCloudOpen(true)}
                style={[s.newButton, s.secondaryButton]}
              >
                <Ionicons name="cloud-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>Cloudflare</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="전체 백업 복원"
                onPress={onRestore}
                style={[s.newButton, s.secondaryButton]}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={C.accent}
                />
                <Text style={[s.newText, { color: C.accent }]}>복원</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="전체 라이브러리 백업"
                onPress={onExport}
                style={[s.newButton, s.secondaryButton]}
              >
                <Ionicons name="download-outline" size={20} color={C.accent} />
                <Text style={[s.newText, { color: C.accent }]}>전체 백업</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="파일 앱에서 PDF 가져오기"
                onPress={() => onImport(categories.includes(selected) ? selected : undefined)}
                style={[s.newButton, s.secondaryButton]}
              >
                <Ionicons
                  name="document-attach-outline"
                  size={20}
                  color={C.accent}
                />
                <Text style={[s.newText, { color: C.accent }]}>PDF 가져오기</Text>
              </Pressable>
              <Pressable accessibilityLabel="새 노트 만들기" onPress={createHere} style={s.newButton}>
                <Ionicons name="add" size={22} color="white" />
                <Text style={s.newText}>새 노트</Text>
              </Pressable>
            </ScrollView>
          </View>
          {compact && <View style={{ marginTop: 18 }}>{chips}</View>}
          {selectionMode && (
            <View accessibilityRole="toolbar" accessibilityLabel={`노트 선택 도구, ${selectedIds.size}권 선택됨`} style={s.bulkBar}>
              <Text style={s.bulkCount}>{selectedIds.size}권 선택</Text>
              <Pressable accessibilityLabel="선택한 노트 모두 즐겨찾기" disabled={!selectedIds.size} onPress={() => setSelectedFavorite(true)} style={[s.bulkAction, !selectedIds.size && s.bulkDisabled]}><Ionicons name="star" size={16} color={C.accent}/><Text style={s.bulkActionText}>즐겨찾기</Text></Pressable>
              <Pressable accessibilityLabel="선택한 노트 모두 즐겨찾기 해제" disabled={!selectedIds.size} onPress={() => setSelectedFavorite(false)} style={[s.bulkAction, !selectedIds.size && s.bulkDisabled]}><Ionicons name="star-outline" size={16} color={C.accent}/><Text style={s.bulkActionText}>해제</Text></Pressable>
              <Pressable accessibilityLabel={`선택한 노트 ${selectedIds.size}권 폴더 이동`} disabled={!selectedIds.size} onPress={() => setMoveSelectionOpen(true)} style={[s.bulkAction, !selectedIds.size && s.bulkDisabled]}><Ionicons name="folder-open-outline" size={16} color={C.accent}/><Text style={s.bulkActionText}>이동</Text></Pressable>
              <Pressable accessibilityLabel={`선택한 노트 ${selectedIds.size}권 삭제`} disabled={!selectedIds.size} onPress={() => onDeleteMany([...selectedIds], closeSelectionMode)} style={[s.bulkDelete, !selectedIds.size && s.bulkDisabled]}><Ionicons name="trash-outline" size={16} color={C.danger}/><Text style={s.bulkDeleteText}>삭제</Text></Pressable>
            </View>
          )}
          <View style={s.libraryControls}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.sortOptions}
            >
              {(
                [
                  { value: "updated", label: "최근 수정" },
                  { value: "title", label: "이름" },
                  { value: "created", label: "생성일" },
                  { value: "pages", label: "페이지 수" },
                ] as const
              ).map((option) => (
                <Pressable
                  key={option.value}
                  accessibilityLabel={`${option.label} 순 정렬`}
                  accessibilityState={{
                    selected: librarySort === option.value,
                  }}
                  onPress={() =>
                    onLibraryDisplayChange({ librarySort: option.value })
                  }
                  style={[
                    s.sortButton,
                    librarySort === option.value && s.sortActive,
                  ]}
                >
                  <Text
                    style={[
                      s.sortText,
                      librarySort === option.value && s.sortTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={s.viewToggle}>
              <Pressable
                accessibilityLabel="카드 보기"
                accessibilityState={{ selected: libraryView === "grid" }}
                onPress={() => onLibraryDisplayChange({ libraryView: "grid" })}
                style={[s.viewButton, libraryView === "grid" && s.sortActive]}
              >
                <Ionicons
                  name="grid-outline"
                  size={17}
                  color={libraryView === "grid" ? C.white : C.muted}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="목록 보기"
                accessibilityState={{ selected: libraryView === "list" }}
                onPress={() => onLibraryDisplayChange({ libraryView: "list" })}
                style={[s.viewButton, libraryView === "list" && s.sortActive]}
              >
                <Ionicons
                  name="list-outline"
                  size={18}
                  color={libraryView === "list" ? C.white : C.muted}
                />
              </Pressable>
            </View>
          </View>
          <View style={s.search}>
            <Ionicons name="search" size={20} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="제목·태그·손글씨 검색"
              placeholderTextColor="#99958C"
              style={s.searchInput}
            />
          </View>
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={34}
                  color={C.accent}
                />
              </View>
              <Text style={s.emptyTitle}>
                {query ? "검색 결과가 없어요" : "이 폴더에 노트가 없어요"}
              </Text>
              <Text style={s.emptyBody}>
                {query ? "검색어를 바꾸거나 다른 폴더를 선택하세요." : "새 노트를 만들거나 PDF를 바로 가져오세요."}
              </Text>
              {!query && (
                <View style={s.emptyActions}>
                  <Pressable accessibilityLabel="빈 노트 만들기" onPress={createHere} style={s.newButton}>
                    <Ionicons name="add" size={20} color={C.white} />
                    <Text style={s.newText}>빈 노트</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel="파일 앱에서 PDF 찾아 가져오기"
                    onPress={() => onImport(categories.includes(selected) ? selected : undefined)}
                    style={[s.newButton, s.secondaryButton]}
                  >
                    <Ionicons name="folder-open-outline" size={19} color={C.accent} />
                    <Text style={[s.newText, { color: C.accent }]}>PDF 찾아보기</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={libraryView === "grid" ? s.grid : s.list}
            >
              {filtered.map((n) => {
                const hit = mayRevealNotebookSnippet(n)
                  ? hitMap.get(n.id)
                  : undefined;
                if (libraryView === "list")
                  return (
                    <Pressable
                      key={n.id}
                      accessibilityLabel={`${n.title}, ${n.pages.length}페이지${n.locked ? ", 잠김" : ""}${n.conflictOf ? ", 페이지 충돌 사본" : ""}`}
                      accessibilityState={{ selected: selectionMode && selectedIds.has(n.id) }}
                      onPress={() =>
                        selectionMode ? toggleSelection(n.id) : onOpen(n.id, hit?.pageIndex, hit ? query : undefined)
                      }
                      onLongPress={() => selectionMode ? toggleSelection(n.id) : beginSelection(n.id)}
                      style={[s.listRow, selectionMode && selectedIds.has(n.id) && s.selectionSelected]}
                    >
                      {selectionMode && <Ionicons name={selectedIds.has(n.id) ? "checkmark-circle" : "ellipse-outline"} size={22} color={selectedIds.has(n.id) ? C.accent : C.line}/>}
                      <View style={s.listIcon}>
                        <Ionicons
                          name={
                            n.locked ? "lock-closed" : "document-text-outline"
                          }
                          size={21}
                          color={C.accent}
                        />
                      </View>
                      <View style={s.listBody}>
                        <View style={s.listTitleRow}>
                          <Text numberOfLines={1} style={s.listTitle}>
                            {n.title}
                          </Text>
                          {n.favorite && (
                            <Ionicons name="star" size={14} color="#B77A18" />
                          )}
                          {n.conflictOf && <View style={s.conflictBadge}><Text style={s.conflictBadgeText}>충돌 사본</Text></View>}
                        </View>
                        <Text numberOfLines={1} style={s.listMeta}>
                          {folderBreadcrumb(n.folder)} · {n.pages.length}p ·{" "}
                          {new Date(n.updatedAt).toLocaleDateString("ko-KR")}
                          {n.tags.length
                            ? ` · ${n.tags.map((tag) => `#${tag}`).join(" ")}`
                            : ""}
                        </Text>
                        {hit && (
                          <Text numberOfLines={1} style={s.hitSnippet}>
                            {hit.snippet.replace(/<\/?b>/g, "")}
                          </Text>
                        )}
                      </View>
                      {!selectionMode && <Pressable
                        accessibilityLabel={
                          n.favorite ? "즐겨찾기 해제" : "즐겨찾기"
                        }
                        onPress={() =>
                          onUpdate({
                            ...n,
                            favorite: !n.favorite,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        style={s.listAction}
                      >
                        <Ionicons
                          name={n.favorite ? "star" : "star-outline"}
                          size={18}
                          color={n.favorite ? "#B77A18" : C.muted}
                        />
                      </Pressable>}
                      {!selectionMode && <Pressable
                        accessibilityLabel={`${n.title} 설정`}
                        onPress={() => manage(n)}
                        style={s.listAction}
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={18}
                          color={C.muted}
                        />
                      </Pressable>}
                    </Pressable>
                  );
                return (
                  <Pressable
                    key={n.id}
                    accessibilityLabel={`${n.title}, ${n.pages.length}페이지${n.locked ? ", 잠김" : ""}${selectionMode ? selectedIds.has(n.id) ? ", 선택됨" : ", 선택 안 됨" : ""}`}
                    accessibilityState={{ selected: selectionMode && selectedIds.has(n.id) }}
                    onPress={() =>
                      selectionMode ? toggleSelection(n.id) : onOpen(n.id, hit?.pageIndex, hit ? query : undefined)
                    }
                    onLongPress={() => selectionMode ? toggleSelection(n.id) : beginSelection(n.id)}
                    style={[s.card, selectionMode && selectedIds.has(n.id) && s.selectionSelected]}
                  >
                    <View
                      style={[
                        s.cover,
                        {
                          backgroundColor: normalizeNotebookCoverColor(
                            n.coverColor,
                          ),
                        },
                      ]}
                    >
                      {n.coverUri && !n.locked && (
                        <Image
                          source={{ uri: n.coverUri }}
                          resizeMode="cover"
                          style={StyleSheet.absoluteFill}
                        />
                      )}
                      {(!n.coverUri || n.locked) && (
                        <View style={s.coverBand} />
                      )}
                      {(!n.coverUri || n.locked) &&
                        Array.from({ length: 6 }, (_, i) => (
                          <View
                            key={i}
                            style={[s.coverLine, { top: 42 + i * 20 }]}
                          />
                        ))}
                      {selectionMode && <View style={s.cardSelection}><Ionicons name={selectedIds.has(n.id) ? "checkmark-circle" : "ellipse-outline"} size={24} color={selectedIds.has(n.id) ? C.accent : C.line}/></View>}
                      {!selectionMode && <Pressable
                        accessibilityLabel={
                          n.favorite ? "즐겨찾기 해제" : "즐겨찾기"
                        }
                        onPress={() =>
                          onUpdate({
                            ...n,
                            favorite: !n.favorite,
                            updatedAt: new Date().toISOString(),
                          })
                        }
                        style={s.cardStar}
                      >
                        <Ionicons
                          name={n.favorite ? "star" : "star-outline"}
                          size={17}
                          color={n.favorite ? "#B77A18" : C.muted}
                        />
                      </Pressable>}
                      <Text style={s.coverPage}>
                        {hit ? `p.${hit.pageIndex + 1}` : `${n.pages.length}p`}
                      </Text>
                      {n.locked && (
                        <View style={s.cardLock}>
                          <Ionicons
                            name="lock-closed"
                            size={13}
                            color={C.accent}
                          />
                        </View>
                      )}
                      {n.conflictOf && <View style={s.cardConflictBadge}><Ionicons name="git-compare-outline" size={12} color={C.white}/><Text style={s.cardConflictText}>충돌 사본</Text></View>}
                    </View>
                    <Text numberOfLines={1} style={s.cardTitle}>
                      {n.title}
                    </Text>
                    {n.tags.length > 0 && (
                      <Text numberOfLines={1} style={s.tagLine}>
                        {n.tags.map((tag) => `#${tag}`).join(" ")}
                      </Text>
                    )}
                    {hit && (
                      <Text numberOfLines={2} style={s.hitSnippet}>
                        {hit.snippet.replace(/<\/?b>/g, "")}
                      </Text>
                    )}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text style={s.cardMeta}>
                        {new Date(n.updatedAt).toLocaleDateString("ko-KR")}
                      </Text>
                      {!selectionMode && <Pressable
                        onPress={() => manage(n)}
                        style={s.folderBadge}
                      >
                        <Text numberOfLines={1} style={s.folderBadgeText}>
                          {folderBreadcrumb(n.folder)}
                        </Text>
                      </Pressable>}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
      <CloudSyncPanel
        visible={cloudOpen}
        onClose={() => setCloudOpen(false)}
        items={items}
        backupRetention={backupRetention}
        onRestore={onCloudRestore}
      />
      <LibraryMovePanel
        visible={moveSelectionOpen}
        count={selectedIds.size}
        categories={categories}
        onClose={() => setMoveSelectionOpen(false)}
        onMove={(folder) => {
          const updatedAt = new Date().toISOString();
          moveNotebookSelection(items, selectedIds, folder, updatedAt)
            .filter((note, index) => note !== items[index])
            .forEach(onUpdate);
          closeSelectionMode();
        }}
      />
      <NotebookOrganizer
        notebook={managing}
        categories={categories}
        onClose={() => setManaging(null)}
        onDelete={onDelete}
        onToggleLock={onToggleNotebookLock}
        onSave={(next) => {
          onUpdate(next);
          setManaging(next);
        }}
      />
      <FolderManager
        folder={managingFolder}
        noteCount={
          managingFolder
            ? items.filter((note) =>
                folderContains(managingFolder, note.folder),
              ).length
            : 0
        }
        onClose={() => setManagingFolder(null)}
        onRename={(name) => {
          if (!managingFolder) return;
          if (onRenameCategory(managingFolder, name)) {
            const next = childFolder(parentFolder(managingFolder), name);
            if (
              selected === managingFolder ||
              folderContains(managingFolder, selected)
            )
              setSelected(replaceFolderRoot(selected, managingFolder, next));
            setManagingFolder(null);
          }
        }}
        onDelete={() => {
          if (!managingFolder) return;
          const folder = managingFolder;
          Alert.alert(
            "폴더 삭제",
            `${folderBreadcrumb(folder)} 폴더를 삭제할까요? 노트와 하위 폴더는 상위 폴더로 이동합니다.`,
            [
              { text: "취소" },
              {
                text: "삭제",
                style: "destructive",
                onPress: () => {
                  onDeleteCategory(folder);
                  if (selected === folder || folderContains(folder, selected))
                    setSelected(parentFolder(folder) || "내 노트");
                  setManagingFolder(null);
                },
              },
            ],
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  muted: { color: C.muted },
  loadFailure: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: C.canvas,
  },
  loadFailureTitle: {
    marginTop: 14,
    fontSize: 20,
    fontWeight: "800",
    color: C.ink,
  },
  loadFailureMessage: {
    marginTop: 8,
    maxWidth: 520,
    color: "#A53330",
    textAlign: "center",
  },
  loadFailureHelp: {
    marginTop: 8,
    maxWidth: 520,
    color: C.muted,
    lineHeight: 20,
    textAlign: "center",
  },
  loadRetry: {
    marginTop: 20,
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadRetryText: { color: C.white, fontSize: 15, fontWeight: "800" },
  loadRestore: {
    marginTop: 10,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadRestoreText: { color: C.accent, fontSize: 14, fontWeight: "800" },
  editor: { flex: 1, flexDirection: "row" },
  editorLeftHanded: { flexDirection: "row-reverse" },
  canvasArea: { flex: 1, padding: 24, alignItems: "center" },
  paper: {
    width: "100%",
    maxWidth: 900,
    aspectRatio: 1.414,
    backgroundColor: C.paper,
    borderRadius: 3,
    overflow: "hidden",
    shadowColor: "#3B392F",
    shadowOpacity: 0.13,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
  },
  pageGrid: {
    position: "absolute",
    right: 178,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  pageGridLeft: { right: undefined, left: 178 },
  rotatePage: {
    position: "absolute",
    right: 128,
    bottom: 18,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  rotatePageLeft: { right: undefined, left: 128 },
  rail: {
    width: 112,
    backgroundColor: C.sidebar,
    borderLeftWidth: 1,
    borderLeftColor: C.line,
  },
  railLeft: {
    borderLeftWidth: 0,
    borderRightWidth: 1,
    borderRightColor: C.line,
  },
  railActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 5,
    marginBottom: 10,
  },
  railAction: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: C.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.line,
  },
  templateDot: {
    width: 20,
    height: 20,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  templateActive: { backgroundColor: C.accent },
  railTitle: { padding: 15, fontSize: 12, color: C.muted, fontWeight: "700" },
  railList: { alignItems: "center", gap: 12, paddingBottom: 24 },
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
    borderColor: "#E4E8E1",
  },
  thumbBookmark: { position: "absolute", right: 4, top: 0 },
  pageNo: {
    fontSize: 10,
    color: C.muted,
    position: "absolute",
    bottom: -15,
    alignSelf: "center",
  },
  templatePicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  categoryChip: {
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipActive: { backgroundColor: C.accent, borderColor: C.accent },
  categoryChipText: { fontSize: 12, fontWeight: "700", color: C.muted },
  categoryInput: {
    minHeight: 38,
    paddingVertical: 5,
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  tagNavContent: { paddingBottom: 4 },
  sideCount: { fontSize: 10, color: C.muted },
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
  folderBadgeText: { fontSize: 9, color: C.accent, fontWeight: "700" },
  library: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: 238,
    backgroundColor: C.sidebar,
    borderRightWidth: 1,
    borderRightColor: C.line,
    padding: 18,
  },
  sidebarNavigation: { flex: 1, marginHorizontal: -4 },
  sidebarNavigationContent: { paddingHorizontal: 4, paddingBottom: 14 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  mark: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markText: { color: "white", fontWeight: "800", fontSize: 17 },
  brandText: { fontSize: 20, color: C.ink, fontWeight: "800" },
  section: {
    fontSize: 11,
    color: "#99958C",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 7,
    paddingHorizontal: 10,
  },
  sideItem: {
    minHeight: 42,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 11,
    paddingHorizontal: 11,
  },
  sideActive: { backgroundColor: C.accentSoft },
  sideText: { color: C.muted, fontWeight: "600" },
  sideActiveText: { color: C.accent, fontWeight: "700" },
  sync: {
    marginTop: "auto",
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
  },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#64A37C" },
  syncDotError: { backgroundColor: "#C64B47" },
  syncTitle: { fontSize: 12, fontWeight: "700", color: C.ink },
  syncTitleError: { color: "#A53330" },
  syncSub: { fontSize: 10, color: C.muted, marginTop: 2 },
  main: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 32,
    backgroundColor: C.sidebar,
  },
  libraryTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  libraryTopCompact: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 14,
  },
  libraryActions: { flexDirection: "row", gap: 10 },
  libraryControls: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sortOptions: { gap: 6 },
  sortButton: {
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    paddingHorizontal: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sortActive: { backgroundColor: C.accent, borderColor: C.accent },
  sortText: { fontSize: 10, fontWeight: "800", color: C.muted },
  sortTextActive: { color: C.white },
  viewToggle: {
    marginLeft: "auto",
    height: 34,
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
  },
  viewButton: {
    width: 38,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.white,
  },
  eyebrow: { color: C.muted, fontSize: 12, fontWeight: "600", marginBottom: 4 },
  heading: {
    color: C.ink,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  newButton: {
    backgroundColor: C.accent,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 44,
    borderRadius: 13,
    paddingHorizontal: 16,
  },
  newText: { color: "white", fontWeight: "700" },
  selectionModeButton: { backgroundColor: C.accent },
  bulkBar: {
    minHeight: 48,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulkCount: { fontSize: 12, fontWeight: "900", color: C.ink, marginRight: "auto" },
  bulkAction: { height: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: C.accentSoft, flexDirection: "row", alignItems: "center", gap: 5 },
  bulkActionText: { fontSize: 10, fontWeight: "800", color: C.accent },
  bulkDelete: { height: 34, paddingHorizontal: 10, borderRadius: 10, backgroundColor: "#FFF0EF", flexDirection: "row", alignItems: "center", gap: 5 },
  bulkDeleteText: { fontSize: 10, fontWeight: "800", color: C.danger },
  bulkDisabled: { opacity: 0.4 },
  search: {
    height: 46,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 13,
    backgroundColor: C.white,
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    maxWidth: 600,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 10,
    outlineStyle: "none",
  } as never,
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    paddingVertical: 28,
  },
  list: { paddingVertical: 22, gap: 8 },
  listRow: {
    minHeight: 72,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  listIcon: {
    width: 43,
    height: 50,
    borderRadius: 9,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  listBody: { flex: 1, minWidth: 0 },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  listTitle: { fontSize: 14, fontWeight: "800", color: C.ink, flexShrink: 1 },
  listMeta: { fontSize: 10, color: C.muted, marginTop: 5 },
  listAction: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  card: { width: 168 },
  selectionSelected: { borderColor: C.accent, borderWidth: 2, borderRadius: 12, backgroundColor: C.accentSoft },
  cardSelection: { position: "absolute", right: 9, top: 9, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,.92)", alignItems: "center", justifyContent: "center", zIndex: 3 },
  cover: {
    width: 168,
    height: 216,
    backgroundColor: "#FFFDF8",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.line,
    overflow: "hidden",
    shadowColor: "#4B493F",
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  coverBand: {
    width: 12,
    height: "100%",
    backgroundColor: C.accentSoft,
    borderRightWidth: 1,
    borderRightColor: "#C7DAD3",
  },
  coverLine: {
    position: "absolute",
    left: 31,
    right: 20,
    height: 1,
    backgroundColor: "#E3E6E0",
  },
  cardStar: {
    position: "absolute",
    right: 9,
    top: 9,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  coverPage: {
    position: "absolute",
    right: 12,
    bottom: 10,
    color: C.muted,
    fontSize: 10,
  },
  cardLock: {
    position: "absolute",
    left: 22,
    bottom: 8,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  lassoPaste: {
    position: "absolute",
    top: 110,
    right: 18,
    zIndex: 31,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(255,255,255,.97)",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  lassoPasteLeft: { right: undefined, left: 18 },
  lassoPasteText: { fontSize: 11, fontWeight: "800", color: C.accent },
  excerptTray: {
    position: "absolute",
    left: 18,
    bottom: 70,
    zIndex: 32,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "rgba(255,255,255,.97)",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 10,
  },
  excerptTrayLeft: { left: undefined, right: 18 },
  excerptLabel: { fontSize: 9, fontWeight: "900", color: C.accent },
  excerptText: { fontSize: 12, lineHeight: 17, color: C.ink, marginTop: 3 },
  excerptPaste: {
    height: 36,
    borderRadius: 11,
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  excerptPasteText: { fontSize: 10, fontWeight: "800", color: C.white },
  excerptClose: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { marginTop: 11, fontWeight: "700", color: C.ink, fontSize: 14 },
  tagLine: { fontSize: 10, color: C.accent, marginTop: 4 },
  hitSnippet: { fontSize: 10, lineHeight: 14, color: C.muted, marginTop: 4 },
  cardMeta: { marginTop: 4, color: C.muted, fontSize: 11 },
  conflictBadge:{backgroundColor:C.danger,borderRadius:7,paddingHorizontal:7,paddingVertical:3},
  conflictBadgeText:{fontSize:9,fontWeight:"800",color:C.white},
  cardConflictBadge:{position:"absolute",left:8,top:8,flexDirection:"row",alignItems:"center",gap:4,backgroundColor:C.danger,borderRadius:8,paddingHorizontal:7,paddingVertical:4},
  cardConflictText:{fontSize:9,fontWeight:"800",color:C.white},
  empty: {
    flex: 1,
    minHeight: 420,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: C.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { marginTop: 18, fontSize: 18, fontWeight: "800", color: C.ink },
  emptyBody: { marginTop: 7, color: C.muted },
  emptyActions: { marginTop: 20, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10 },
});
