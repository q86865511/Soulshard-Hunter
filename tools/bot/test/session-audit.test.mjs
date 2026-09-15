import {test} from 'node:test';
import assert from 'node:assert/strict';
import {summarizeSessions} from '../session-audit.mjs';
const ok={startedAt:'2026-09-15T00:00:00Z',endedAt:'2026-09-15T00:00:01Z',wallMs:1000,exitCode:0,apiHits:2,browserRestarts:1};
test('sessions: terminal legacy failure keeps missing counters unknown, never invents zero',()=>{
 const failure={...ok,exitCode:1};delete failure.apiHits;delete failure.browserRestarts;
 const s=summarizeSessions([ok,failure]);
 assert.equal(s.sessions,2);assert.equal(s.failedSessions,1);
 assert.equal(s.apiHitsKnown,2);assert.equal(s.browserRestartsKnown,1);
 assert.equal(s.missingApiCounters,1);assert.equal(s.missingRestartCounters,1);
 assert.equal(s.wallMs,2000);
});
test('sessions: successful or live sessions cannot bypass evidence requirements',()=>{
 assert.throws(()=>summarizeSessions([]),/session/);
 for(const change of [{endedAt:undefined},{exitCode:null},{wallMs:-1},{apiHits:undefined},{apiHits:-1},{startedAt:'bad'}])
  assert.throws(()=>summarizeSessions([{...ok,...change}]),/session/);
});
test('sessions: known counters from partial failures count and numeric invalids reject',()=>{
 const s=summarizeSessions([ok,{...ok,exitCode:3,apiHits:7,browserRestarts:0}]);
 assert.equal(s.apiHitsKnown,9);assert.equal(s.failedSessions,1);assert.equal(s.missingApiCounters,0);
 assert.throws(()=>summarizeSessions([{...ok,exitCode:1,apiHits:-1}]),/session/);
});
