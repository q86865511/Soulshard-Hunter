import fs from 'node:fs';
fs.mkdirSync('.pipeline',{recursive:true});
import assert from 'node:assert/strict';
import {Realtime} from '../../server/src/realtime.js';
const rt=Object.create(Realtime.prototype),sent=[];
const host={cid:'host'},guest={cid:'guest'},spectator={cid:'spectator'};
const room={hostCid:'host',started:true,members:new Map([['host',{cid:'host'}],['guest',{cid:'guest'}],['spectator',{cid:'spectator',spectator:true}]])};
rt.rooms=new Map([['test',room]]);rt.roomOf=new Map([['host','test'],['guest','test'],['spectator','test']]);rt.byCid=new Map([['host',host],['guest',guest],['spectator',spectator]]);
rt.send=(client,data)=>sent.push({cid:client.cid,data});
rt.sendRaw=(client,raw)=>sent.push({cid:client.cid,raw});
const parsed={t:'snap',s:{probe:'opaque test fixture; not a valid game snapshot'}},raw=JSON.stringify(parsed);
rt.relayToGuests(guest,raw,parsed);assert.equal(sent.length,0);
rt.relayToGuests(host,raw,parsed);assert.equal(sent.length,2);assert.ok(sent.every(x=>x.raw===raw));sent.length=0;
rt.relayToHost(guest,'ignored',{t:'input',cid:'host',mv:[0,1],dash:false});
assert.equal(sent.length,1);assert.equal(sent[0].cid,'host');assert.equal(sent[0].data.cid,'guest');sent.length=0;
rt.relayToHost(spectator,'ignored',{t:'input',mv:[0,1]});assert.equal(sent.length,0);
const result={tests:4,passed:4,networkUsed:false,guestCannotPublishSnapshot:true,hostSnapshotIsOpaquePassthrough:true,inputCidRebound:true,spectatorInputBlocked:true,
 limitation:'Tests real relay methods with in-memory room/transport fixtures. Does not assert arbitrary payload is accepted by the game client, and is not a server-authoritative prototype.'};
fs.writeFileSync('.pipeline/r32-relay-boundary-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
