import {backupIntervalMs,normalizeBackupInterval,normalizeBackupRetention} from '../src/backupPolicy.ts';
const assert=(condition:unknown,message:string)=>{if(!condition)throw new Error(message)};
assert(backupIntervalMs(5)===300000&&backupIntervalMs(60)===3600000,'allowed backup intervals must convert to milliseconds');
assert(normalizeBackupInterval(17)===30,'invalid interval must fall back to 30 minutes');
assert(normalizeBackupRetention(3)===3&&normalizeBackupRetention(20)===20,'allowed retention values must survive normalization');
assert(normalizeBackupRetention(0)===5&&normalizeBackupRetention(999)===5,'invalid retention must safely fall back to five copies');
console.log('backup policy verification passed');
