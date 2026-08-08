import assert from 'node:assert/strict';
import {createImageFlashcard,reviewFlashcard} from '../src/srs.ts';

const now=new Date('2026-08-08T00:00:00.000Z');
const card=createImageFlashcard('file:///Hanji/assets/clips/question.png','', '정답',now);
assert.equal(card.questionImageUri,'file:///Hanji/assets/clips/question.png');
assert.equal(card.question,'이미지 질문');
assert.equal(card.answer,'정답');
assert.equal(card.dueAt,now.toISOString());
assert.equal(reviewFlashcard(card,3,now).questionImageUri,card.questionImageUri);
console.log('image flashcard verification passed');
