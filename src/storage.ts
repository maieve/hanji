import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Notebook, Page, PageTemplate, TemplateSpacing } from "./types";
import { expandFolderPaths } from "./folders";
import { normalizeTemplateSpacing } from "./templateSpacing";
const KEY = "hanji.library.v2";
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
export async function loadLibrary(): Promise<Notebook[]> {
  const raw =
    (await AsyncStorage.getItem(KEY)) ??
    (await AsyncStorage.getItem("hanji.library.v1"));
  try {
    const notes = (raw ? JSON.parse(raw) : []) as Notebook[];
    return notes.map((note) => ({
      ...note,
      pages: note.pages.map((page, index) => ({
        ...page,
        templateSpacing: normalizeTemplateSpacing(page.templateSpacing),
        ...(page.pdfUri && page.pdfPageIndex === undefined
          ? { pdfPageIndex: index }
          : {}),
      })),
    }));
  } catch {
    return [];
  }
}
export async function saveLibrary(v: Notebook[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(v));
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
