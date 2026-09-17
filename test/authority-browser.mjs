import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ROOT,staticFixtureServer} from './authority-test-server.mjs';
const staticServer=await staticFixtureServer();
process.env.SOULSHARD_NO_LISTEN='1';
process.env.JWT_SECRET='authority-browser-local-fixture-only-2026';
process.env.CORS_ORIGIN=staticServer.origin;
const {buildApp}=await import('../server/src/server.js');
const {makeFakePool}=await import('../server/test/fakepool.mjs');
const {attachRealtime}=await import('../server/src/wsgw.js');
const pool=makeFakePool(),app=await buildApp(pool,{rateMax:10000});
await app.listen({port:0,host:'127.0.0.1'});
const api='http://127.0.0.1:'+app.server.address().port;
const wss=attachRealtime(app.server,app.realtime,{jwtSecret:process.env.JWT_SECRET});
let browser,checks=0;const errors=[];
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const base={version:2,slot:0,saveSeq:10,gold:0,talents:{},facilities:{},forge:{},settings:{muted:true,analytics:false},tutorialDone:true,tutorialHUDDone:true};
async function register(username){
 const r=await app.inject({method:'POST',url:'/api/register',payload:{username,password:'OnlyLocalFixture123!'}});
 assert.equal(r.statusCode,200);
 const account=r.json();await pool.query('INSERT INTO saves(user_id,meta,save_version) VALUES($1,$2,$3)',[account.user.id,structuredClone(base),2]);return account;
}
async function pageFor(account){
 const ctx=await browser.newContext({viewport:{width:1280,height:720}});
 await ctx.route('**/*',route=>[staticServer.origin,api].includes(new URL(route.request().url()).origin)?route.continue():route.abort());
 await ctx.addInitScript(({account,base,api})=>{
  window.requestAnimationFrame=()=>0;
  localStorage.setItem('soulshard.jwt',account.token);localStorage.setItem('soulshard.user',JSON.stringify(account.user));
  localStorage.setItem('soulshard.api',api);localStorage.setItem('soulshard.save.v1.slot0',JSON.stringify(base));
 },{account,base,api});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(staticServer.origin,{waitUntil:'domcontentloaded'});
 await boot(page);return page;
}
async function boot(page){
 await page.waitForFunction(()=>!!window.__DBG||!!window.__GAME_ERROR__,null,{polling:50});
 assert.equal(await page.evaluate(()=>window.__GAME_ERROR__||null),null);
 await page.evaluate(async()=>{window.__RT=(await import('/src/net/rt.js')).RT;__RT.ensure();});
 await page.waitForFunction(()=>__RT.isConnected()&&!!__RT.selfCid,null,{polling:50});
}
async function inWorld(page){
 await page.waitForFunction(()=>{__DBG.pump(1,1/30);return !!__DBG.scene().guest&&__DBG.scene()._gotSnap;},null,{polling:50,timeout:10000});
}
try{
 const accounts=[await register('authorityone'),await register('authoritytwo')];
 browser=await chromium.launch();
 const a=await pageFor(accounts[0]),b=await pageFor(accounts[1]);
 await a.evaluate(()=>__RT.createRoom({charId:'hunter',weaponId:'w_soulbolt'}));
 await a.waitForFunction(()=>!!__RT.room,null,{polling:50});
 const code=await a.evaluate(()=>__RT.room.code);
 await b.evaluate(code=>__RT.joinRoom(code),code);
 await b.waitForFunction(()=>__RT.room?.members.length===2,null,{polling:50});
 await b.evaluate(()=>{__RT.setBuild('ranger','w_homing');__RT.setReady(true);});
 await a.waitForFunction(()=>__RT.room?.members.some(m=>!m.host&&m.ready),null,{polling:50});
 await a.evaluate(()=>__RT.startRun());
 await Promise.all([inWorld(a),inWorld(b)]);
 ok(await a.evaluate(()=>__DBG.scene().authority&&!__DBG.scene().coop&&!!__DBG.scene().guest),'lobby owner is now a snapshot client');
 ok(await b.evaluate(()=>__DBG.scene().authority&&__DBG.scene().players.length===2),'guest receives real two-player world');
 await a.keyboard.press('Escape');await a.evaluate(()=>__DBG.pump(1,1/30));
 ok(await a.evaluate(()=>__DBG.scene().coopMenu&&!!__RT.room),'Escape preserves the original non-blocking host leave menu');
 await a.keyboard.press('Escape');await a.evaluate(()=>__DBG.pump(1,1/30));
 const runId=await a.evaluate(()=>__DBG.scene().runId);
 ok(runId===await b.evaluate(()=>__DBG.scene().runId),'same server run identity');
 await a.evaluate(()=>{window._startX=__DBG.scene().self.netX;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyD',key:'d'}));});
 await a.waitForFunction(()=>{__DBG.pump(1,1/30);return Math.abs(__DBG.scene().self.netX-window._startX)>4;},null,{polling:30,timeout:3000});
 await a.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyD',key:'d'})));
 ok(true,'owner keyboard input moves server avatar and reconciles snapshot');
 await a.evaluate(()=>{__RT.send({t:'runend',won:true,score:999999});__RT.send({t:'snap',pl:[]});});
 await b.evaluate(()=>__DBG.pump(1,1/30));
 ok(!app.realtime.rooms.get(code).runEnded,'forged browser terminal message is ignored');
 const oldCid=await a.evaluate(()=>__RT.selfCid);
 await a.reload({waitUntil:'domcontentloaded'});await boot(a);await inWorld(a);
 const newCid=await a.evaluate(()=>__RT.selfCid);
 ok(newCid!==oldCid,'reload makes a fresh authenticated connection');
 ok(await a.evaluate(()=>__DBG.scene().self.cid===__RT.selfCid&&__DBG.scene().self.isSelf),'reload resumes original actor rather than a new world');
 ok(runId===await a.evaluate(()=>__DBG.scene().runId),'reload preserves run identity');
 await b.evaluate(()=>__DBG.pump(1,1/30));
 fs.mkdirSync(new URL('../.pipeline/',import.meta.url),{recursive:true});
 await b.screenshot({path:fileURLToPath(new URL('../.pipeline/authority-coop-client.png',import.meta.url))});
 await a.evaluate(()=>__RT.leaveRoom());
 await b.waitForFunction(()=>{__DBG.pump(1,1/30);return __RT.room?.hostCid===__RT.selfCid;},null,{polling:50});
 ok(await b.evaluate(()=>!__DBG.scene().migrated&&!__DBG.scene().hostWaiting&&!__DBG.scene().runOver),'remaining client keeps its live world after original owner leaves');
 await b.evaluate(()=>__RT.leaveRoom());
 await b.waitForFunction(()=>{__DBG.pump(1,1/30);return __DBG.scene().hostGone;},null,{polling:50});
 ok(app.realtime.authority.rooms.size===0,'last client departure reclaims simulation');
 const receipt=(await app.inject({url:'/api/authority/results',headers:{authorization:'Bearer '+accounts[0].token}})).json();
 ok(receipt.rows.length===1&&receipt.rows[0].run_id===runId&&receipt.rows[0].saved,'last departure persisted one authoritative receipt before process cleanup');
 ok(errors.length===0,'no browser exceptions');
 console.log(JSON.stringify({checks,errors,scope:'two isolated browser accounts, real HTTP/WebSocket gateway and native child, fake local database only'}));
}finally{
 await browser?.close();for(const ws of wss.clients)ws.terminate();await new Promise(r=>wss.close(r));await app.close();await staticServer.close();
}
