import { openDatabaseAsync, type SQLiteDatabase } from "expo-sqlite";
import type { Notebook } from "./types";
import { searchIndexRows } from "./searchIndexRows.ts";

export type SearchHit = { notebookId: string; pageId: string; pageIndex: number; snippet: string; rank: number };
let database: Promise<SQLiteDatabase> | undefined;
let rebuildQueue: Promise<void> = Promise.resolve();
let indexedFingerprints = new Map<string, string>();

async function db() {
  database ??= openDatabaseAsync("hanji-index.db").then(async (value) => {
    await value.execAsync("PRAGMA journal_mode=WAL; CREATE VIRTUAL TABLE IF NOT EXISTS page_search USING fts5(notebookId UNINDEXED,pageId UNINDEXED,pageIndex UNINDEXED,title,tags,body,tokenize='unicode61');");
    return value;
  });
  return database;
}

async function performSync(items: Notebook[]) {
  const value = await db();
  const rows = searchIndexRows(items);
  const next = new Map(rows.map((row) => [row.key, row.fingerprint]));
  const existing = await value.getAllAsync<{ notebookId: string; pageId: string }>("SELECT notebookId,pageId FROM page_search");
  await value.withTransactionAsync(async () => {
    for (const row of existing) {
      const key = `${row.notebookId}:${row.pageId}`;
      if (!next.has(key)) await value.runAsync("DELETE FROM page_search WHERE notebookId=? AND pageId=?", row.notebookId, row.pageId);
    }
    for (const row of rows) {
      if (indexedFingerprints.get(row.key) === row.fingerprint) continue;
      await value.runAsync("DELETE FROM page_search WHERE notebookId=? AND pageId=?", row.notebookId, row.pageId);
      await value.runAsync("INSERT INTO page_search(notebookId,pageId,pageIndex,title,tags,body) VALUES(?,?,?,?,?,?)", row.notebookId, row.pageId, row.pageIndex, row.title, row.tags, row.body);
    }
  });
  indexedFingerprints = next;
}

export function rebuildSearchIndex(items: Notebook[]) {
  const task = rebuildQueue.catch(() => undefined).then(() => performSync(items));
  rebuildQueue = task.then(() => undefined, () => undefined);
  return task;
}

export async function searchLibrary(query: string): Promise<SearchHit[]> {
  const tokens = query.trim().split(/\s+/).filter(Boolean).map((token) => `"${token.replace(/"/g, '""')}"*`);
  if (!tokens.length) return [];
  const value = await db();
  return value.getAllAsync<SearchHit>("SELECT notebookId,pageId,CAST(pageIndex AS INTEGER) pageIndex,snippet(page_search,5,'<b>','</b>',' … ',18) snippet,bm25(page_search,5.0,2.0,1.0) rank FROM page_search WHERE page_search MATCH ? ORDER BY rank LIMIT 100", tokens.join(" "));
}
