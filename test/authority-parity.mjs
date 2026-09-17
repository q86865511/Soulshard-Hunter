import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {ROOT,staticFixtureServer} from './authority-test-server.mjs';
const server=await staticFixtureServer();let browser;
try{
 // One bounded fixture, no background game loop, no backend or real accounts.
 browser=await chromium.launch();
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.route('**/*',route=>new URL(route.request().url()).origin===server.origin?route.continue():route.abort());
 await context.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(server.origin,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>!!window.__DBG||!!window.__GAME_ERROR__,null,{polling:100});
 assert.equal(await page.evaluate(()=>window.__GAME_ERROR__||null),null);
 const actual=await page.evaluate(async()=>{const {authorityParityFixture}=await import('/test/authority-parity-fixture.mjs');return authorityParityFixture();});
 const node=spawnSync(process.execPath,['server/test/authority-parity-node.mjs'],{cwd:ROOT,encoding:'utf8',timeout:30000});
 assert.equal(node.status,0,node.stderr);
 const expected=JSON.parse(node.stdout.trim().split('\n').at(-1));
 fs.mkdirSync(new URL('../.pipeline/',import.meta.url),{recursive:true});
 fs.writeFileSync(new URL('../.pipeline/authority-parity-comparison.json',import.meta.url),JSON.stringify({browser:actual,node:expected,errors}));
 const canonical = data => {
  const out=structuredClone(data);assert.equal(new Set(out.defs).size,63);
  for(const checkpoint of out.checkpoints)for(const enemy of checkpoint.snap.en){assert.ok(Number.isInteger(enemy[1])&&out.defs[enemy[1]],'valid wire definition index');enemy[1]=out.defs[enemy[1]];}
  out.defs.sort();return out;
 };
 assert.deepEqual(canonical(actual),canonical(expected),'browser and native simulation must match after resolving their wire definition tables');
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks:2,checkpoints:actual.checkpoints.length,dt:1/120,audio:'muted in both environments; sound noise consumes gameplay RNG when enabled',wire:'definition indices resolved through each runstart table',scope:'same game code, same seeded test inputs: movement/dash/damage/XP/choices/terminal/snapshots',matched:true}));
}finally{await browser?.close();await server.close();}
