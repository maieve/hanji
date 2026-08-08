export const FLASHCARD_SPLIT_RATIO=.5;
export const flashcardRegion=(side:'question'|'answer')=>side==='question'?{y:0,height:FLASHCARD_SPLIT_RATIO}:{y:FLASHCARD_SPLIT_RATIO,height:1-FLASHCARD_SPLIT_RATIO};
