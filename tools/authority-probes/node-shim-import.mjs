import fs from 'node:fs';
fs.mkdirSync('.pipeline',{recursive:true});
const no=()=>{};
function canvas(){
 const c={width:1,height:1,style:{},addEventListener:no,removeEventListener:no,toDataURL:()=>''};
 const context=new Proxy({canvas:c,getImageData:(x,y,w,h)=>({data:new Uint8ClampedArray(Math.max(0,w*h*4)),width:w,height:h}),
  measureText:t=>({width:String(t).length*6}),createLinearGradient:()=>({addColorStop:no}),createRadialGradient:()=>({addColorStop:no})},
  {get:(o,k)=>k in o?o[k]:no,set:(o,k,v)=>(o[k]=v,true)});
 c.getContext=()=>context;return c;
}
globalThis.document={createElement:kind=>kind==='canvas'?canvas():{style:{},addEventListener:no,removeEventListener:no,canPlayType:()=>'',play:()=>Promise.resolve(),pause:no},addEventListener:no};
globalThis.window={addEventListener:no,removeEventListener:no,devicePixelRatio:1};
globalThis.localStorage={getItem:()=>null,setItem:no,removeItem:no};
globalThis.requestAnimationFrame=()=>0;globalThis.cancelAnimationFrame=no;
globalThis.fetch=()=>Promise.reject(Error('network disabled in local probe'));
globalThis.WebSocket=class {constructor(){throw Error('network disabled in local probe');}};
globalThis.setInterval=()=>0;globalThis.clearInterval=no;
const results=[];
for(const name of ['world','player','enemy']){
 try{const mod=await import('../../src/game/'+name+'.js');results.push({module:name,loaded:true,exports:Object.keys(mod)});}
 catch(e){results.push({module:name,loaded:false,error:String(e.stack||e)});}
}
let registry;
try{const r=await import('../../src/game/content/registry.js');registry=Object.fromEntries(['Characters','Weapons','Abilities','Enemies'].map(k=>[k,r[k].ids().length]));}catch(e){registry={error:String(e)};}
const result={node:process.version,networkDisabled:true,shim:'no-op canvas and browser globals for import probe only',results,registry,
 limitation:'Import success is not simulation parity or a deployable authoritative server; content bootstrap and visual-dependent behavior remain unverified.'};
fs.writeFileSync('.pipeline/r32-node-shim-probe.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
