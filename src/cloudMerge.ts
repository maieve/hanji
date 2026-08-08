import type { AudioSession, Flashcard, Notebook, Page } from "./types";

const assetIdentity = (uri?: string) => {
  if (!uri) return undefined;
  try {
    return decodeURIComponent(uri.split("/").pop() ?? "").replace(/^\d+-/, "");
  } catch {
    return uri.split("/").pop();
  }
};
const pageContent = (page: Page) =>
  JSON.stringify({
    drawingData: page.drawingData,
    template: page.template,
    templateSpacing: page.templateSpacing,
    backgroundColor: page.backgroundColor,
    backgroundOpacity: page.backgroundOpacity,
    rotation: page.rotation,
    customTemplate: assetIdentity(page.customTemplateUri),
    bookmarked: page.bookmarked,
    elements: (page.elements ?? []).map((element) =>
      element.kind === "image"
        ? { ...element, uri: assetIdentity(element.uri) }
        : element,
    ),
    pdfName: page.pdfName,
    pdfPageIndex: page.pdfPageIndex,
  });
const signature = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const newer = <T extends { updatedAt: string }>(a: T, b: T) =>
  b.updatedAt > a.updatedAt ? b : a;

const mergeAudio = (a: AudioSession[] = [], b: AudioSession[] = []) => {
  const result = new Map(a.map((session) => [session.createdAt, session]));
  for (const session of b) {
    const current = result.get(session.createdAt);
    if (
      !current ||
      session.durationMs > current.durationMs ||
      (!current.transcript && session.transcript)
    )
      result.set(session.createdAt, session);
  }
  return [...result.values()].sort((x, y) =>
    x.createdAt.localeCompare(y.createdAt),
  );
};

const mergeCards = (a: Flashcard[] = [], b: Flashcard[] = []) => {
  const result = new Map(a.map((card) => [card.id, card]));
  for (const card of b) {
    const current = result.get(card.id);
    result.set(card.id, current ? newer(current, card) : card);
  }
  return [...result.values()];
};

type ConflictPage = { page: Page; source: Notebook };

function mergeNotebook(
  local: Notebook,
  remote: Notebook,
): { note: Notebook; conflicts: ConflictPage[] } {
  const metadata = remote.updatedAt > local.updatedAt ? remote : local;
  const localPages = new Map(local.pages.map((page) => [page.id, page]));
  const remotePages = new Map(remote.pages.map((page) => [page.id, page]));
  const deletedPages = { ...(local.deletedPages ?? {}) };
  for (const [id, stamp] of Object.entries(remote.deletedPages ?? {}))
    if (!deletedPages[id] || stamp > deletedPages[id]) deletedPages[id] = stamp;
  const order = [
    ...new Set([
      ...local.pages.map((page) => page.id),
      ...remote.pages.map((page) => page.id),
      ...Object.keys(deletedPages),
    ]),
  ];
  const conflicts: ConflictPage[] = [];
  const pages = order.flatMap((id) => {
    const left = localPages.get(id),
      right = remotePages.get(id);
    const deletedAt = deletedPages[id];
    if (deletedAt) {
      const candidates = [
        left && { page: left, source: local },
        right && { page: right, source: remote },
      ].filter((item): item is ConflictPage => Boolean(item));
      const newest = candidates.reduce<ConflictPage | undefined>(
        (best, item) =>
          !best || item.page.updatedAt > best.page.updatedAt ? item : best,
        undefined,
      );
      if (!newest || deletedAt >= newest.page.updatedAt) {
        if (newest) conflicts.push(newest);
        return [];
      }
    }
    if (!left) return right ? [right] : [];
    if (!right) return [left];
    if (pageContent(left) === pageContent(right)) return [newer(left, right)];
    const remoteWins =
      right.updatedAt > left.updatedAt ||
      (right.updatedAt === left.updatedAt &&
        remote.updatedAt > local.updatedAt);
    conflicts.push({
      page: remoteWins ? left : right,
      source: remoteWins ? local : remote,
    });
    return [remoteWins ? right : left];
  });
  return {
    note: {
      ...metadata,
      id: local.id,
      createdAt:
        local.createdAt < remote.createdAt ? local.createdAt : remote.createdAt,
      updatedAt:
        local.updatedAt > remote.updatedAt ? local.updatedAt : remote.updatedAt,
      pages,
      deletedPages,
      audioSessions: mergeAudio(local.audioSessions, remote.audioSessions),
      flashcards: mergeCards(local.flashcards, remote.flashcards),
    },
    conflicts,
  };
}

function conflictNotebook(sourceId: string, items: ConflictPage[]): Notebook {
  const first = items[0]!;
  const base = items.reduce(
    (latest, item) =>
      item.source.updatedAt > latest.updatedAt ? item.source : latest,
    first.source,
  );
  const content = items
    .map((item) => `${item.page.id}:${signature(pageContent(item.page))}`)
    .sort()
    .join("|");
  const conflictSignature = signature(content),
    stamp = `${Date.now()}-${conflictSignature}`;
  const pageIds = new Map(
    items.map(({ page }) => [page.id, `${page.id}-conflict-${stamp}`]),
  );
  const pages = items.map(({ page }) => ({
    ...page,
    id: pageIds.get(page.id)!,
  }));
  const audioSessions = mergeAudio(
    [],
    items.flatMap((item) => item.source.audioSessions ?? []),
  )
    .map((session) => ({
      ...session,
      strokes: session.strokes
        .filter((stroke) => pageIds.has(stroke.pageId))
        .map((stroke) => ({ ...stroke, pageId: pageIds.get(stroke.pageId)! })),
    }))
    .filter((session) => session.strokes.length > 0);
  return {
    ...base,
    id: `${sourceId}-conflict-${stamp}`,
    title: `${base.title} (페이지 충돌 사본)`,
    favorite: false,
    updatedAt: new Date().toISOString(),
    pages,
    deletedPages: undefined,
    audioSessions,
    conflictOf: sourceId,
    conflictSignature,
  };
}

export function mergeCloudRestore(
  local: Notebook[],
  remote: Notebook[],
): Notebook[] {
  const merged = new Map(local.map((note) => [note.id, note]));
  const existingConflicts = [...local.filter((note) => note.conflictSignature)];
  for (const incoming of remote) {
    const current = merged.get(incoming.id);
    if (!current) {
      merged.set(incoming.id, incoming);
      continue;
    }
    if (current.conflictSignature || incoming.conflictSignature) {
      if (incoming.updatedAt > current.updatedAt)
        merged.set(incoming.id, incoming);
      continue;
    }
    const result = mergeNotebook(current, incoming);
    merged.set(incoming.id, result.note);
    const novelConflicts = result.conflicts.filter(
      ({ page }) =>
        !existingConflicts.some(
          (note) =>
            note.conflictOf === incoming.id &&
            note.pages.some(
              (saved) => pageContent(saved) === pageContent(page),
            ),
        ),
    );
    if (novelConflicts.length) {
      const copy = conflictNotebook(incoming.id, novelConflicts);
      if (
        !existingConflicts.some(
          (note) =>
            note.conflictOf === incoming.id &&
            note.conflictSignature === copy.conflictSignature,
        )
      ) {
        existingConflicts.push(copy);
        merged.set(copy.id, copy);
      }
    }
  }
  return [...merged.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
