import test from 'node:test';
import assert from 'node:assert/strict';
import {InputGate} from '../src/authority/input.js';
const msg=(x={})=>({t:'input',protocol:2,runId:'r',seq:1,mv:[1,0],dash:false,...x});
test('binds actor, room/run and protocol, rejects state injection',()=>{
 const g=new InputGate('r');g.add('a');
 for(const m of [msg({runId:'other'}),msg({protocol:1}),msg({t:'snap'}),msg({t:'runend'})])assert.equal(g.accept('a',m),null);
 assert.equal(g.accept('b',msg({cid:'a'})),null);
 assert.deepEqual(g.accept('a',msg({cid:'b',stats:{speed:999}})),{t:'input',seq:1,mv:[1,0],dash:false,interact:false});
});
test('finite bounded vectors, monotonic sequence and edge types',()=>{
 for(const patch of [{mv:[Infinity,0]},{mv:[NaN,0]},{mv:[2,0]},{mv:[0]},{seq:1.2},{seq:10001},{dash:1},{interact:'yes'}]){
  const g=new InputGate('r');g.add('a');assert.equal(g.accept('a',msg(patch)),null);
 }
 const g=new InputGate('r');g.add('a');const a=g.accept('a',msg({mv:[1,1]}));assert.ok(Math.hypot(...a.mv)<=1);
 assert.equal(g.accept('a',msg()),null);assert.equal(g.accept('a',msg({seq:0})),null);
});
test('bounded rate, reconnect new sequence, exact choice token',()=>{
 let now=0;const g=new InputGate('r',()=>now);g.add('a');
 for(let i=1;i<=12;i++)assert.ok(g.accept('a',msg({seq:i})));
 assert.equal(g.accept('a',msg({seq:13})),null);now=100;assert.ok(g.accept('a',msg({seq:13})));
 g.remove('a');g.add('b');assert.ok(g.accept('b',msg()));assert.equal(g.accept('a',msg({seq:14})),null);
 assert.ok(g.accept('b',{t:'levelpick',runId:'r',protocol:2,choiceId:1,i:2}));
 assert.equal(g.accept('b',{t:'levelpick',runId:'r',protocol:2,choiceId:1,i:3}),null);
});
