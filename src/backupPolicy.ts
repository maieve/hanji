export const backupRetentions=[3,5,10,20] as const;
export const backupIntervals=[5,15,30,60] as const;
export const normalizeBackupRetention=(value:number)=>backupRetentions.includes(value as typeof backupRetentions[number])?value:5;
export const normalizeBackupInterval=(value:number)=>backupIntervals.includes(value as typeof backupIntervals[number])?value:30;
export const backupIntervalMs=(minutes:number)=>normalizeBackupInterval(minutes)*60*1000;
export const backupUploadUri=(created:string|null|undefined,pending:string|undefined)=>created??pending;
export const backupFailureStage=(localBackupReady:boolean)=>localBackupReady?'cloud' as const:'local' as const;
