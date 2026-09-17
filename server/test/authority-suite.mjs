import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cwd=fileURLToPath(new URL('../',import.meta.url));
console.log('Authority suite runtime: '+process.version);
const cases=[
 ['--test','test/authority-input.test.mjs','test/authority-manager.test.mjs','test/authority-reconnect.test.mjs','test/authority-client-settlement.test.mjs'],
 ...['simulation','content','gateway','persistence','api','validation','abandon','disconnect'].map(n=>['test/authority-'+n+'.mjs']),
];
for(const args of cases){
 const r=spawnSync(process.execPath,args,{cwd,stdio:'inherit',windowsHide:true,timeout:60000});
 if(r.error){console.error(r.error);process.exit(1);}if(r.status!==0)process.exit(r.status||1);
}
