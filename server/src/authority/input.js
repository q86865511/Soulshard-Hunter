// Pure boundary: callers bind cid from the authenticated socket, never the payload.
export const AUTHORITY_PROTOCOL = 2;
export class InputGate {
  constructor(runId, now=()=>performance.now()){this.runId=runId;this.now=now;this.actors=new Map();}
  add(cid){this.actors.set(cid,{seq:0,tokens:12,at:this.now()});}
  remove(cid){this.actors.delete(cid);}
  accept(cid,m){
    const a=this.actors.get(cid);
    if(!a||!m||m.runId!==this.runId||m.protocol!==2)return null;
    const now=this.now();a.tokens=Math.min(12,a.tokens+Math.max(0,now-a.at)*0.06);a.at=now;
    if(a.tokens<1)return null;
    a.tokens--;
    if(m.t==='levelpick'){
      if(!Number.isSafeInteger(m.choiceId)||m.choiceId<1||!Number.isInteger(m.i)||m.i<0||m.i>2)return null;
      return {t:m.t,choiceId:m.choiceId,i:m.i};
    }
    if(m.t!=='input'||!Number.isSafeInteger(m.seq)||m.seq<=a.seq||m.seq>a.seq+10000)return null;
    if(!Array.isArray(m.mv)||m.mv.length!==2||!m.mv.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1))return null;
    if(typeof m.dash!=='boolean'||(m.interact!==undefined&&typeof m.interact!=='boolean'))return null;
    a.seq=m.seq;
    const n=Math.max(1,Math.hypot(...m.mv));
    return {t:'input',seq:m.seq,mv:m.mv.map(v=>v/n),dash:m.dash,interact:!!m.interact};
  }
}
