export function normalizeFolderPath(value:string){return value.split(/[\\/]+/).map(x=>x.trim()).filter(Boolean).join('/')}
export function folderDepth(path:string){return Math.max(0,normalizeFolderPath(path).split('/').filter(Boolean).length-1)}
export function folderLabel(path:string){const parts=normalizeFolderPath(path).split('/');return parts[parts.length-1]??path}
export function folderBreadcrumb(path:string){return normalizeFolderPath(path).replaceAll('/',' › ')}
export function folderContains(parent:string,path:string){const root=normalizeFolderPath(parent),candidate=normalizeFolderPath(path);return candidate===root||candidate.startsWith(`${root}/`)}
export function expandFolderPaths(paths:string[]){const result=new Set<string>();for(const raw of paths){const parts=normalizeFolderPath(raw).split('/').filter(Boolean);for(let i=1;i<=parts.length;i++)result.add(parts.slice(0,i).join('/'))}return [...result].sort((a,b)=>a.localeCompare(b,'ko'))}
export function childFolder(parent:string,name:string){const leaf=normalizeFolderPath(name);return normalizeFolderPath(parent?`${parent}/${leaf}`:leaf)}
export function parentFolder(path:string){const parts=normalizeFolderPath(path).split('/').filter(Boolean);return parts.slice(0,-1).join('/')}
export function replaceFolderRoot(path:string,from:string,to:string){
 const source=normalizeFolderPath(from),candidate=normalizeFolderPath(path),target=normalizeFolderPath(to);
 if(!source||!folderContains(source,candidate))return candidate;
 const suffix=candidate.slice(source.length).replace(/^\//,'');
 return normalizeFolderPath([target,suffix].filter(Boolean).join('/'));
}
export function renameFolderPaths(paths:string[],from:string,newName:string){
 const source=normalizeFolderPath(from),leaf=normalizeFolderPath(newName);
 if(!source||!leaf||leaf.includes('/'))return expandFolderPaths(paths);
 const target=childFolder(parentFolder(source),leaf);
 return expandFolderPaths(paths.map(path=>replaceFolderRoot(path,source,target)));
}
export function deleteFolderPaths(paths:string[],target:string,rootFallback=''){
 const source=normalizeFolderPath(target),parent=parentFolder(source)||normalizeFolderPath(rootFallback);
 return expandFolderPaths(paths.filter(path=>normalizeFolderPath(path)!==source).map(path=>replaceFolderRoot(path,source,parent)));
}
