import assert from 'node:assert/strict';
import {FLASHCARD_SPLIT_RATIO,flashcardRegion} from '../src/flashcardTemplate.ts';
assert.equal(FLASHCARD_SPLIT_RATIO,.5);
assert.deepEqual(flashcardRegion('question'),{y:0,height:.5});
assert.deepEqual(flashcardRegion('answer'),{y:.5,height:.5});
console.log('flashcard template verification passed');
