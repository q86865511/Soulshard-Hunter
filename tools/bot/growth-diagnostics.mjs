// Tool-only observer. Original methods run once with unchanged this/args/return/throw.
// No game files, RNG, extra simulation ticks or policy decisions are modified.
const SCHEMA='growth-v1';
const n=(v,f=0)=>Number.isFinite(v)?v:f;
const bucket=()=>({count:0,value:0});
const typeStats=()=>({initial:bucket(),spawned:bucket(),collected:bucket(),expired:bucket(),other:bucket(),remaining:bucket(),valueAdjustments:0});
export function createGrowthDiagnostics(scene,{maxEvents=512}={}){
 const world=scene.world,run=scene.run;
 if(!world||typeof world.addPickup!=='function'||typeof world.gainXp!=='function')throw Error('unsupported growth diagnostic world');
 const types={xp:typeStats()},active=new Set(),seen=new WeakSet(),restorers=new Set();
 const levels=[],choiceEvents=[],snapshots=[],errors=[];
 const choices={panels:0,offered:{},panelsWith:{},selected:{},multipleUpgrades:0};
 const motion={samples:0,safeGate:0,xpVisibleSamples:0,eligibleXp:0,eligibleOther:0,towardXp:0,nearestXpDistanceSum:0};
 const xp={initial:n(run.xp),credited:0,spent:0,gainCalls:0};
 const delayEdges=[1,3,5,10,20,30],collectionDelay={edges:delayEdges,counts:new Array(7).fill(0),sum:0,count:0};
 let errorCount=0,truncatedEvents=0,nextSample=30,nextScan=0,lastMotionTick=-1,lastLevelAt=0,disposed=false;
 const now=()=>n(run.time);
 const stats=type=>types[type]||(types[type]=typeStats());
 const observe=fn=>{try{return fn();}catch(e){errorCount++;if(errors.length<10)errors.push(String(e.message||e));}};
 const append=(list,event)=>{if(list.length<maxEvents)list.push(event);else truncatedEvents++;};
 const inc=(map,key)=>{map[key]=(map[key]||0)+1;};
 function wrap(object,key,factory){
  const original=object[key];if(typeof original!=='function')throw Error('unsupported diagnostic method '+key);
  const descriptor=Object.getOwnPropertyDescriptor(object,key);
  const wrapped=factory(original);
  Object.defineProperty(object,key,{value:wrapped,configurable:true,writable:true,enumerable:descriptor?.enumerable??false});
  const restore=()=>{restorers.delete(restore);if(object[key]!==wrapped)return;if(descriptor)Object.defineProperty(object,key,descriptor);else delete object[key];};
  restorers.add(restore);return restore;
 }
 function currentValue(m){
  const value=n(m.pickup.value);
  stats(m.type).valueAdjustments+=value-m.value;m.value=value;return value;
 }
 function finish(m,reason){
  if(m.done)return;
  const value=currentValue(m),b=stats(m.type)[reason];b.count++;b.value+=value;m.done=true;active.delete(m);
  for(const restore of m.restorers)restore();m.restorers.length=0;
  if(m.type==='xp'&&reason==='collected'){
   const age=Math.max(0,n(m.pickup.age));const index=delayEdges.findIndex(e=>age<=e);
   collectionDelay.counts[index<0?6:index]++;collectionDelay.sum+=age;collectionDelay.count++;
  }
 }
 function track(p,initial=false){
  if(!p||seen.has(p)||p.dead)return;
  seen.add(p);const m={pickup:p,type:String(p.type||'unknown'),value:n(p.value),done:false,restorers:[]};
  const b=stats(m.type)[initial?'initial':'spawned'];b.count++;b.value+=m.value;active.add(m);
  m.restorers.push(wrap(p,'collect',original=>function(...args){
   const wasDead=this.dead;
   const result=Reflect.apply(original,this,args);
   if(!wasDead&&this.dead)observe(()=>finish(m,'collected'));
   return result;
  }));
  m.restorers.push(wrap(p,'update',original=>function(...args){
   const result=Reflect.apply(original,this,args);
   if(this.dead&&!m.done)observe(()=>finish(m,n(this.age)>n(this.life,Infinity)?'expired':'other'));
   return result;
  }));
 }
 function reconcile(){
  const present=new Set(world.pickups);
  for(const m of active){
   if(m.pickup.dead)finish(m,n(m.pickup.age)>n(m.pickup.life,Infinity)?'expired':'other');
   else if(!present.has(m.pickup))finish(m,'other');
   else currentValue(m);
  }
 }
 function pickupSnapshot(){
  const out=structuredClone(types);
  for(const m of active){const r=out[m.type].remaining;r.count++;r.value+=m.value;}
  return out;
 }
 function snapshot(){
  reconcile();
  const p=pickupSnapshot();
  const sample={time:now(),level:n(run.level),xp:n(run.xp),xpNext:n(run.xpNext),kills:n(run.kills),
   xpSpawned:p.xp.spawned.value,xpCollected:p.xp.collected.value,xpExpired:p.xp.expired.value,xpRemaining:p.xp.remaining.value,
   xpCredited:xp.credited,choices:choices.panels,weapons:(scene.player.weapons||[]).filter(w=>!w.def?.equipped).length,
   passives:(run.abilities||[]).length};
  if(snapshots.length&&Math.abs(snapshots.at(-1).time-now())<1e-7)snapshots[snapshots.length-1]=sample;
  else append(snapshots,sample);
 }
 wrap(world,'addPickup',original=>function(...args){
  const before=this.pickups.length;
  const result=Reflect.apply(original,this,args);
  observe(()=>{for(const p of this.pickups.slice(before))track(p);});
  return result;
 });
 wrap(world,'gainXp',original=>function(...args){
  const beforeXp=n(run.xp),beforeLevel=n(run.level);
  const result=Reflect.apply(original,this,args);
  observe(()=>{
   const gain=args[0];if(!Number.isFinite(gain))throw Error('nonfinite XP gain');
   xp.credited+=gain;xp.gainCalls++;xp.spent+=beforeXp+gain-n(run.xp);
   for(let level=beforeLevel+1;level<=n(run.level);level++){
    append(levels,{time:now(),level,interval:now()-lastLevelAt});lastLevelAt=now();
   }
  });
  return result;
 });
 for(const p of world.pickups)observe(()=>track(p,true));
 observe(snapshot);
 return {
  choice(options,index,state={}){
   observe(()=>{
    choices.panels++;const kinds=new Set();
    for(const option of options){const kind=String(option?.kind||'other');inc(choices.offered,kind);kinds.add(kind);}
    for(const kind of kinds)inc(choices.panelsWith,kind);
    if(options.filter(o=>o?.kind==='weaponup').length>1)choices.multipleUpgrades++;
    const selected=options[index];const kind=String(selected?.kind||'none');inc(choices.selected,kind);
    const clean=o=>({kind:o?.kind||'other',id:o?.id??null,level:o?.level??null});
    const owned=(state.weapons||[]).find(w=>w.id===selected?.id);
    append(choiceEvents,{time:now(),level:n(run.level),options:options.map(clean),
     chosen:{...clean(selected),kind,levelBefore:owned?.level??null},
     weapons:(state.weapons||[]).map(w=>({id:w.id,level:w.level,equipped:!!w.equipped}))});
   });
  },
  motion(view,out,tick){
   if(tick%120!==0||tick===lastMotionTick)return;lastMotionTick=tick;
   observe(()=>{
    motion.samples++;const px=n(view.x),py=n(view.y),ts=Math.max(1,n(view.ts,16));
    let near=Infinity,fx=0,fy=0;
    for(const e of view.enemies||[]){const dx=n(e.x)-px,dy=n(e.y)-py,len=Math.hypot(dx,dy),dist=n(e.dist,len);
     if(dist<near){near=dist;fx=len>1e-6?dx/len:0;fy=len>1e-6?dy/len:0;}}
    const safe=near>1.5*ts;if(safe)motion.safeGate++;
    let xpDistance=Infinity,xpX=0,xpY=0;
    for(const p of view.pickups||[]){
     const dx=n(p.x)-px,dy=n(p.y)-py,len=Math.hypot(dx,dy);if(len<=1e-6)continue;
     if(p.type==='xp'&&len<xpDistance){xpDistance=len;xpX=dx/len;xpY=dy/len;}
     if(safe&&(dx/len*fx+dy/len*fy)<=0.5){if(p.type==='xp')motion.eligibleXp++;else motion.eligibleOther++;}
    }
    if(Number.isFinite(xpDistance)){motion.xpVisibleSamples++;motion.nearestXpDistanceSum+=xpDistance;
     if(n(out.move?.x)*xpX+n(out.move?.y)*xpY>=0.5)motion.towardXp++;}
   });
  },
  afterTick(){
   observe(()=>{if(now()>=nextScan){reconcile();nextScan=now()+1;}
    if(now()+1e-7>=nextSample){snapshot();do{nextSample+=30;}while(nextSample<=now()+1e-7);}});
  },
  collect(){
   observe(snapshot);
   return structuredClone({schema:SCHEMA,time:now(),pickups:pickupSnapshot(),xp:{...xp,final:n(run.xp),
    outsideGainDelta:n(run.xp)-xp.initial-xp.credited+xp.spent},levels,choiceEvents,choices,motion,collectionDelay,snapshots,
    truncatedEvents,errorCount,errors});
  },
  dispose(){if(disposed)return;for(const restore of [...restorers].reverse())restore();disposed=true;active.clear();}
 };
}
export function validateGrowthDiagnostic(d){
 const errors=[];
 if(!d||d.schema!==SCHEMA)return ['diagnosticSchema'];
 if(!Number.isFinite(d.time)||d.time<0||!Number.isInteger(d.errorCount)||!Number.isInteger(d.truncatedEvents)||!Array.isArray(d.errors))errors.push('diagnosticFields');
 if(d.truncatedEvents)errors.push('truncatedEvents');
 if(d.errorCount)errors.push('observerErrors');
 const x=d.pickups?.xp;
 if(!x)return errors.concat('xpPickups');
 for(const key of ['initial','spawned','collected','expired','other','remaining']){
  if(!x[key]||!Number.isInteger(x[key].count)||x[key].count<0||!Number.isFinite(x[key].value)||x[key].value<0)errors.push('pickupFields');
 }
 if(!errors.includes('pickupFields')){
  const value=x.initial.value+x.spawned.value+x.valueAdjustments-x.collected.value-x.expired.value-x.other.value-x.remaining.value;
  const count=x.initial.count+x.spawned.count-x.collected.count-x.expired.count-x.other.count-x.remaining.count;
  if(!Number.isFinite(value)||Math.abs(value)>1e-6||count!==0)errors.push('xpConservation');
 }
 if(!d.xp||!['initial','credited','spent','final','outsideGainDelta'].every(k=>Number.isFinite(d.xp[k])))errors.push('xpFields');
 if(!Array.isArray(d.snapshots)||!d.snapshots.length||!Array.isArray(d.levels)||!Array.isArray(d.choiceEvents))errors.push('events');
 const keys=['samples','safeGate','xpVisibleSamples','eligibleXp','eligibleOther','towardXp','nearestXpDistanceSum'];
 if(!d.motion||!keys.every(k=>Number.isFinite(d.motion[k])&&d.motion[k]>=0))errors.push('motionFields');
 if(!d.choices||!Number.isInteger(d.choices.panels)||!['offered','panelsWith','selected'].every(k=>d.choices[k]&&Object.values(d.choices[k]).every(v=>Number.isInteger(v)&&v>=0)))errors.push('choiceFields');
 const delay=d.collectionDelay;
 if(!delay||!Array.isArray(delay.counts)||!delay.counts.every(v=>Number.isInteger(v)&&v>=0)||delay.counts.reduce((a,b)=>a+b,0)!==delay.count||!Number.isFinite(delay.sum))errors.push('delayFields');
 if(Array.isArray(d.snapshots))for(let i=0;i<d.snapshots.length;i++){
  const s=d.snapshots[i];
  if(!['time','level','kills','xpSpawned','xpCollected','xpExpired'].every(k=>Number.isFinite(s[k]))||(i&&s.time<=d.snapshots[i-1].time))errors.push('snapshotFields');
 }
 if(d.choices?.panels!==d.choiceEvents?.length&&!d.truncatedEvents)errors.push('choiceEvents');
 return [...new Set(errors)];
}
