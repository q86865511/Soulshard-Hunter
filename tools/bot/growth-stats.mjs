import {validateGrowthDiagnostic} from './growth-diagnostics.mjs';
import {quantile} from './ab-stats.mjs';
const ratio=(a,b)=>b>0?a/b:null;
const rate=(a,seconds)=>seconds>0?a/seconds*60:null;
const total=(rows,fn)=>rows.reduce((sum,r)=>sum+fn(r),0);
const addMap=(target,source)=>{for(const[k,v]of Object.entries(source||{}))target[k]=(target[k]||0)+v;};
export function summarizeGrowth(records){
 for(const r of records){const errors=validateGrowthDiagnostic(r.diagnostics);if(errors.length)throw Error('invalid diagnostic: '+errors.join(','));}
 const exposure=total(records,r=>r.time),kills=total(records,r=>r.kills);
 const xp={initial:0,spawned:0,collected:0,expired:0,other:0,remaining:0,valueAdjustments:0,credited:0,outsideGainDelta:0};
 const choices={panels:0,offered:{},panelsWith:{},selected:{},differentUpgradeLevels:0,comparedUpgradeChoices:0,selectedLowest:0,selectedHighest:0};
 const motion={samples:0,safeGate:0,xpVisibleSamples:0,eligibleXp:0,eligibleOther:0,towardXp:0,nearestXpDistanceSum:0};
 let delaySum=0,delayCount=0;const intervals=[];
 for(const r of records){
  const d=r.diagnostics,p=d.pickups.xp;
  for(const key of ['initial','spawned','collected','expired','other','remaining'])xp[key]+=p[key].value;
  xp.valueAdjustments+=p.valueAdjustments;xp.credited+=d.xp.credited;xp.outsideGainDelta+=d.xp.outsideGainDelta;
  choices.panels+=d.choices.panels;for(const key of ['offered','panelsWith','selected'])addMap(choices[key],d.choices[key]);
  for(const event of d.choiceEvents){
   const levels=event.options.filter(o=>o.kind==='weaponup'&&Number.isFinite(o.level)).map(o=>o.level);
   if(new Set(levels).size>1){choices.differentUpgradeLevels++;
    if(event.chosen.kind==='weaponup'){choices.comparedUpgradeChoices++;if(event.chosen.levelBefore===Math.min(...levels))choices.selectedLowest++;if(event.chosen.levelBefore===Math.max(...levels))choices.selectedHighest++;}}
  }
  addMap(motion,d.motion);delaySum+=d.collectionDelay.sum;delayCount+=d.collectionDelay.count;
  intervals.push(...d.levels.map(e=>e.interval));
 }
 const supply=xp.initial+xp.spawned+xp.valueAdjustments;
 Object.assign(xp,{collectionFraction:ratio(xp.collected,supply),expiredFraction:ratio(xp.expired,supply),remainingFraction:ratio(xp.remaining,supply),
  spawnedPerMinute:rate(xp.spawned,exposure),collectedPerMinute:rate(xp.collected,exposure)});
 Object.assign(motion,{safeFraction:ratio(motion.safeGate,motion.samples),towardXpFraction:ratio(motion.towardXp,motion.xpVisibleSamples),
  otherPerEligibleXp:ratio(motion.eligibleOther,motion.eligibleXp),meanNearestXpDistance:ratio(motion.nearestXpDistanceSum,motion.xpVisibleSamples)});
 choices.offeredPanelFraction=Object.fromEntries(Object.entries(choices.panelsWith).map(([k,v])=>[k,ratio(v,choices.panels)]));
 const closest=(samples,time)=>{const best=samples.reduce((p,s)=>!p||Math.abs(s.time-time)<Math.abs(p.time-time)?s:p,null);return best&&Math.abs(best.time-time)<0.02?best:null;};
 const windows=[0,30,60,90].map(start=>{
  const w={start,end:start+30,atRisk:0,exposureSeconds:0,kills:0,xpSpawned:0,xpCollected:0,xpExpired:0,levelsGained:0};
  for(const r of records){
   if(r.time<=start+1e-7)continue;
   const samples=r.diagnostics.snapshots;
   const first=closest(samples,start);
   const end=Math.min(r.time,start+30);
   const last=closest(samples,end);
   if(!first||!last)throw Error('diagnostic common-window sample missing');
   w.atRisk++;w.exposureSeconds+=last.time-first.time;
   for(const key of ['kills','xpSpawned','xpCollected','xpExpired'])w[key]+=last[key]-first[key];
   w.levelsGained+=last.level-first.level;
  }
  return {...w,killsPerMinute:rate(w.kills,w.exposureSeconds),xpSpawnedPerMinute:rate(w.xpSpawned,w.exposureSeconds),
   xpCollectedPerMinute:rate(w.xpCollected,w.exposureSeconds),levelsPerMinute:rate(w.levelsGained,w.exposureSeconds)};
 });
 return {n:records.length,exposureSeconds:exposure,kills,killsPerMinute:rate(kills,exposure),xp,choices,motion,
  collectionDelayMean:ratio(delaySum,delayCount),levelInterval:[0.25,0.5,0.75].map(p=>quantile(intervals,p)),
  finalLevel:[0.25,0.5,0.75].map(p=>quantile(records.map(r=>r.level),p)),windows};
}
