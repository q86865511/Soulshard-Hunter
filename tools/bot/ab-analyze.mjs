// Read-only collection and statistics; writes only the phase analysis artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { auditCell, experimentPlan, checkManifest } from './experiment.mjs';
import { expandCombos, readJsonlTolerant } from './plan.mjs';
import { metrics, bootstrapDifference, adoption } from './ab-stats.mjs';
import { writeJson, sourceIdentity } from './experiment-io.mjs';
import { readVerifiedInterruptions } from './interruption-evidence.mjs';
import { summarizeSessions } from './session-audit.mjs';
import { summarize } from './summarize.mjs';
import { summarizeGrowth } from './growth-stats.mjs';
import { policyOf } from './strategy/policy.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [outArg,...extra]=process.argv.slice(2);
const verifyOnly=extra.length===1&&extra[0]==='--verify-only';
if(!outArg||(extra.length&&!verifyOnly))throw Error('Usage: node tools/bot/ab-analyze.mjs <phase-out> [--verify-only]');
const out=path.resolve(ROOT,outArg),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const experiment=read(path.join(out,'experiment.json'));
const ids=read(path.join(ROOT,'tools/bot/ids.json'));
const plan=experimentPlan(ids,experiment.phase);
if(experiment.phase==='diagnose')throw Error('use growth-analyze.mjs for diagnostic phase');
const schedule=plan.schedule,labels=plan.arms,candidate=labels[1];
if(experiment.experimentVersion>=2&&(JSON.stringify(experiment.arms)!==JSON.stringify(labels)||experiment.diagnostics!==plan.diagnostics))throw Error('phase profile mismatch');
if(JSON.stringify(schedule)!==JSON.stringify(experiment.schedule)||JSON.stringify(ids.chars)!==JSON.stringify(experiment.chars))throw Error('schedule mismatch');
const progress=read(path.join(out,'progress.json'));
if(progress.status!=='completed')throw Error('experiment not completed');
const interruptions=readVerifiedInterruptions(out);
const arms=Object.fromEntries(labels.map(arm=>[arm,[]])),evidence=[];
let apiHits=0,browserRestarts=0,sessionWallMs=0,rawRows=0,firstStart=Infinity,lastEnd=0;
let failedSessions=0,missingApiCounters=0,missingRestartCounters=0,interruptedSessions=0,missingWallTimes=0;
for(const cell of schedule){
 const dir=path.join(out,cell.id),manifest=read(path.join(dir,'manifest.json'));
 for(const k of ['commit','sourceHash'])if(manifest[k]!==experiment[k])throw Error('identity mismatch '+cell.id+' '+k);
 if((manifest.args.diagnostics??null)!==plan.diagnostics||manifest.strategy!==cell.strategy||manifest.args.seed!==cell.seed||manifest.args.maxSimSec!==1350||manifest.args.parallel!==4||
  manifest.args.runs!==cell.runs||JSON.stringify(manifest.args.biomes)!==JSON.stringify([cell.biome])||
  JSON.stringify(manifest.args.chars)!==JSON.stringify(ids.chars)||JSON.stringify(manifest.args.diffs)!=='[1]')throw Error('parameter mismatch '+cell.id);
 const body=fs.readFileSync(path.join(dir,'runs.jsonl'),'utf8'),parsed=readJsonlTolerant(body);
 const combos=expandCombos({biomes:[cell.biome],chars:ids.chars,diffs:[1],runs:cell.runs});
 const audit=auditCell(parsed.records,combos,manifest);
 if(!audit.complete||parsed.truncatedTail)throw Error('incomplete/invalid '+cell.id+': '+JSON.stringify({...audit,records:undefined}));
 if(fs.readFileSync(path.join(dir,'report.md'),'utf8')!==summarize(audit.records))throw Error('report mismatch '+cell.id);
 const sessions=fs.readdirSync(dir).filter(f=>f.startsWith('session-')&&f.endsWith('.json')).map(f=>({...read(path.join(dir,f)),auditKey:cell.id+'/'+f}));
 for(const s of sessions)if(checkManifest(s.identity,manifest))throw Error('session identity mismatch '+cell.id);
 const accounting=summarizeSessions(sessions,interruptions);
 interruptedSessions+=accounting.interruptedSessions;missingWallTimes+=accounting.missingWallTimes;
 apiHits+=accounting.apiHitsKnown;browserRestarts+=accounting.browserRestartsKnown;sessionWallMs+=accounting.wallMs;
 failedSessions+=accounting.failedSessions;missingApiCounters+=accounting.missingApiCounters;missingRestartCounters+=accounting.missingRestartCounters;
 firstStart=Math.min(firstStart,accounting.firstStart);lastEnd=Math.max(lastEnd,accounting.lastEnd);
 arms[cell.strategy].push(...audit.records);rawRows+=audit.raw;
 evidence.push({cell:cell.id,raw:audit.raw,unique:audit.unique,initialErrors:audit.initialErrors,
  sha256:createHash('sha256').update(body).digest('hex'),sessions:sessions.length,sessionAccounting:accounting});
}
const expected=plan.basePhase==='pilot'?270:4050;
for(const arm of labels)if(arms[arm].length!==expected)throw Error('arm count mismatch');
const stats=Object.fromEntries(labels.map(arm=>[arm,metrics(arms[arm])]));
const ci=plan.basePhase==='confirm'?bootstrapDifference(arms.A,arms[candidate]):null;
const decision=ci?adoption(stats.A,stats[candidate],ci):{adopt:false,reason:'pilot does not determine adoption'};
const choiceAudit=Object.fromEntries(labels.map(arm=>[arm,
 Object.fromEntries(['choices','divergences','selectedAbility','selectedWeapon'].map(k=>[k,arms[arm].reduce((n,r)=>n+r.choiceAudit[k],0)]))]));
const moveAudit=Object.fromEntries(labels.map(arm=>[arm,arms[arm].every(r=>r.moveAudit)?{
 xpWeight:policyOf(arm).xpWeight,...Object.fromEntries(['samples','policyDivergences','xpPresentSamples'].map(k=>[k,arms[arm].reduce((n,r)=>n+r.moveAudit[k],0)]))
}:null]));
if(candidate==='C'&&(!moveAudit.C||moveAudit.C.policyDivergences===0))throw Error('candidate C movement divergence not observed');
const growth=plan.diagnostics?Object.fromEntries(labels.map(arm=>[arm,summarizeGrowth(arms[arm])])):null;
const biomes=Object.fromEntries(ids.biomes.map(biome=>[biome,Object.fromEntries(labels.map(arm=>[arm,metrics(arms[arm].filter(r=>r.biome===biome))]))]));
const analysis={phase:experiment.phase,candidate,commit:experiment.commit,sourceHash:experiment.sourceHash,analysisIdentity:sourceIdentity(ROOT),rawRows,unique:expected*2,
 stats,ci,decision,choiceAudit,moveAudit,growth,biomes,apiHits:missingApiCounters?null:apiHits,apiHitsKnown:apiHits,browserRestarts:missingRestartCounters?null:browserRestarts,browserRestartsKnown:browserRestarts,failedSessions,missingApiCounters,missingRestartCounters,interruptedSessions,missingWallTimes,sessionWallMs:missingWallTimes?null:sessionWallMs,sessionWallMsKnown:sessionWallMs,wallMs:lastEnd-firstStart,
 firstStart:new Date(firstStart).toISOString(),lastEnd:new Date(lastEnd).toISOString(),evidence};
if(!verifyOnly)writeJson(path.join(out,'analysis.json'),analysis);
const pct=x=>x==null?'N/A':(100*x).toFixed(2)+'%';
const pp=x=>x==null?'N/A':(100*x).toFixed(2)+' pp';
const apiLabel=(missingApiCounters?'≥':'')+apiHits;
const restartLabel=(missingRestartCounters?'≥':'')+browserRestarts;
const nums=a=>a.map(x=>x==null?'N/A':x.toFixed(2)).join(' / ');
let md='# Bot 策略 A/'+candidate+' '+experiment.phase+'\n\n';
md+='本報告量的是系統性質，不代表真人退出與重試行為。遊戲 RNG 不受控，兩組是獨立抽樣。策略等級：固定規則走位、懂進化；'+(candidate==='C'?'A/C 選擇規則一致，C 僅將 XP 走位吸引權重 1→1.5':'A 優先新武器，B 優先一般被動')+'；event/curse 固定第一項，shop 不買。\n\n';
md+='執行 commit：'+experiment.commit+'；來源 SHA256：'+experiment.sourceHash+'。\n\n';
md+='| 策略 | 全局 n | 有效 | clear | 通關率（有效） | 通關率（全局） | 排除比例 | time p25/p50/p75 秒 | level p25/p50/p75 | abilities 空（有效／全局） |\n|---|---:|---:|---:|---:|---:|---:|---|---|---|\n';
for(const arm of labels){const s=stats[arm];md+=`| ${arm} | ${s.n} | ${s.effective} | ${s.clear} | ${pct(s.rate)} | ${pct(s.allRate)} | ${pct(s.excludedRate)} | ${nums(s.time)} | ${nums(s.level)} | ${s.emptyAbilities}/${s.effective}；${s.emptyAbilitiesAll}/${s.n} |\n`;}
md+='\n原始行 '+rawRows+'；唯一 key '+expected*2+'；api_hits='+apiLabel+'；browser_restarts='+restartLabel+'；起訖 '+analysis.firstStart+' → '+analysis.lastEnd+'；實際跨度 '+(analysis.wallMs/60000).toFixed(2)+' 分鐘（含人工暫停）；session 已知累計 '+(missingWallTimes?'≥':'')+(sessionWallMs/60000).toFixed(2)+' 分鐘。\n';
md+='\n分析版本：'+analysis.analysisIdentity.commit+'；分析來源 SHA256：'+analysis.analysisIdentity.sourceHash+'。\n';
if(missingApiCounters||missingRestartCounters)md+='\n計數限制：'+failedSessions+' 個 session 非成功結束（含外部中止）；其中 API／重開計數各有 '+missingApiCounters+'／'+missingRestartCounters+' 個 session 無完整終態計數。上列 ≥ 是已知下界，不是完整總數；未將未知值補成 0。所有最終 run 記錄仍須完整且無 error。\n';
if(interruptedSessions)md+='\n人工中止：'+interruptedSessions+' 個 session 經 PID、格位、暫停快照與 SHA256 證據核對。'+missingWallTimes+' 筆精確執行時長未知；未捏造退出碼、結束時間或把未知計數補成 0。原 session 與 run 檔案保持原樣。\n';
md+='\n## 選擇稽核與 endReason\n\n';
md+='移動稽核：'+JSON.stringify(moveAudit)+'。null 表示舊批次未記錄，不是零分歧。\n\n';
if(candidate==='C')md+='choiceAudit 記錄既有 A/B 選項對照；A/C 共用 A 選擇規則，C 的操弄證據在 moveAudit。同一輸入分別計算 A/C 的方向，每秒取樣，只有正式策略輸出會驅動角色。\n\n';
for(const arm of labels)md+=arm+'：choiceAudit '+JSON.stringify(choiceAudit[arm])+'；result '+JSON.stringify(stats[arm].result)+'；endReason '+JSON.stringify(stats[arm].endReason)+'；clear endReason '+JSON.stringify(stats[arm].clearEndReason)+'。\n\n';
md+='## 逐生態\n\n| 生態 | 策略 | n／有效 | clear | 有效率／全局率 | time p25/p50/p75 | level p25/p50/p75 | abilities 空／有效 | endReason |\n|---|---|---:|---:|---|---|---|---|---|\n';
for(const [biome,values] of Object.entries(biomes))for(const [arm,s] of Object.entries(values))
 md+=`| ${biome} | ${arm} | ${s.n}/${s.effective} | ${s.clear} | ${pct(s.rate)} / ${pct(s.allRate)} | ${nums(s.time)} | ${nums(s.level)} | ${s.emptyAbilities}/${s.effective} | ${JSON.stringify(s.endReason)} |\n`;
if(growth){
 md+='\n## 次要成長診斷\n\n本區用於理解機制，不取代主要採用門檻。\n\n';
 md+='| 策略 | XP 收集率 | XP 過期率 | 收集平均延遲秒 | 全局 kills/分 |\n|---|---:|---:|---:|---:|\n';
 for(const arm of labels){const g=growth[arm];md+='| '+arm+' | '+pct(g.xp.collectionFraction)+' | '+pct(g.xp.expiredFraction)+' | '+nums([g.collectionDelayMean])+' | '+nums([g.killsPerMinute])+' |\n';}
 md+='\n| 共同秒窗 | 策略 | 在險局數 | 暴露秒 | XP 掉落/分 | XP 收集/分 | 升級/分 |\n|---|---|---:|---:|---:|---:|---:|\n';
 for(let i=0;i<4;i++)for(const arm of labels){const w=growth[arm].windows[i];md+='| '+w.start+'–'+w.end+' | '+arm+' | '+w.atRisk+' | '+nums([w.exposureSeconds])+' | '+nums([w.xpSpawnedPerMinute])+' | '+nums([w.xpCollectedPerMinute])+' | '+nums([w.levelsPerMinute])+' |\n';}
}
md+='\n## 判定\n\n';
if(ci){
 md+=candidate+'−A 有效局通關率差：'+pp(stats[candidate].rate-stats.A.rate)+'；95% CI '+nums(ci.effective?.map(x=>100*x)||[])+' pp。全局差 '+pp(stats[candidate].allRate-stats.A.allRate)+'；95% CI '+nums(ci.all?.map(x=>100*x)||[])+' pp。\n\n';
 md+='生態×角色分層、兩組分別重抽樣，'+ci.iterations+' 次，分析 seed='+ci.seed+'。遊戲 RNG 不受控，不能當作同世界配對或真人成效。\n\n';
 md+='預先固定門檻：有效率至少 +1pp、CI 下界 >0、全局方向一致、'+candidate+' 排除率不增加。逐門檻：'+JSON.stringify(decision.gates)+'。結論：'+(decision.adopt?candidate+' 符合採用門檻。':'保留 A；本次 '+candidate+' 未通過全部採用門檻，這不代表已證明等效。')+'\n';
}else md+='先導僅檢查分派、資料隔離與耗時，不作採用判定。依 540 局 session 實耗線性估計 8100 局約 '+(sessionWallMs/60000*15).toFixed(1)+' 分鐘；這只是排程參考，局長與 RNG 會變動。\n';
md+='\n原始失敗與各 cell SHA256／執行次數見 analysis.json evidence；先導與確認資料未合併。\n';
if(!verifyOnly)fs.writeFileSync(path.join(out,'analysis.md'),md,'utf8');
process.stdout.write(JSON.stringify({...analysis,biomes:undefined,evidence:undefined},null,2)+'\n');
