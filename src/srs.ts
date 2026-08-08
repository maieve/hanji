import type {Flashcard} from './types';

export type ReviewGrade=0|1|2|3;

export function createFlashcard(question:string,answer:string,now=new Date()):Flashcard{
  const stamp=now.toISOString();
  return{id:`card-${now.getTime()}-${Math.random().toString(36).slice(2,8)}`,question:question.trim(),answer:answer.trim(),createdAt:stamp,updatedAt:stamp,dueAt:stamp,intervalDays:0,easeFactor:2.5,repetitions:0,lapses:0};
}
export function createImageFlashcard(questionImageUri:string,question:string,answer:string,now=new Date()):Flashcard{return{...createFlashcard(question||'이미지 질문',answer,now),questionImageUri}}

export function createPageFlashcard(questionImageUri:string,answerImageUri:string,now=new Date()):Flashcard{return{...createFlashcard('페이지 질문','아래쪽에서 정답을 확인하세요.',now),questionImageUri,answerImageUri}}

export function updateFlashcardContent(card:Flashcard,question:string,answer:string,questionImageUri:string|undefined,now=new Date()):Flashcard{
  return{...card,question:(question.trim()||(questionImageUri?'이미지 질문':'')),answer:answer.trim(),questionImageUri,updatedAt:now.toISOString()};
}

export function reviewFlashcard(card:Flashcard,grade:ReviewGrade,now=new Date()):Flashcard{
  let ease=card.easeFactor,repetitions=card.repetitions,interval=card.intervalDays,lapses=card.lapses;
  if(grade===0){repetitions=0;interval=0;lapses+=1;ease=Math.max(1.3,ease-0.2)}
  else if(grade===1){repetitions=0;interval=1;lapses+=1;ease=Math.max(1.3,ease-0.15)}
  else{repetitions+=1;if(repetitions===1)interval=1;else if(repetitions===2)interval=grade===3?4:3;else interval=Math.max(1,Math.round(interval*ease*(grade===3?1.3:1)));if(grade===3)ease+=0.1}
  const due=new Date(now);if(grade===0)due.setMinutes(due.getMinutes()+10);else due.setDate(due.getDate()+interval);
  const stamp=now.toISOString();return{...card,intervalDays:interval,easeFactor:Math.max(1.3,ease),repetitions,lapses,lastReviewedAt:stamp,updatedAt:stamp,dueAt:due.toISOString()};
}

export const dueFlashcards=(cards:Flashcard[],now=new Date())=>cards.filter(card=>new Date(card.dueAt).getTime()<=now.getTime()).sort((a,b)=>a.dueAt.localeCompare(b.dueAt));
