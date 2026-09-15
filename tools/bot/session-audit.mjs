// Pure session accounting. A terminal historical failure may lack counters;
// absence stays explicit and does not weaken run-record or successful-session checks.
export function summarizeSessions(sessions) {
 if(!Array.isArray(sessions)||!sessions.length)throw Error('session evidence missing');
 const out={sessions:sessions.length,failedSessions:0,apiHitsKnown:0,browserRestartsKnown:0,
  missingApiCounters:0,missingRestartCounters:0,wallMs:0,firstStart:Infinity,lastEnd:0};
 for(const s of sessions){
  const start=Date.parse(s.startedAt),end=Date.parse(s.endedAt);
  if(!Number.isFinite(start)||!Number.isFinite(end)||end<start||!Number.isInteger(s.exitCode)||s.exitCode<0||
   !Number.isFinite(s.wallMs)||s.wallMs<0)throw Error('session terminal evidence invalid');
  if(s.exitCode!==0)out.failedSessions++;
  for(const [key,sum,missing] of [['apiHits','apiHitsKnown','missingApiCounters'],['browserRestarts','browserRestartsKnown','missingRestartCounters']]){
   if(s[key]==null){if(s.exitCode===0)throw Error('successful session counter missing: '+key);out[missing]++;}
   else if(!Number.isInteger(s[key])||s[key]<0)throw Error('session counter invalid: '+key);
   else out[sum]+=s[key];
  }
  out.wallMs+=s.wallMs;out.firstStart=Math.min(out.firstStart,start);out.lastEnd=Math.max(out.lastEnd,end);
 }
 return out;
}
