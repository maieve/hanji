import assert from "node:assert/strict";
import { deleteNotebookSelection, moveNotebookSelection, setNotebookSelectionFavorite, toggleNotebookSelection } from "../src/librarySelection.ts";

const page = { id: "p", drawingData: "", template: "plain" as const, updatedAt: "old" };
const notes = [
  { id: "a", title: "A", folder: "내 노트", tags: [], favorite: false, createdAt: "old", updatedAt: "old", pages: [page] },
  { id: "b", title: "B", folder: "내 노트", tags: [], favorite: true, locked: true, createdAt: "old", updatedAt: "old", pages: [page] },
  { id: "c", title: "C", folder: "업무", tags: ["keep"], favorite: false, createdAt: "old", updatedAt: "old", pages: [page] },
];

let selected = toggleNotebookSelection(new Set<string>(), "a");
selected = toggleNotebookSelection(selected, "b");
assert.deepEqual([...selected], ["a", "b"]);
assert.deepEqual([...toggleNotebookSelection(selected, "a")], ["b"]);
const favorited = setNotebookSelectionFavorite(notes, selected, true, "new");
assert.equal(favorited[0].favorite, true);
assert.equal(favorited[1].favorite, true);
assert.equal(favorited[2], notes[2]);
assert.equal(favorited[0].updatedAt, "new");
assert.deepEqual(deleteNotebookSelection(notes, selected).map((note) => note.id), ["c"]);
const moved = moveNotebookSelection(notes, selected, "업무 / 회의", "moved");
assert.equal(moved[0].folder, "업무 / 회의");
assert.equal(moved[1].folder, "업무 / 회의");
assert.equal(moved[1].locked, true);
assert.equal(moved[2], notes[2]);
assert.equal(notes.length, 3);

console.log("library selection verification passed");
