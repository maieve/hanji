export const FOCUS_TOOLBAR_IDLE_MS=2000;
export function focusToolbarShouldHide(lastActivity:number,now:number){return now-lastActivity>=FOCUS_TOOLBAR_IDLE_MS}
