import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {makeSchedule,auditCell,checkManifest} from './experiment.mjs';
import {expandCombos,readJsonlTolerant} from './plan.mjs';
import {summarizeGrowth} from './growth-stats.mjs';
import {metrics} from './ab-stats.mjs';
import {summarizeSessions} from './session-audit.mjs';
import {sourceIdentity,writeJson} from './experiment-io.mjs';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const [outArg,...extra]=process.argv.slice(2);
if(!outArg||extra.length)throw Error('Usage: node tools/bot/growth-analyze.mjs <diagnostic-out>');
const out=path.resolve(ROOT,outArg),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const experiment=read(path.join(out,'experiment.json')),progress=read(path.join(out,'progress.json'));
if(experiment.phase!=='diagnose'||progress.status!=='completed')throw Error('diagnostic phase must be completed');
const ids=read(path.join(ROOT,'tools/bot/ids.json')),schedule=makeSchedule(ids,'pilot');
if(JSON.stringify(schedule)!==JSON.stringify(experiment.schedule)||JSON.stringify(ids.chars)!==JSON.stringify(experiment.chars))throw Error('diagnostic schedule mismatch');
const arms={A:[],B:[]},evidence=[],sessions=[];
for(const cell of schedule){
 const dir=path.join(out,cell.id),manifest=read(path.join(dir,'manifest.json'));
 for(const k of ['commit','sourceHash'])if(manifest[k]!==experiment[k])throw Error('source identity mismatch');
 if(manifest.strategy!==cell.strategy||manifest.args.seed!==1||manifest.args.diagnostics!=='growth-v1'||manifest.args.maxSimSec!==1350||
  manifest.args.runs!==1||manifest.args.parallel!==4||JSON.stringify(manifest.args.biomes)!==JSON.stringify([cell.biome])||
  JSON.stringify(manifest.args.chars)!==JSON.stringify(ids.chars)||JSON.stringify(manifest.args.diffs)!=='[1]')throw Error('diagnostic parameter mismatch');
 const body=fs.readFileSync(path.join(dir,'runs.jsonl'),'utf8'),parsed=readJsonlTolerant(body);
 const audit=auditCell(parsed.records,expandCombos({biomes:[cell.biome],chars:ids.chars,diffs:[1],runs:1}),manifest);
 if(!audit.complete||parsed.truncatedTail)throw Error('incomplete diagnostics '+cell.id+': '+audit.errors);
 arms[cell.strategy].push(...audit.records);
 for(const file of fs.readdirSync(dir).filter(f=>f.startsWith('session-')&&f.endsWith('.json'))){
  const session=read(path.join(dir,file));if(checkManifest(session.identity,manifest))throw Error('session identity mismatch');sessions.push(session);
 }
 evidence.push({cell:cell.id,raw:audit.raw,unique:audit.unique,initialErrors:audit.initialErrors,sha256:createHash('sha256').update(body).digest('hex')});
}
for(const arm of ['A','B'])if(arms[arm].length!==270)throw Error('expected 270 per arm');
const stats=Object.fromEntries(['A','B'].map(arm=>[arm,summarizeGrowth(arms[arm])]));
const outcomes=Object.fromEntries(['A','B'].map(arm=>[arm,metrics(arms[arm])]));
const biomes=Object.fromEntries(ids.biomes.map(b=>[b,Object.fromEntries(['A','B'].map(arm=>[arm,summarizeGrowth(arms[arm].filter(r=>r.biome===b))]))]));
const accounting=summarizeSessions(sessions);
const analysis={phase:'diagnose',schema:'growth-v1',execution:{commit:experiment.commit,sourceHash:experiment.sourceHash},analysis:sourceIdentity(ROOT),
 raw:evidence.reduce((n,e)=>n+e.raw,0),unique:540,stats,outcomes,biomes,accounting,evidence};
writeJson(path.join(out,'growth-analysis.json'),analysis);
const f=x=>x==null?'N/A':Number(x).toFixed(2),pct=x=>x==null?'N/A':(x*100).toFixed(2)+'%';
let md='# Bot 成長診斷\n\n本報告量的是固定策略下的系統性質，不代表真人退出或重試行為。遊戲 RNG 不受控，A/B 是獨立世界。這是機制診斷，不用此批通關率作採用判定。\n\n';
md+='執行 '+experiment.commit+'；來源 SHA256 '+experiment.sourceHash+'；分析 '+analysis.analysis.commit+'。\n\n';
md+='| 策略 | n | 掉落 XP | 收集 XP | 逾期 XP | 結束仍在場 | 收集率 | 逾期率 | XP 掉落/分 | XP 收集/分 | kills/分 | 收集平均延遲秒 | 終局 level p25/p50/p75 |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|\n';
for(const arm of ['A','B']){const s=stats[arm],x=s.xp;md+=`| ${arm} | ${s.n} | ${x.spawned} | ${x.collected} | ${x.expired} | ${x.remaining} | ${pct(x.collectionFraction)} | ${pct(x.expiredFraction)} | ${f(x.spawnedPerMinute)} | ${f(x.collectedPerMinute)} | ${f(s.killsPerMinute)} | ${f(s.collectionDelayMean)} | ${s.finalLevel.map(f).join(' / ')} |\n`;}
md+='\n掉落 XP 為實際拾取物值，可能包含竊賊歸還；不是未加成的基礎經驗。收集率分母含初始場上與值調整；生成、收集、逾期、其他移除與剩餘值逐局守恆。XP 入帳另量測，不把非拾取增減硬算成收集。\n\n## 共同早期窗口\n\n';
md+='所有原始局均可貢獻死亡前的實際暴露時間；列出每窗在險局數，不只取活過窗口的人。\n\n| 秒 | 策略 | 在險局數 | 暴露秒 | kills/分 | XP 掉落/分 | XP 收集/分 | 升級/分 |\n|---|---|---:|---:|---:|---:|---:|---:|\n';
for(let i=0;i<4;i++)for(const arm of ['A','B']){const w=stats[arm].windows[i];md+=`| ${w.start}–${w.end} | ${arm} | ${w.atRisk} | ${f(w.exposureSeconds)} | ${f(w.killsPerMinute)} | ${f(w.xpSpawnedPerMinute)} | ${f(w.xpCollectedPerMinute)} | ${f(w.levelsPerMinute)} |\n`;}
md+='\n## 選項供給與移動情境\n\n';
for(const arm of ['A','B']){const s=stats[arm];md+=arm+'：panels '+s.choices.panels+'；offer-panels '+JSON.stringify(s.choices.offeredPanelFraction)+'；selected '+JSON.stringify(s.choices.selected)+'；不同升級等級面板 '+s.choices.differentUpgradeLevels+'，實際選升級 '+s.choices.comparedUpgradeChoices+'（最低 '+s.choices.selectedLowest+'／最高 '+s.choices.selectedHighest+'）。\n\n';
md+='移動每秒取樣 '+s.motion.samples+' 次；安全閘開啟 '+pct(s.motion.safeFraction)+'；看見 XP 時朝向最近 XP '+pct(s.motion.towardXpFraction)+'；合格非 XP/XP 拾取物比例 '+f(s.motion.otherPerEligibleXp)+'；平均最近 XP 距離 '+f(s.motion.meanNearestXpDistance)+'。\n\n';}
md+='## 逐生態\n\n| 生態 | 策略 | n | kills/分 | XP 掉落/分 | 收集率 | 逾期率 | level p50 |\n|---|---|---:|---:|---:|---:|---:|---:|\n';
for(const [biome,groups] of Object.entries(biomes))for(const [arm,s] of Object.entries(groups))
 md+=`| ${biome} | ${arm} | ${s.n} | ${f(s.killsPerMinute)} | ${f(s.xp.spawnedPerMinute)} | ${pct(s.xp.collectionFraction)} | ${pct(s.xp.expiredFraction)} | ${f(s.finalLevel[1])} |\n`;
md+='\n## 完整性與限制\n\n原始 '+analysis.raw+' 行、唯一 540 key、最終 error 0；所有診斷守恆與 schema 通過。session accounting '+JSON.stringify(accounting)+'。\n\n';
md+='觀測是相關線索，不能單憑全局產量認定機制；成長與存活互相影響。共同窗口仍有隨時間變化的在險族群。候選 C 必須在診斷後另行凍結，採用判定使用獨立確認資料。\n';
fs.writeFileSync(path.join(out,'growth-analysis.md'),md,'utf8');
process.stdout.write(JSON.stringify({...analysis,biomes:undefined,evidence:undefined},null,2)+'\n');
