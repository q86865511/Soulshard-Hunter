// Exact terminal accounting, with explicit unknowns for verified external interruptions.
export function summarizeSessions(sessions, interruptions=new Map()) {
 if(!Array.isArray(sessions)||!sessions.length)throw Error('session evidence missing');
 const out={sessions:sessions.length,failedSessions:0,apiHitsKnown:0,browserRestartsKnown:0,
  missingApiCounters:0,missingRestartCounters:0,wallMs:0,firstStart:Infinity,lastEnd:0,
  interruptedSessions:0,missingWallTimes:0};
 for(const s of sessions){
  const start=Date.parse(s.startedAt),end=Date.parse(s.endedAt),proof=interruptions.get(s.auditKey);
  if(!Number.isFinite(start))throw Error('session start evidence invalid');
  out.firstStart=Math.min(out.firstStart,start);
  if(proof){
   const observed=Date.parse(proof.observedStoppedAt);
   if(s.endedAt!=null||s.exitCode!=null||s.wallMs!=null||!Number.isInteger(s.pid)||s.pid<=0||
     proof.reason!=='user-request'||proof.pid!==s.pid||proof.startedAt!==s.startedAt||
     !Number.isFinite(observed)||observed<start)throw Error('session interruption evidence invalid');
   out.failedSessions++;out.interruptedSessions++;out.missingWallTimes++;
   for(const [key,sum,missing] of [['apiHits','apiHitsKnown','missingApiCounters'],['browserRestarts','browserRestartsKnown','missingRestartCounters']]){
    if(s[key]!=null){if(!Number.isInteger(s[key])||s[key]<0)throw Error('session counter invalid: '+key);out[sum]+=s[key];}
    out[missing]++; // A nonterminal snapshot never proves the final counter.
   }
   continue;
  }
  if(!Number.isFinite(end)||end<start||!Number.isInteger(s.exitCode)||s.exitCode<0||
   !Number.isFinite(s.wallMs)||s.wallMs<0)throw Error('session terminal evidence invalid');
  if(s.exitCode!==0)out.failedSessions++;
  for(const [key,sum,missing] of [['apiHits','apiHitsKnown','missingApiCounters'],['browserRestarts','browserRestartsKnown','missingRestartCounters']]){
   if(s[key]==null){if(s.exitCode===0)throw Error('successful session counter missing: '+key);out[missing]++;}
   else if(!Number.isInteger(s[key])||s[key]<0)throw Error('session counter invalid: '+key);
   else out[sum]+=s[key];
  }
  out.wallMs+=s.wallMs;out.lastEnd=Math.max(out.lastEnd,end);
 }
 if(out.lastEnd<out.firstStart)throw Error('session terminal endpoint evidence missing');
 return out;
}
