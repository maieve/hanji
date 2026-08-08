export function selectionTextToQuestion(text:string,maxLength=500){
  return text.trim().replace(/\s+/g,' ').slice(0,maxLength);
}
