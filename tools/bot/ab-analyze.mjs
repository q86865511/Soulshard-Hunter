// Read-only collection and statistics; writes only the phase analysis artifacts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { auditCell, makeSchedule, checkManifest } from './experiment.mjs';
import { expandCombos, readJsonlTolerant } from './plan.mjs';
import { metrics, bootstrapDifference, adoption } from './ab-stats.mjs';
import { writeJson, sourceIdentity } from './experiment-io.mjs';
import { summarizeSessions } from './session-audit.mjs';
import { summarize } from './summarize.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [outArg,...extra]=process.argv.slice(2);
if(!outArg||extra.length)throw Error('Usage: node tools/bot/ab-analyze.mjs <phase-out>');
const out=path.resolve(ROOT,outArg),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const experiment=read(path.join(out,'experiment.json'));
const ids=read(path.join(ROOT,'tools/bot/ids.json'));
const schedule=makeSchedule(ids,experiment.phase);
if(JSON.stringify(schedule)!==JSON.stringify(experiment.schedule)||JSON.stringify(ids.chars)!==JSON.stringify(experiment.chars))throw Error('schedule mismatch');
const progress=read(path.join(out,'progress.json'));
if(progress.status!=='completed')throw Error('experiment not completed');
const arms={A:[],B:[]},evidence=[];
let apiHits=0,browserRestarts=0,sessionWallMs=0,rawRows=0,firstStart=Infinity,lastEnd=0;
let failedSessions=0,missingApiCounters=0,missingRestartCounters=0;
for(const cell of schedule){
 const dir=path.join(out,cell.id),manifest=read(path.join(dir,'manifest.json'));
 for(const k of ['commit','sourceHash'])if(manifest[k]!==experiment[k])throw Error('identity mismatch '+cell.id+' '+k);
 if(manifest.strategy!==cell.strategy||manifest.args.seed!==cell.seed||manifest.args.maxSimSec!==1350||manifest.args.parallel!==4||
  manifest.args.runs!==cell.runs||JSON.stringify(manifest.args.biomes)!==JSON.stringify([cell.biome])||
  JSON.stringify(manifest.args.chars)!==JSON.stringify(ids.chars)||JSON.stringify(manifest.args.diffs)!=='[1]')throw Error('parameter mismatch '+cell.id);
 const body=fs.readFileSync(path.join(dir,'runs.jsonl'),'utf8'),parsed=readJsonlTolerant(body);
 const combos=expandCombos({biomes:[cell.biome],chars:ids.chars,diffs:[1],runs:cell.runs});
 const audit=auditCell(parsed.records,combos,manifest);
 if(!audit.complete||parsed.truncatedTail)throw Error('incomplete/invalid '+cell.id+': '+JSON.stringify({...audit,records:undefined}));
 if(fs.readFileSync(path.join(dir,'report.md'),'utf8')!==summarize(audit.records))throw Error('report mismatch '+cell.id);
 const sessions=fs.readdirSync(dir).filter(f=>f.startsWith('session-')&&f.endsWith('.json')).map(f=>read(path.join(dir,f)));
 for(const s of sessions)if(checkManifest(s.identity,manifest))throw Error('session identity mismatch '+cell.id);
 const accounting=summarizeSessions(sessions);
 apiHits+=accounting.apiHitsKnown;browserRestarts+=accounting.browserRestartsKnown;sessionWallMs+=accounting.wallMs;
 failedSessions+=accounting.failedSessions;missingApiCounters+=accounting.missingApiCounters;missingRestartCounters+=accounting.missingRestartCounters;
 firstStart=Math.min(firstStart,accounting.firstStart);lastEnd=Math.max(lastEnd,accounting.lastEnd);
 arms[cell.strategy].push(...audit.records);rawRows+=audit.raw;
 evidence.push({cell:cell.id,raw:audit.raw,unique:audit.unique,initialErrors:audit.initialErrors,
  sha256:createHash('sha256').update(body).digest('hex'),sessions:sessions.length,sessionAccounting:accounting});
}
const expected=experiment.phase==='pilot'?270:4050;
for(const arm of ['A','B'])if(arms[arm].length!==expected)throw Error('arm count mismatch');
const stats={A:metrics(arms.A),B:metrics(arms.B)};
const ci=experiment.phase==='confirm'?bootstrapDifference(arms.A,arms.B):null;
const decision=ci?adoption(stats.A,stats.B,ci):{adopt:false,reason:'pilot does not determine adoption'};
const choiceAudit=Object.fromEntries(['A','B'].map(arm=>[arm,
 Object.fromEntries(['choices','divergences','selectedAbility','selectedWeapon'].map(k=>[k,arms[arm].reduce((n,r)=>n+r.choiceAudit[k],0)]))]));
const biomes=Object.fromEntries(ids.biomes.map(biome=>[biome,Object.fromEntries(['A','B'].map(arm=>[arm,metrics(arms[arm].filter(r=>r.biome===biome))]))]));
const analysis={phase:experiment.phase,commit:experiment.commit,sourceHash:experiment.sourceHash,analysisIdentity:sourceIdentity(ROOT),rawRows,unique:expected*2,
 stats,ci,decision,choiceAudit,biomes,apiHits:missingApiCounters?null:apiHits,apiHitsKnown:apiHits,browserRestarts:missingRestartCounters?null:browserRestarts,browserRestartsKnown:browserRestarts,failedSessions,missingApiCounters,missingRestartCounters,sessionWallMs,wallMs:lastEnd-firstStart,
 firstStart:new Date(firstStart).toISOString(),lastEnd:new Date(lastEnd).toISOString(),evidence};
writeJson(path.join(out,'analysis.json'),analysis);
const pct=x=>x==null?'N/A':(100*x).toFixed(2)+'%';
const apiLabel=(missingApiCounters?'≥':'')+apiHits;
const restartLabel=(missingRestartCounters?'≥':'')+browserRestarts;
const nums=a=>a.map(x=>x==null?'N/A':x.toFixed(2)).join(' / ');
let md='# Bot 策略 A/B '+experiment.phase+'\n\n';
md+='本報告量的是系統性質，不代表真人退出與重試行為。遊戲 RNG 不受控，兩組是獨立抽樣。策略等級：固定走位、懂進化；A 優先新武器，B 優先一般被動；event/curse 固定第一項，shop 不買。\n\n';
md+='執行 commit：'+experiment.commit+'；來源 SHA256：'+experiment.sourceHash+'。\n\n';
md+='| 策略 | 全局 n | 有效 | clear | 通關率（有效） | 通關率（全局） | 排除比例 | time p25/p50/p75 秒 | level p25/p50/p75 | abilities 空（有效／全局） |\n|---|---:|---:|---:|---:|---:|---:|---|---|---|\n';
for(const arm of ['A','B']){const s=stats[arm];md+=`| ${arm} | ${s.n} | ${s.effective} | ${s.clear} | ${pct(s.rate)} | ${pct(s.allRate)} | ${pct(s.excludedRate)} | ${nums(s.time)} | ${nums(s.level)} | ${s.emptyAbilities}/${s.effective}；${s.emptyAbilitiesAll}/${s.n} |\n`;}
md+='\n原始行 '+rawRows+'；唯一 key '+expected*2+'；api_hits='+apiLabel+'；browser_restarts='+restartLabel+'；起訖 '+analysis.firstStart+' → '+analysis.lastEnd+'；實際跨度 '+(analysis.wallMs/60000).toFixed(2)+' 分鐘；session 累計 '+(sessionWallMs/60000).toFixed(2)+' 分鐘。\n';
md+='\n分析版本：'+analysis.analysisIdentity.commit+'；分析來源 SHA256：'+analysis.analysisIdentity.sourceHash+'。\n';
if(missingApiCounters||missingRestartCounters)md+='\n計數限制：'+failedSessions+' 個 session 非零退出；其中 API／重開計數各有 '+missingApiCounters+'／'+missingRestartCounters+' 個歷史失敗 session 未記錄。上列 ≥ 是已知下界，不是完整總數；未將未知值補成 0。所有最終 run 記錄仍須完整且無 error。\n';
md+='\n## 選擇稽核與 endReason\n\n';
for(const arm of ['A','B'])md+=arm+'：choiceAudit '+JSON.stringify(choiceAudit[arm])+'；result '+JSON.stringify(stats[arm].result)+'；endReason '+JSON.stringify(stats[arm].endReason)+'；clear endReason '+JSON.stringify(stats[arm].clearEndReason)+'。\n\n';
md+='## 逐生態\n\n| 生態 | 策略 | n／有效 | clear | 有效率／全局率 | time p25/p50/p75 | level p25/p50/p75 | abilities 空／有效 | endReason |\n|---|---|---:|---:|---|---|---|---|---|\n';
for(const [biome,values] of Object.entries(biomes))for(const [arm,s] of Object.entries(values))
 md+=`| ${biome} | ${arm} | ${s.n}/${s.effective} | ${s.clear} | ${pct(s.rate)} / ${pct(s.allRate)} | ${nums(s.time)} | ${nums(s.level)} | ${s.emptyAbilities}/${s.effective} | ${JSON.stringify(s.endReason)} |\n`;
md+='\n## 判定\n\n';
if(ci){
 md+='B−A 有效局通關率差：'+pct(stats.B.rate-stats.A.rate)+'（百分點）；95% CI '+nums(ci.effective?.map(x=>100*x)||[])+' pp。全局差 '+pct(stats.B.allRate-stats.A.allRate)+'；95% CI '+nums(ci.all?.map(x=>100*x)||[])+' pp。\n\n';
 md+='生態×角色分層、兩組分別重抽樣，'+ci.iterations+' 次，分析 seed='+ci.seed+'。遊戲 RNG 不受控，不能當作同世界配對或真人成效。\n\n';
 md+='預先固定門檻：有效率至少 +1pp、CI 下界 >0、全局方向一致、B 排除率不增加。逐門檻：'+JSON.stringify(decision.gates)+'。結論：'+(decision.adopt?'B 符合採用門檻。':'保留 A；本次 B 未通過全部採用門檻，這不代表已證明等效。')+'\n';
}else md+='先導僅檢查分派、資料隔離與耗時，不作採用判定。依 540 局 session 實耗線性估計 8100 局約 '+(sessionWallMs/60000*15).toFixed(1)+' 分鐘；這只是排程參考，局長與 RNG 會變動。\n';
md+='\n原始失敗與各 cell SHA256／執行次數見 analysis.json evidence；先導與確認資料未合併。\n';
fs.writeFileSync(path.join(out,'analysis.md'),md,'utf8');
process.stdout.write(JSON.stringify({...analysis,biomes:undefined,evidence:undefined},null,2)+'\n');
