import {readFileSync,writeFileSync} from 'node:fs';

const path='app.json';
const config=JSON.parse(readFileSync(path,'utf8'));
const sha=(process.env.HANJI_SHA??'dev').slice(0,7);
const run=String(process.env.HANJI_RUN_NUMBER??'1').replace(/\D/g,'')||'1';
config.expo.extra={...(config.expo.extra??{}),hanjiBuild:sha};
config.expo.ios={...(config.expo.ios??{}),buildNumber:run};
writeFileSync(path,`${JSON.stringify(config,null,2)}\n`);
console.log(`Stamped yoojin note ${config.expo.version} (${run}) ${sha}`);
