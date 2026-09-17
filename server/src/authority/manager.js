import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {InputGate} from './input.js';
export class AuthorityManager {
  constructor({maxRooms=2,settlementTimeoutMs=30000,spawn=fork,loadMeta=async()=>({}),settle=async()=>({saved:false}),onError=()=>{}}={}){
    this.settlementTimeoutMs=settlementTimeoutMs;this.maxRooms=maxRooms;this.spawn=spawn;this.loadMeta=loadMeta;this.settle=settle;this.onError=onError;
    this.rooms=new Map();this.users=new Set();
  }
  busy(uid){return this.users.has(String(uid));}
  async start(room,emit){
    const players=room.members.filter(m=>!m.spectator);
    if(this.rooms.has(room.code)||this.rooms.size>=this.maxRooms)throw Error('合作模擬房間已滿，請稍後再試');
    if(new Set(players.map(m=>String(m.uid))).size!==players.length||players.some(m=>this.busy(m.uid)))throw Error('同一帳號只能參加一場合作模擬');
    const runId=randomUUID(),state={runId,room,emit,gate:new InputGate(runId),closed:false,child:null,lastBeat:Date.now(),startedAt:Date.now(),output:[],ready:false};
    this.rooms.set(room.code,state);for(const p of players){this.users.add(String(p.uid));state.gate.add(p.cid);}
    try{
      const meta=await this.loadMeta(players.find(p=>p.cid===room.hostCid).uid);
      if(state.closed)throw Error('房間已關閉');
      state.meta=meta||{};
      const child=this.spawn(new URL('./worker.js',import.meta.url),[],{execArgv:['--max-old-space-size=256'],stdio:['ignore','pipe','pipe','ipc'],env:{PATH:process.env.PATH||'',SystemRoot:process.env.SystemRoot||''},windowsHide:true});
      state.child=child;
      let stderr='';child.stderr?.on('data',x=>{stderr=(stderr+x).slice(-4000);});child.stdout?.on('data',()=>{});
      await new Promise((resolve,reject)=>{
        const deadline=setTimeout(()=>reject(Error('合作模擬啟動逾時')),20000);state.bootTimer=deadline;state.cancelBoot=reject;
        const fail=error=>{if(state.closed||state.ending)return;clearTimeout(deadline);if(!state.ready)reject(error);else this.fail(state,error);};
        child.on('error',fail);child.on('exit',()=>{if(!state.closed)fail(Error('合作模擬中斷 '+stderr));});
        child.on('message',m=>{
          if(state.closed)return;
          state.lastBeat=Date.now();
          if(m.t==='fatal')return fail(Error(m.message));
          if(m.t==='ready'){state.ready=true;state.cancelBoot=null;clearTimeout(deadline);resolve();return;}
          if(m.t==='heartbeat'){state.metrics=m;return;}
          if(!state.ready){state.output.push(m);return;}
          this.output(state,m);
        });
        child.send({t:'boot',room,runId,meta:state.meta});
      });
      state.watchdog=setInterval(()=>{
        if(Date.now()-state.lastBeat>10000)this.fail(state,Error('合作模擬逾時'));
      },1000);state.watchdog.unref();
      return {runId,activate:()=>{for(const m of state.output)this.output(state,m);state.output=[];}};
    }catch(error){this.stop(room.code,state.runId);throw error;}
  }
  output(state,m){
    if(state.closed)return;
    if(m.t==='runend'){
      if(state.ending)return;state.ending=true;
      clearInterval(state.watchdog);
      state.child?.kill();
      const confirm=result=>{
        if(state.closed)return;
        state.emit({t:'settlement',runId:state.runId,protocol:2,summary:m.summary,settlement:result});
        this.stop(state.room.code,state.runId);
      };
      state.settlementTimer=setTimeout(()=>confirm({saved:null,pending:true,error:'結算尚未確認，請稍後重新登入同步雲端存檔'}),this.settlementTimeoutMs);
      state.settlementTimer.unref?.();
      state.emit({...m,runId:state.runId,protocol:2,meta:undefined,settlement:{saved:null,pending:true}});
      Promise.resolve().then(()=>this.settle(state,m)).then(confirm).catch(error=>{
        this.onError(error);
        confirm({saved:null,pending:true,error:'未能確認本局結算，請稍後重新登入同步雲端存檔'});
      });
      return;
    }
    if(['runstart','snap','levelup'].includes(m.t))state.emit(m);
  }
  input(code,cid,m){
    const s=this.rooms.get(code);if(!s?.ready||s.closed||s.ending)return false;
    const accepted=s.gate.accept(cid,m);if(!accepted)return false;
    // IPC writes are bounded by the gate and stop on transport pressure.
    if(!s.child.send({...accepted,cid}))this.fail(s,Error('合作輸入佇列過載'));
    return true;
  }
  finish(code){const s=this.rooms.get(code);if(!s||s.ending||s.finishRequested)return;if(!s.ready){this.stop(code,s.runId);return;}s.finishRequested=true;s.child.send({t:'finish'});}
  depart(code,cid){const s=this.rooms.get(code);s?.gate.remove(cid);if(s?.ready&&!s.ending)s.child.send({t:'disconnect',cid,permanent:true});}
  disconnect(code,cid){const s=this.rooms.get(code);s?.gate.remove(cid);if(s?.ready&&!s.ending)s.child.send({t:'disconnect',cid});}
  reconnect(code,prevCid,cid){const s=this.rooms.get(code);if(!s?.ready||s.ending)return;s.gate.remove(prevCid);s.gate.add(cid);s.child.send({t:'reconnect',prevCid,cid});}
  fail(s,error){if(s.closed)return;this.onError(error);s.emit({t:'authority:error',runId:s.runId,msg:'合作模擬已中斷，請返回大廳重試'});this.stop(s.room.code,s.runId);}
  stop(code,runId){
    const s=this.rooms.get(code);if(!s||s.closed||(runId&&s.runId!==runId))return;s.closed=true;clearInterval(s.watchdog);clearTimeout(s.bootTimer);clearTimeout(s.settlementTimer);
    s.cancelBoot?.(Error('房間已關閉'));s.cancelBoot=null;
    this.rooms.delete(code);for(const p of s.room.members.filter(m=>!m.spectator))this.users.delete(String(p.uid));
    if(s.child){s.child.removeAllListeners('message');s.child.kill();}
  }
  close(){for(const code of [...this.rooms.keys()])this.stop(code);}
}
