// Pure experiment identity, scheduling and record audit; no Node APIs.
import { keyOf } from './plan.mjs';
import { dedupeLatest } from './preflight.mjs';
import { validateRecord } from './record.mjs';
import { validateGrowthDiagnostic } from './growth-diagnostics.mjs';
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v==='object'
 ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v;
export function checkManifest(existing,current) {
 if(!existing) return 'manifest missing';
 for(const key of Object.keys(current))
  if(JSON.stringify(canonical(existing[key]))!==JSON.stringify(canonical(current[key]))) return 'manifest 識別不符: '+key;
 return null;
}
export function makeSchedule(ids,phase) {
 if(!['pilot','confirm'].includes(phase)) throw Error('unknown phase');
 return (phase==='pilot'?[1]:[1,2,3]).flatMap(seed=>ids.biomes.flatMap((biome,i)=>
  (i%2?['B','A']:['A','B']).map(strategy=>({
   id:`seed-${seed}/${biome}/${strategy}`,biome,strategy,seed,diff:1,runs:phase==='pilot'?1:5,
  }))));
}
export function auditCell(records,combos,manifest) {
 const errors=[];
 const expected=new Set(combos.map(keyOf));
 for(const r of records){
  if(validateRecord(r).length) errors.push('schema');
  for(const k of ['strategy','toolVersion','gameVersion']) if(r[k]!==manifest[k]) errors.push(k);
  if(r.seed!==manifest.args.seed) errors.push('seed');
  if(!expected.has(keyOf(r))) errors.push('extra key');
  if(!['clear','death','timeout','error'].includes(r.result)) errors.push('result');
  if(r.result!=='error'){
   if(manifest.args.diagnostics==='growth-v1')errors.push(...validateGrowthDiagnostic(r.diagnostics));
   if(!Array.isArray(r.abilities)||!Array.isArray(r.weapons)||!Number.isFinite(r.level)||!Number.isFinite(r.simMs)||!Number.isInteger(r.ticks)) errors.push('record fields');
   const a=r.choiceAudit;
   if(!a || !['choices','divergences','selectedAbility','selectedWeapon'].every(k=>Number.isInteger(a[k])&&a[k]>=0)) errors.push('choiceAudit');
   else if(a.divergences>a.choices || a.selectedAbility+a.selectedWeapon!==a.divergences ||
    (r.strategy==='A'?a.selectedAbility!==0:a.selectedWeapon!==0)) errors.push('choiceAudit dispatch');
  }
 }
 const latest=dedupeLatest(records);
 const actual=new Set(latest.map(keyOf));
 const missing=[...expected].filter(k=>!actual.has(k));
 const finalErrors=latest.filter(r=>r.result==='error').length;
 return {complete:!errors.length&&!missing.length&&!finalErrors&&latest.length===expected.size,
  raw:records.length,unique:latest.length,expected:expected.size,missing,errors:[...new Set(errors)],finalErrors,
  initialErrors:records.filter(r=>r.result==='error').length,records:latest};
}
