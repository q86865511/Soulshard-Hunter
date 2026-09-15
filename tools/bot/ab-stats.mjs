// Independent stratified bootstrap; strategy RNG here is analysis-only.
import { makeRng } from './strategy/rng.mjs';
export function quantile(values,p){
 if(!values.length) return null;
 const sorted=values.slice().sort((a,b)=>a-b),x=(sorted.length-1)*p,i=Math.floor(x);
 return sorted[i]+(sorted[Math.min(i+1,sorted.length-1)]-sorted[i])*(x-i);
}
export function metrics(records){
 const effective=records.filter(r=>!['timeout','error'].includes(r.result));
 const clear=records.filter(r=>r.result==='clear').length;
 const counts=key=>Object.fromEntries([...new Set(records.map(r=>r[key]))].sort().map(k=>[k,records.filter(r=>r[key]===k).length]));
 return {n:records.length,effective:effective.length,clear,rate:effective.length?clear/effective.length:null,
  allRate:records.length?clear/records.length:null,excludedRate:records.length?(records.length-effective.length)/records.length:null,
  time:[0.25,0.5,0.75].map(p=>quantile(effective.map(r=>r.time),p)),
  level:[0.25,0.5,0.75].map(p=>quantile(effective.map(r=>r.level),p)),
  emptyAbilities:effective.filter(r=>r.abilities.length===0).length,
  emptyAbilitiesAll:records.filter(r=>r.abilities?.length===0).length,
  result:counts('result'),endReason:counts('endReason'),
  clearEndReason:Object.fromEntries([...new Set(records.filter(r=>r.result==='clear').map(r=>r.endReason))].sort().map(k=>[k,records.filter(r=>r.result==='clear'&&r.endReason===k).length])),
 };
}
function strata(records){
 const map=new Map();
 for(const r of records){
  const key=JSON.stringify([r.biome,r.char]);
  if(!map.has(key))map.set(key,[]);
  map.get(key).push(r);
 }
 return map;
}
export function bootstrapDifference(a,b,{iterations=5000,seed=20260915}={}){
 if(!a.length||!b.length)return {effective:null,all:null,iterations,seed};
 if(!Number.isInteger(iterations)||iterations<1)throw Error('iterations must be positive');
 const aa=strata(a),bb=strata(b);
 if(aa.size!==bb.size)throw Error('strata mismatch');
 const groups=[...aa.keys()].sort().map(k=>{
  const x=aa.get(k),y=bb.get(k);
  if(!y||x.length!==y.length)throw Error('strata sample count mismatch');
  const probabilities=rows=>({n:rows.length,c:rows.filter(r=>r.result==='clear').length/rows.length,
   e:rows.filter(r=>!['timeout','error'].includes(r.result)).length/rows.length});
  return [probabilities(x),probabilities(y)];
 });
 const rng=makeRng(seed),effective=[],all=[];
 for(let rep=0;rep<iterations;rep++){
  const clears=[0,0],eff=[0,0];
  for(const group of groups)for(let arm=0;arm<2;arm++){
   const {n,c,e}=group[arm];
   for(let i=0;i<n;i++){const u=rng();if(u<c)clears[arm]++;if(u<e)eff[arm]++;}
  }
  if(eff[0]&&eff[1])effective.push(clears[1]/eff[1]-clears[0]/eff[0]);
  all.push(clears[1]/b.length-clears[0]/a.length);
 }
 const interval=v=>[quantile(v,0.025),quantile(v,0.975)];
 return {effective:effective.length===iterations?interval(effective):null,all:interval(all),iterations,seed};
}
export function adoption(a,b,ci){
 const gates={gainAtLeastOnePoint:a.rate!=null&&b.rate!=null&&b.rate-a.rate>=0.01,
  confidenceAboveZero:!!ci.effective&&ci.effective[0]>0,
  allRunsAgree:a.allRate!=null&&b.allRate>a.allRate,
  noExtraExclusions:a.excludedRate!=null&&b.excludedRate<=a.excludedRate};
 return {adopt:Object.values(gates).every(Boolean),gates};
}
