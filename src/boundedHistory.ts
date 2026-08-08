export const pushBounded=<T>(items:T[],item:T,limit=100)=>[...items.slice(-(Math.max(1,limit)-1)),item];
