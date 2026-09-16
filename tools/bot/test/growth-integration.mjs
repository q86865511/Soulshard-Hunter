import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {validateGrowthDiagnostic} from '../growth-diagnostics.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const {chromium}=createRequire(path.join(ROOT,'test/package.json'))('playwright');
let server,browser;
before(async()=>{
 let occupied=false;try{await fetch('http://127.0.0.1:5173');occupied=true;}catch{}
 if(occupied)throw Error('5173 must be free');
 server=spawn(process.execPath,['tools/serve.mjs'],{cwd:ROOT,stdio:'ignore'});
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5173');break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();
});
after(async()=>{if(browser)await browser.close();if(server)server.kill();});
async function pageRun(diagnostics,fn){
 const context=await browser.newContext();
 try{
 await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
 await context.route('**/api/**',r=>r.abort());
 const page=await context.newPage();await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>!!window.__DBG,null,{polling:100});
 await page.evaluate(async diagnostics=>{
  window.__drv=await import('/tools/bot/driver.mjs');await __drv.setup();
  await __drv.startRun({biomeId:'crypt',characterId:'hunter',difficulty:1,seed:1,strategy:'A',maxSimSec:1,diagnostics});
 },diagnostics);
 return await fn(page);
 }finally{await context.close();}
}
test('growth driver: real pickup lifecycle, XP and choice evidence is valid',async()=>{
 const raw=await pageRun('growth-v1',page=>page.evaluate(()=>{
  const s=__BOT.scene,w=s.world;
  w.addPickup('xp',s.player.x,s.player.y,8);w.pickups.at(-1).collect(w);
  w.addPickup('xp',s.player.x,s.player.y,5);const expired=w.pickups.at(-1);expired.update(31,w);
  w.addPickup('xp',s.player.x+100,s.player.y,7);
  __drv.step(1);return __drv.collect();
 }));
 assert.ok(raw.diagnostics,'diagnostics enabled');
 assert.deepEqual(validateGrowthDiagnostic(raw.diagnostics),[]);
 assert.equal(raw.diagnostics.pickups.xp.spawned.value,20);
 assert.equal(raw.diagnostics.pickups.xp.collected.value,8);
 assert.equal(raw.diagnostics.pickups.xp.expired.value,5);
 assert.equal(raw.diagnostics.pickups.xp.remaining.value,7);
 assert.equal(raw.diagnostics.xp.credited,8);
});
test('growth driver: opt-out default and observing direct XP do not change progression',async()=>{
 const results=[];
 for(const diagnostics of [undefined,'growth-v1']){
  results.push(await pageRun(diagnostics,page=>page.evaluate(()=>{
   const s=__BOT.scene;s.world.gainXp(40);
   return {xp:s.run.xp,level:s.run.level,xpNext:s.run.xpNext,raw:__drv.collect()};
  })));
 }
 assert.equal(results[0].raw.diagnostics,undefined);
 assert.deepEqual([results[0].xp,results[0].level,results[0].xpNext],[results[1].xp,results[1].level,results[1].xpNext]);
 assert.equal(results[1].raw.diagnostics.xp.credited,40);
});
test('growth CLI: records and manifest bind diagnostics; omission cannot resume',()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'bot-growth-')),'out');
 const args=['tools/bot/run.mjs','--strategy','A','--biomes','crypt','--chars','hunter','--diffs','1','--runs','1','--maxSimSec','2','--out',out];
 const run=extra=>spawnSync(process.execPath,[...args,...extra],{cwd:ROOT,encoding:'utf8',timeout:90000});
 const first=run(['--diagnostics','growth-v1']);assert.equal(first.status,0,first.stderr);
 const file=path.join(out,'runs.jsonl'),body=fs.readFileSync(file,'utf8'),row=JSON.parse(body.trim());
 assert.deepEqual(validateGrowthDiagnostic(row.diagnostics),[]);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 assert.equal(manifest.args.diagnostics,'growth-v1');
 assert.notEqual(run([]).status,0);assert.equal(fs.readFileSync(file,'utf8'),body);
 assert.equal(run(['--diagnostics','growth-v1']).status,0);
});
