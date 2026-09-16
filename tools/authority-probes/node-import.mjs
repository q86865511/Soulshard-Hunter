import fs from 'node:fs';
fs.mkdirSync('.pipeline',{recursive:true});
globalThis.fetch=()=>Promise.reject(Error('network disabled in local probe'));
globalThis.WebSocket=class {constructor(){throw Error('network disabled in local probe');}};
const results=[];
for(const name of ['world','player','enemy','projectile','pickup']){
 try{const mod=await import('../../src/game/'+name+'.js');results.push({module:name,loaded:true,exports:Object.keys(mod)});}
 catch(e){results.push({module:name,loaded:false,error:String(e.stack||e)});}
}
fs.writeFileSync('.pipeline/r32-node-import-probe.json',JSON.stringify({node:process.version,results},null,2)+'\n');
console.log(JSON.stringify({node:process.version,results},null,2));
process.exitCode=0;
