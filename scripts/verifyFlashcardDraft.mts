import assert from 'node:assert/strict';
import {selectionTextToQuestion} from '../src/flashcardDraft.ts';
assert.equal(selectionTextToQuestion('  한지\n  질문\t영역  '),'한지 질문 영역');
assert.equal(selectionTextToQuestion('   '),'');
assert.equal(selectionTextToQuestion('가'.repeat(700)).length,500);
console.log('flashcard draft verification passed');
