import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Notebook, Page, PageTemplate, TemplateSpacing } from "./types";
import { expandFolderPaths } from "./folders";
import { normalizeTemplateSpacing } from "./templateSpacing";
import { Directory, File, Paths } from "expo-file-system";
import { drawingBlobName, isStoredLibraryMetadata, libraryMetadata, staleDrawingRefs, type StoredNotebook } from "./drawingPersistence";
const KEY = "hanji.library.v3";
const LEGACY_KEY = "hanji.library.v2";
const CATEGORY_KEY = "hanji.categories.v1";
export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
const now = () => new Date().toISOString();
export function blankPage(
  template: PageTemplate = "line",
  templateSpacing: TemplateSpacing = "medium",
): Page {
  return {
    id: makeId(),
    drawingData: "",
    template,
    templateSpacing,
    updatedAt: now(),
  };
}
export function newNotebook(
  title = "제목 없는 노트",
  template: PageTemplate = "line",
  templateSpacing: TemplateSpacing = "medium",
): Notebook {
  const t = now();
  return {
    id: makeId(),
    title,
    folder: "내 노트",
    tags: [],
    favorite: false,
    createdAt: t,
    updatedAt: t,
    pageOrderUpdatedAt: t,
    pages: [blankPage(template, templateSpacing)],
  };
}
export function pdfNotebook(name: string, uri: string): Notebook {
  const n = newNotebook(name.replace(/\.pdf$/i, ""));
  n.pages = [
    {
      ...blankPage(),
      template: "plain",
      pdfUri: uri,
      pdfName: name,
      pdfPageIndex: 0,
    },
  ];
  return n;
}
const corruptDrawingRefs=new Set<string>();
const unrecoverableDrawingRefs=new Map<string,string>();
export async function loadLibrary(): Promise<Notebook[]> {
  const raw = await AsyncStorage.getItem(KEY);
  const legacyRaw = (await AsyncStorage.getItem(LEGACY_KEY)) ?? (await AsyncStorage.getItem("hanji.library.v1"));
  let currentMetadataParsed = false;
  try {
    if (!raw) {
      const legacy = (legacyRaw ? JSON.parse(legacyRaw) : []) as Notebook[];
      const normalized = normalizeLibrary(legacy);
      if (normalized.length) await saveLibrary(normalized);
      return normalized;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredLibraryMetadata(parsed))
      throw new Error("저장된 노트 메타데이터가 손상되었습니다.");
    const stored = parsed;
    currentMetadataParsed = true;
    const fallback = new Map<string,string>();
    if (legacyRaw) for(const note of JSON.parse(legacyRaw) as Notebook[])for(const page of note.pages)fallback.set(`${note.id}:${page.id}`,page.drawingData);
    const directory = drawingDirectory();
    const notes = await Promise.all(stored.map(async(note)=>({...note,pages:await Promise.all(note.pages.map(async({drawingRef,...page})=>{
      let drawingData="";
      if(drawingRef){
        const file=new File(directory,drawingRef);
        if(file.exists){
          const candidate=await file.text();
          if(drawingBlobName(note.id,page.id,candidate)===drawingRef)drawingData=candidate;
          else{
            const recovered=fallback.get(`${note.id}:${page.id}`)??"";
            if(recovered)corruptDrawingRefs.add(drawingRef);else unrecoverableDrawingRefs.set(`${note.id}:${page.id}`,drawingRef);
            drawingData=recovered;
          }
        }else{
          const recovered=fallback.get(`${note.id}:${page.id}`)??"";
          if(!recovered)unrecoverableDrawingRefs.set(`${note.id}:${page.id}`,drawingRef);
          drawingData=recovered;
        }
      }
      return {...page,drawingData};
    }))})));
    return normalizeLibrary(notes);
  } catch (error) {
    if (!currentMetadataParsed && legacyRaw) {
      try {
        return normalizeLibrary(JSON.parse(legacyRaw) as Notebook[]);
      } catch {
        // Both the current metadata and its legacy recovery snapshot are invalid.
      }
    }
    throw error instanceof Error
      ? error
      : new Error("저장된 노트를 읽지 못했습니다.");
  }
}
const normalizeLibrary=(notes:Notebook[])=>notes.map((note) => ({
      ...note,
      pages: note.pages.map((page, index) => ({
        ...page,
        templateSpacing: normalizeTemplateSpacing(page.templateSpacing),
        ...(page.pdfUri && page.pdfPageIndex === undefined
          ? { pdfPageIndex: index }
          : {}),
      })),
    }));
function drawingDirectory(){const directory=new Directory(Paths.document,"Hanji","drawings");if(!directory.exists)directory.create({intermediates:true,idempotent:true});return directory;}
let saveQueue:Promise<void>=Promise.resolve();
export async function saveLibrary(v: Notebook[]) {
  const task=saveQueue.catch(()=>undefined).then(async()=>{
    const directory=drawingDirectory(),metadata=libraryMetadata(v);
    for(const [noteIndex,note] of v.entries())for(const [pageIndex,page] of note.pages.entries()){
      const pageKey=`${note.id}:${page.id}`,storedPage=metadata[noteIndex]?.pages[pageIndex];
      if(!page.drawingData){const preserved=unrecoverableDrawingRefs.get(pageKey);if(preserved&&storedPage)storedPage.drawingRef=preserved;continue;}
      unrecoverableDrawingRefs.delete(pageKey);
      const drawingRef=storedPage?.drawingRef;if(!drawingRef)continue;
      const file=new File(directory,drawingRef);
      if(corruptDrawingRefs.has(drawingRef)&&file.exists)file.delete();
      if(!file.exists){file.create();file.write(page.drawingData);}
      corruptDrawingRefs.delete(drawingRef);
    }
    await AsyncStorage.setItem(KEY,JSON.stringify(metadata));
    const drawingFiles=directory.list().filter((entry):entry is File=>entry instanceof File&&entry.extension===".drawing");
    const stale=new Set(staleDrawingRefs(drawingFiles.map((file)=>file.name),metadata));
    for(const file of drawingFiles)if(stale.has(file.name)&&file.exists)file.delete();
  });
  saveQueue=task.then(()=>undefined,()=>undefined);await task;
}
export async function loadCategories(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CATEGORY_KEY);
  try {
    return expandFolderPaths(
      raw ? JSON.parse(raw) : ["내 노트", "업무", "스터디", "개인"],
    );
  } catch {
    return ["내 노트", "업무", "스터디", "개인"];
  }
}
export async function saveCategories(v: string[]) {
  await AsyncStorage.setItem(
    CATEGORY_KEY,
    JSON.stringify(expandFolderPaths(v)),
  );
}
