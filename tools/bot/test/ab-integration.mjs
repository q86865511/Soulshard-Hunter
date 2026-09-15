import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const {chromium}=createRequire(path.join(ROOT,'test/package.json'))('playwright');
let server,browser;
before(async()=>{
 let occupied=false; try {await fetch('http://127.0.0.1:5173');occupied=true;} catch {}
 if(occupied) throw Error('5173 must be free');
 server=spawn(process.execPath,['tools/serve.mjs'],{cwd:ROOT,stdio:'ignore'});
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:5173');break;}catch{} await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch();
});
after(async()=>{if(browser) await browser.close();if(server) server.kill();});
for(const strategy of ['A','B']) test('driver '+strategy+' applies actual chosen item and emits audit',async()=>{
 const context=await browser.newContext();
 try{
 await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
 await context.route('**/api/**',r=>r.abort());
 const page=await context.newPage();
 await page.goto('http://127.0.0.1:5173');
 await page.waitForFunction(()=>!!window.__DBG,null,{polling:100});
 const data=await page.evaluate(async strategy=>{
  const drv=await import('/tools/bot/driver.mjs');
  await drv.setup();await drv.startRun({biomeId:'crypt',characterId:'hunter',difficulty:1,seed:1,strategy,maxSimSec:5});
  const s=window.__BOT.scene;
  const {Weapons,Abilities}=await import('/src/game/content/registry.js');
  const owned=s.player.weapons.map(w=>w.def.id);
  const wanted=s.player.weapons.map(w=>w.def.evolveReq);
  const weapon=Weapons.ids().find(id=>!owned.includes(id)&&!Weapons.get(id).evolved&&!Weapons.get(id).equipped);
  const ability=Abilities.ids().find(id=>!wanted.includes(id));
  s.choice={options:[{kind:'weapon',id:weapon},{kind:'ability',id:ability,def:Abilities.get(ability)}]};
  drv.step(1);
  return {weapon,ability,raw:drv.collect(),weapons:s.player.weapons.map(w=>w.def.id),abilities:s.run.abilities};
 },strategy);
 assert.equal(data.raw.error,undefined);
 assert.equal(data.raw.strategy,strategy);
 assert.equal(data.raw.choiceAudit.divergences,1);
 assert.equal(data.weapons.includes(data.weapon),strategy==='A');
 assert.equal(data.abilities.includes(data.ability),strategy==='B');
 assert.equal(data.raw.choiceAudit[strategy==='A'?'selectedWeapon':'selectedAbility'],1);
 } finally{await context.close();}
});
test('CLI explicit strategies isolate records and reject mismatched/default resumes before writes',()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'bot-ab-'));
 for(const strategy of ['A','B']){
  const out=path.join(parent,strategy);
  const args=['tools/bot/run.mjs','--biomes','crypt','--chars','hunter','--diffs','1','--runs','1','--maxSimSec','2','--out',out];
  const run=extra=>spawnSync(process.execPath,[...args,...extra],{cwd:ROOT,encoding:'utf8',timeout:90000});
  const first=run(['--strategy',strategy]);assert.equal(first.status,0,first.stderr);
  const file=path.join(out,'runs.jsonl');const original=fs.readFileSync(file,'utf8');
  const record=JSON.parse(original.trim());assert.equal(record.strategy,strategy);assert.ok(record.choiceAudit);
  const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));assert.equal(manifest.strategy,strategy);
  assert.match(manifest.commit,/^[a-f0-9]{40}$/);assert.match(manifest.sourceHash,/^[a-f0-9]{64}$/);
  assert.equal(run(['--strategy',strategy]).status,0);
  for(const extra of [[],['--strategy',strategy==='A'?'B':'A'],['--strategy',strategy,'--seed','2']]){
   const mismatch=run(extra);assert.notEqual(mismatch.status,0);assert.match(mismatch.stderr,/manifest|識別|strategy/);
   assert.equal(fs.readFileSync(file,'utf8'),original);
  }
  const failed={...record,result:'error',endReason:'error',error:'synthetic latest attempt failed'};
  fs.appendFileSync(file,JSON.stringify(failed)+'\n');
  const retry=run(['--strategy',strategy]);assert.equal(retry.status,0,retry.stderr);
  const retried=fs.readFileSync(file,'utf8').trim().split(/\r?\n/).map(JSON.parse);
  assert.equal(retried.length,3);assert.notEqual(retried[2].result,'error');
  const sessions=fs.readdirSync(out).filter(f=>f.startsWith('session-')&&f.endsWith('.json'));
  assert.ok(sessions.length>=2);const session=JSON.parse(fs.readFileSync(path.join(out,sessions[0]),'utf8'));
  assert.equal(session.exitCode,0);assert.ok(session.endedAt);assert.ok(session.wallMs>=0);
 }
});

test('CLI failed preflight still records terminal session and real counters',()=>{
 const idsPath=path.join(ROOT,'tools/bot/ids.json');
 const backup=fs.readFileSync(idsPath,'utf8');
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'bot-ab-failed-')),'out');
 try{
  const ids=JSON.parse(backup);ids.chars=ids.chars.slice(0,-1);
  fs.writeFileSync(idsPath,JSON.stringify(ids,null,2)+'\n');
  const result=spawnSync(process.execPath,['tools/bot/run.mjs','--strategy','A','--biomes','crypt','--chars','hunter','--diffs','1','--runs','1','--maxSimSec','2','--out',out],{cwd:ROOT,encoding:'utf8',timeout:90000});
  assert.equal(result.status,2,result.stderr);
  const sessionFile=fs.readdirSync(out).find(f=>f.startsWith('session-')&&f.endsWith('.json'));
  const session=JSON.parse(fs.readFileSync(path.join(out,sessionFile),'utf8'));
  assert.equal(session.exitCode,2);assert.ok(session.endedAt);
  assert.ok(Number.isInteger(session.apiHits),'failed preflight must retain api counter');
  assert.equal(session.browserRestarts,0);
 }finally{fs.writeFileSync(idsPath,backup);}
});
