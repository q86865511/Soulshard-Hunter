import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {policyOf} from '../strategy/policy.mjs';
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
async function runPage(strategy,action){
 const context=await browser.newContext();
 try{
  await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.cancelAnimationFrame=()=>{};});
  await context.route('**/api/**',r=>r.abort());
  const page=await context.newPage();await page.goto('http://127.0.0.1:5173');
  await page.waitForFunction(()=>!!window.__DBG,null,{polling:100});
  await page.evaluate(async strategy=>{
   window.__drv=await import('/tools/bot/driver.mjs');await __drv.setup();
   await __drv.startRun({biomeId:'crypt',characterId:'hunter',difficulty:1,seed:1,strategy,maxSimSec:1});
  },strategy);
  return await action(page);
 }finally{await context.close();}
}
for(const strategy of ['A','C'])test('actual driver input '+strategy+' uses the declared XP weight',async()=>{
 const result=await runPage(strategy,page=>page.evaluate(()=>{
  const s=__BOT.scene,w=s.world;w.pickups.length=0;w.enemies.length=0;w.solidAt=()=>false;
  w.addPickup('xp',s.player.x+100,s.player.y,1);
  w.addPickup('gold',s.player.x-80,s.player.y,1);
  __drv.step(1);
  return {input:w.inputFor(s.player),raw:__drv.collect()};
 }));
 assert.deepEqual(result.raw.policy,policyOf(strategy));
 assert.equal(result.raw.moveAudit.xpWeight,policyOf(strategy).xpWeight);
 assert.equal(result.raw.moveAudit.samples,1);assert.equal(result.raw.moveAudit.policyDivergences,1);
 assert.ok(strategy==='C'?result.input.move.x>0:result.input.move.x<0);
});
test('C uses A choice priorities in the actual game',async()=>{
 const result=await runPage('C',page=>page.evaluate(async()=>{
  const s=__BOT.scene,{Weapons,Abilities}=await import('/src/game/content/registry.js');
  const owned=s.player.weapons.map(w=>w.def.id),wanted=s.player.weapons.map(w=>w.def.evolveReq);
  const weapon=Weapons.ids().find(id=>!owned.includes(id)&&!Weapons.get(id).evolved&&!Weapons.get(id).equipped);
  const ability=Abilities.ids().find(id=>!wanted.includes(id));
  s.choice={options:[{kind:'weapon',id:weapon},{kind:'ability',id:ability,def:Abilities.get(ability)}]};
  __drv.step(1);return {weapon,ability,weapons:s.player.weapons.map(w=>w.def.id),abilities:s.run.abilities,raw:__drv.collect()};
 }));
 assert.ok(result.weapons.includes(result.weapon));assert.ok(!result.abilities.includes(result.ability));
 assert.equal(result.raw.choiceAudit.selectedWeapon,1);
});
test('C CLI records policy, movement audit and growth schema; wrong policy cannot resume',()=>{
 const out=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'bot-c-')),'out');
 const args=['tools/bot/run.mjs','--biomes','crypt','--chars','hunter','--diffs','1','--runs','1','--maxSimSec','2','--out',out,'--diagnostics','growth-v1'];
 const run=strategy=>spawnSync(process.execPath,[...args,'--strategy',strategy],{cwd:ROOT,encoding:'utf8',timeout:90000});
 const result=run('C');assert.equal(result.status,0,result.stderr);
 const file=path.join(out,'runs.jsonl'),body=fs.readFileSync(file,'utf8'),r=JSON.parse(body.trim());
 assert.equal(r.strategy,'C');assert.deepEqual(r.policy,policyOf('C'));assert.equal(r.moveAudit.samples,Math.ceil(r.ticks/120));
 assert.deepEqual(validateGrowthDiagnostic(r.diagnostics),[]);
 const manifest=JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8'));
 assert.equal(manifest.experimentVersion,2);assert.deepEqual(manifest.profile,policyOf('C'));
 assert.equal(run('C').status,0);assert.notEqual(run('A').status,0);assert.equal(fs.readFileSync(file,'utf8'),body);
});
