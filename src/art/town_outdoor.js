// R18/B1+B2 — OUTDOOR TOWN sprites. Hand-integrated from a Fable(draw)->Opus(verify)
// workflow (each block was Painter-API verified). Drop-in: makeCamp() points its tileset
// + decor here. Grass/dirt/plaza floor variants, a forest-treeline wall ring, six building
// facades (anchored at the base so VOID collision tiles sit behind them), a shimmering
// stream + bridge, and natural props (trees / bushes / fences / bench / flowerbed / stall).
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// town_grass
defineSprite('town_grass',16,16,(p)=>{
  const base=P.leaf;
  p.rect(0,0,16,16,base);
  p.gradV(0,0,16,16,lighten(base,0.06),darken(base,0.05));
  p.speckle(0,0,16,16,P.greenD,13,7);
  p.speckle(0,0,16,16,darken(base,0.12),8,21);
  p.vline(4,5,2,P.leafL);
  p.vline(9,10,6,P.leafL);
  p.vline(3,4,11,P.leafL);
  p.vline(12,13,14,lighten(base,0.18));
  p.vline(7,8,9,lighten(base,0.18));
  p.px(13,3,P.leafL);
  p.px(5,12,lighten(P.leafL,0.1));
},{anchor:[0,0]});

// town_grass2
defineSprite('town_grass2',16,16,(p)=>{
  const base=mix(P.leaf,P.moss,0.55);
  p.rect(0,0,16,16,base);
  p.gradV(0,0,16,16,lighten(base,0.05),darken(base,0.05));
  p.speckle(0,0,16,16,darken(base,0.14),12,5);
  p.speckle(0,0,16,16,P.moss,9,17);
  const worn=mix(base,P.sand,0.28);
  p.ellipse(10,11,3,2,worn);
  p.speckle(7,9,7,5,mix(base,P.sand,0.14),5,9);
  p.vline(3,4,3,P.leafL);
  p.vline(8,9,13,lighten(base,0.2));
  p.vline(13,14,6,lighten(base,0.16));
  p.px(6,6,P.leafL);
},{anchor:[0,0]});

// town_flowergrass
defineSprite('town_flowergrass',16,16,(p)=>{
  const base=P.leaf;
  p.rect(0,0,16,16,base);
  p.gradV(0,0,16,16,lighten(base,0.06),darken(base,0.05));
  p.speckle(0,0,16,16,P.greenD,12,11);
  p.speckle(0,0,16,16,darken(base,0.1),6,33);
  p.vline(9,10,2,P.leafL);
  p.vline(5,6,14,lighten(base,0.18));
  p.px(4,4,P.sakura); p.px(2,4,P.sakura); p.px(3,3,P.sakura); p.px(3,5,P.sakura); p.px(3,4,P.sakuraL);
  p.px(12,9,P.holy); p.px(10,9,P.holy); p.px(11,8,P.holy); p.px(11,10,P.holy); p.px(11,9,P.holyL);
  p.px(6,13,P.mana); p.px(6,12,P.manaL);
},{anchor:[0,0]});

// town_dirt
defineSprite('town_dirt',16,16,(p)=>{
  const base=mix(P.wood,P.barkD,0.45);
  p.rect(0,0,16,16,base);
  p.gradV(0,0,16,16,lighten(base,0.07),darken(base,0.06));
  p.speckle(0,0,16,16,darken(base,0.16),12,13);
  p.speckle(0,0,16,16,lighten(base,0.11),9,29);
  const peb=mix(base,P.gray3,0.45);
  p.px(3,5,peb); p.px(4,5,lighten(peb,0.15));
  p.px(11,11,peb); p.px(12,11,lighten(peb,0.15));
  p.px(8,2,peb);
  p.px(13,7,darken(peb,0.1));
  p.px(2,13,peb);
},{anchor:[0,0]});

// town_dirt2
defineSprite('town_dirt2',16,16,(p)=>{
  const base=mix(P.wood,P.barkD,0.45);
  p.rect(0,0,16,16,base);
  p.gradV(0,0,16,16,lighten(base,0.06),darken(base,0.06));
  p.speckle(0,0,16,16,darken(base,0.14),10,3);
  const dry=mix(base,P.sand,0.32);
  p.ellipse(12,4,3,2,dry);
  p.speckle(9,2,6,5,mix(base,P.sand,0.16),4,8);
  const rut=darken(base,0.22);
  p.vline(0,15,4,rut); p.vline(0,15,5,darken(base,0.1));
  p.vline(0,15,11,rut); p.vline(0,15,12,darken(base,0.1));
  const peb=mix(base,P.gray3,0.4);
  p.px(8,9,peb); p.px(14,13,peb); p.px(2,7,lighten(peb,0.12));
},{anchor:[0,0]});

// town_plaza
defineSprite('town_plaza',16,16,(p)=>{
  const base=mix(P.sand,P.bronze,0.35);
  p.rect(0,0,16,16,base);
  p.gradV(1,1,14,14,lighten(base,0.08),darken(base,0.04));
  p.speckle(2,2,12,12,darken(base,0.08),7,19);
  p.speckle(2,2,12,12,lighten(base,0.08),5,31);
  const seam=darken(base,0.22);
  p.vline(1,14,14,darken(base,0.08));
  p.hline(1,14,14,darken(base,0.08));
  p.vline(0,15,15,seam);
  p.hline(0,15,15,seam);
  const hi=lighten(base,0.16);
  p.hline(0,14,0,hi);
  p.vline(0,14,0,hi);
  p.px(2,1,lighten(base,0.3)); p.px(3,1,lighten(base,0.22)); p.px(2,2,lighten(base,0.22));
},{anchor:[0,0]});

// town_plaza2
defineSprite('town_plaza2',16,16,(p)=>{
  const base=mix(P.sand,P.bronze,0.4);
  p.rect(0,0,16,16,base);
  p.gradV(1,1,14,14,lighten(base,0.07),darken(base,0.05));
  p.speckle(2,2,12,12,darken(base,0.09),7,23);
  p.speckle(2,2,12,12,lighten(base,0.07),5,41);
  const teal=mix(base,P.shard,0.45);
  p.hline(3,12,8,teal);
  p.px(2,8,mix(base,P.shard,0.22)); p.px(13,8,mix(base,P.shard,0.22));
  p.px(7,8,mix(base,P.shardL,0.55)); p.px(8,8,mix(base,P.shardL,0.55));
  const seam=darken(base,0.22);
  p.vline(1,14,14,darken(base,0.08));
  p.hline(1,14,14,darken(base,0.08));
  p.vline(0,15,15,seam);
  p.hline(0,15,15,seam);
  const hi=lighten(base,0.15);
  p.hline(0,14,0,hi);
  p.vline(0,14,0,hi);
  p.px(2,1,lighten(base,0.28)); p.px(2,2,lighten(base,0.2));
},{anchor:[0,0]});

// town_treeline
defineSprite('town_treeline',16,16,(p)=>{
  const W=16,H=16;
  const bgTop=mix(P.bog,P.ink2,0.35);
  const back=mix(P.leafD,P.ink2,0.55);
  const mid=mix(P.leafD,P.bog,0.35);
  const front=P.leafD;
  const put=(x,y,c)=>{ if(y<0||y>=H) return; p.px(((x%W)+W)%W,y,c); };
  const tri=(cx,ty,h,c)=>{ for(let r=0;r<h;r++){ const hw=Math.floor(r*0.55); for(let x=cx-hw;x<=cx+hw;x++) put(x,ty+r,c); } };
  p.gradV(0,0,W,H,bgTop,P.ink2);
  tri(3,1,11,back); tri(9,0,12,back); tri(14,2,10,back);
  tri(6,2,12,mid); tri(12,3,11,mid); tri(0,3,12,mid);
  tri(2,5,10,front); tri(10,4,11,front);
  put(2,5,P.leaf); put(2,6,P.leaf); put(1,7,mix(P.leaf,front,0.5));
  put(10,4,P.leaf); put(10,5,P.leaf); put(11,6,mix(P.leaf,front,0.5));
  put(6,2,mix(P.leaf,mid,0.4)); put(0,3,mix(P.leaf,mid,0.5));
  p.speckle(0,5,16,6,mix(P.leaf,P.leafD,0.6),5,7);
  p.rect(0,14,W,2,mix(P.ink2,P.leafD,0.18));
  p.shadeBottom(0.4,10);
},{anchor:[0,0]});

// town_treeline_top
defineSprite('town_treeline_top',16,8,(p)=>{
  const W=16,H=8;
  const base=mix(P.leafD,P.bog,0.3);
  const lit=P.leaf;
  const litHi=P.leafL;
  const put=(x,y,c)=>{ if(y<0||y>=H) return; p.px(((x%W)+W)%W,y,c); };
  const ball=(cx,cy,r,c)=>{ for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ if(dx*dx+dy*dy<=r*r+1) put(cx+dx,cy+dy,c); } };
  p.gradV(0,3,W,5,lit,mix(P.leafD,P.ink2,0.2));
  ball(2,4,3,lit); ball(7,3,3,lit); ball(12,4,3,lit); ball(15,3,2,lit);
  ball(1,3,2,litHi); ball(6,2,2,litHi); ball(11,3,2,litHi); ball(14,2,1,litHi);
  put(1,2,lighten(litHi,0.25)); put(6,1,lighten(litHi,0.25)); put(11,2,lighten(litHi,0.25));
  put(3,1,P.holy); put(9,2,P.holy); put(14,1,P.holy); put(5,4,mix(P.holy,lit,0.5));
  p.speckle(0,3,16,3,mix(litHi,lit,0.5),4,3);
  p.hline(0,15,7,base);
  p.shadeBottom(0.25,5);
},{anchor:[0,0]});

// town_fc_church
defineSprite('town_fc_church',64,64,(p)=>{
  const wallW=P.bone, wallL=lighten(P.bone,0.16), wallD=darken(P.bone,0.16);
  const roofC=P.blueD, roofL=lighten(P.blueD,0.28), roofD=darken(P.blueD,0.22);
  const trim=P.holy, trimD=darken(P.holy,0.22);
  // ---- main hall wings ----
  p.rect(6,46,52,18,wallW);
  p.rect(6,46,2,18,wallL);
  p.rect(56,46,2,18,wallD);
  p.speckle(8,50,16,12,wallD,6,3);
  p.speckle(40,50,16,12,wallD,6,7);
  // side roofs sloping up to the tower (left lit, right shaded)
  for(let i=0;i<=12;i++){
    const y=33+i;
    const lx=24-Math.round(i*21/12);
    const rx=39+Math.round(i*21/12);
    p.hline(lx,25,y,i<6?roofL:roofC);
    p.hline(38,rx,y,roofD);
  }
  p.hline(3,25,45,roofD);
  p.hline(38,60,45,darken(roofD,0.12));
  p.hline(6,57,46,withAlpha(P.ink,0.22));
  // wing windows (teal glass, holy frames)
  p.glow(13,55,5,P.shard,0.35);
  p.glow(50,55,5,P.shard,0.35);
  p.rect(11,51,6,9,trimD);
  p.rect(12,52,4,7,P.shardD);
  p.rect(12,52,4,2,P.shard);
  p.rect(47,51,6,9,trimD);
  p.rect(48,52,4,7,P.shardD);
  p.rect(48,52,4,2,P.shard);
  // ---- central tower ----
  p.rect(24,22,16,42,wallW);
  p.gradV(24,22,16,6,lighten(P.bone,0.1),wallW);
  p.rect(24,22,2,42,wallL);
  p.rect(38,22,2,42,wallD);
  // cornice under belfry
  p.rect(23,20,18,2,trim);
  p.hline(23,40,21,trimD);
  // belfry
  p.rect(25,11,14,9,wallW);
  p.rect(25,11,1,9,wallL);
  p.rect(38,11,1,9,wallD);
  p.rect(28,13,8,7,P.ink2);
  p.hline(29,34,12,P.ink2);
  p.hline(28,35,19,trimD);
  // bell
  p.px(31,13,P.goldD); p.px(32,13,P.goldD);
  p.rect(30,14,4,3,P.gold);
  p.px(30,14,P.goldL);
  p.hline(29,34,17,P.goldD);
  p.px(32,18,P.gold);
  // spire (tall, left-lit) + eave flare
  for(let y=3;y<=10;y++){
    const half=Math.round((y-3)*8/7);
    p.hline(31-half,32+half,y,roofC);
    p.hline(31-half,31-Math.ceil(half*0.45),y,roofL);
  }
  p.hline(22,41,10,roofD);
  p.hline(25,38,11,withAlpha(P.ink,0.2));
  // gold cross finial
  p.vline(0,2,32,P.gold);
  p.px(31,1,P.gold); p.px(33,1,P.gold);
  p.px(32,0,P.goldL);
  // ---- soulshard rose window ----
  p.glow(32,32,8,P.shard,0.45);
  p.circle(32,32,6,trim);
  p.circle(32,32,5,P.shardD);
  p.star4(32,32,4,P.shardL,P.white);
  p.px(32,32,P.white);
  p.sparkle(28,28,P.white);
  // small shard diamond over the door
  p.star4(32,43,2,P.shard,P.shardL);
  // ---- arched doorway (centered at base) ----
  p.rect(26,48,12,16,trim);
  p.hline(27,36,47,trim);
  p.rect(27,49,10,15,P.wood);
  p.hline(28,35,48,P.woodL);
  p.vline(49,63,32,darken(P.wood,0.35));
  p.vline(51,62,29,P.woodD);
  p.vline(51,62,35,P.woodD);
  p.px(30,57,P.gold); p.px(33,57,P.gold);
  // stone step
  p.rect(24,62,16,2,P.gray3);
  p.hline(24,39,62,P.gray2);
  // light + finish
  p.shadeBottom(0.1,57);
  p.rimLight(lighten(P.bone,0.4),0.3);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_fc_guild
defineSprite('town_fc_guild',64,64,(p)=>{
  const tim=P.woodD, timL=lighten(P.woodD,0.25), timD=darken(P.woodD,0.2);
  const plasT=lighten(P.bone,0.10), plasB=darken(P.bone,0.08);
  // ---- plaster wall body (x7..56, y24..63) ----
  p.gradV(7,24,50,40,plasT,plasB);
  p.speckle(9,27,46,26,darken(P.bone,0.06),24,7);
  // ---- timber frame ----
  p.rect(7,24,50,2,tim);            // top beam
  p.hline(7,56,24,lighten(P.woodD,0.2));
  p.rect(7,41,50,2,tim);            // mid beam
  p.rect(7,24,2,32,tim);            // corner posts
  p.rect(55,24,2,32,tim);
  p.rect(20,24,2,32,tim);           // inner posts
  p.rect(42,24,2,32,tim);
  p.vline(24,55,7,timL);
  p.vline(24,55,20,timL);
  p.vline(24,55,42,timL);
  // X-braces in the two lower panels
  p.line(9,55,19,44,tim); p.line(9,44,19,55,tim);
  p.line(44,55,54,44,tim); p.line(44,44,54,55,tim);
  // ---- stone base course (y56..63) ----
  p.rect(7,56,50,8,P.gray2);
  p.hline(7,56,56,lighten(P.gray2,0.2));
  p.hline(7,56,59,darken(P.gray2,0.25));
  for(let x=10;x<56;x+=8){ p.vline(57,58,x,darken(P.gray2,0.22)); p.vline(60,63,x+4,darken(P.gray2,0.22)); }
  p.speckle(8,57,48,6,lighten(P.gray2,0.15),12,3);
  // ---- left window (warm lit) ----
  p.rect(10,29,8,10,timD);
  p.rect(11,30,6,8,P.ember);
  p.gradV(11,30,6,4,P.emberL,P.ember);
  p.vline(30,37,14,timD); p.hline(11,16,33,timD);
  p.hline(9,18,39,timL);
  // ---- hanging quest signboard (right) ----
  p.hline(43,55,27,tim);            // bracket arm off the inner post
  p.px(55,28,timD);
  p.vline(28,30,46,P.gray3); p.vline(28,30,53,P.gray3); // chains
  p.rect(44,31,12,9,P.goldD);
  p.rect(45,32,10,7,P.gold);
  p.gradV(45,32,10,3,P.goldL,P.gold);
  p.vline(33,36,49,P.redD); p.vline(33,36,50,P.redD); // quest mark !
  p.px(49,38,P.redD); p.px(50,38,P.redD);
  // ---- crossed-sword crest over the door ----
  p.rect(28,33,9,7,P.steelD);
  p.hline(29,35,40,P.steelD); p.hline(30,34,41,P.steelD); p.px(32,42,P.steelD);
  p.rect(29,34,7,5,P.steel);
  p.hline(28,36,33,P.goldD);
  p.line(29,40,35,34,P.steelL); p.line(35,40,29,34,P.steelL);
  p.px(29,40,P.gold); p.px(35,40,P.gold);
  p.px(32,37,P.white);
  // ---- warm lantern beside the door ----
  p.px(22,43,P.gray3);
  p.hline(21,23,44,timD);
  p.rect(21,45,3,4,P.goldD);
  p.rect(22,46,1,2,P.emberL);
  p.hline(21,23,49,timD);
  // ---- arched door (centered, x25..39) ----
  p.rect(25,45,15,19,timD);
  p.ellipse(32,47,7,4,timD);
  p.rect(27,48,11,16,P.wood);
  p.ellipse(32,49,5,3,P.wood);
  p.gradV(27,48,11,3,lighten(P.wood,0.15),P.wood);
  p.vline(51,62,30,darken(P.wood,0.16));
  p.vline(51,62,34,darken(P.wood,0.16));
  p.px(36,55,P.goldL); p.px(36,56,P.goldD);
  p.rect(23,62,18,2,P.gray3);
  p.hline(23,40,62,lighten(P.gray3,0.25));
  // ---- gabled shingle roof ----
  const rB=P.redD, rH=lighten(P.redD,0.18), rS=darken(P.redD,0.18), rL=darken(P.redD,0.3);
  for(let y=2;y<=22;y++){
    const w=1+Math.floor((y-2)*28/20), L=Math.max(0,32-w), R=Math.min(63,32+w);
    p.hline(L,R,y,rB);
    p.hline(L,L+Math.floor(w*0.5),y,rH);
    p.hline(R-Math.floor(w*0.3),R,y,rS);
    if(y===5||y===9||y===13||y===17||y===21) p.hline(L,R,y,rL);
  }
  p.rect(31,1,3,1,rB);
  p.px(32,0,P.goldL);
  // attic vent
  p.rect(30,12,5,6,timD);
  p.rect(31,13,3,4,P.ink2);
  // eaves trim + under-eave shadow
  p.hline(3,61,22,tim);
  p.hline(5,59,23,timD);
  // ---- light & finish ----
  p.glow(14,33,5,P.emberL,0.35);
  p.glow(22,47,4,P.ember,0.4);
  p.sparkle(54,32,P.goldL,1);
  p.shadeBottom(0.1,57);
  p.rimLight(P.rim,0.3);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_fc_smith
defineSprite('town_fc_smith',64,64,(p)=>{
  const roofC = mix(P.gray2, P.blueD, 0.45);
  const roofL = lighten(roofC, 0.22);
  const roofD = darken(roofC, 0.22);
  const plas = P.bone;
  const plasD = darken(P.bone, 0.12);

  // ground contact shadow
  p.softShadow(32,62,27,3,0.35,P.ink);

  // --- chimney smoke (above everything, top-left lit) ---
  p.circle(50,3,2,P.gray4);
  p.px(48,2,lighten(P.gray4,0.3));
  p.circle(54,1,2,lighten(P.gray4,0.12));
  p.circle(46,4,1,P.gray4);
  p.px(53,4,P.emberL);
  p.sparkle(57,2,P.ember,1);

  // --- wall body: plaster ---
  p.gradV(6,29,52,35,plas,plasD);

  // --- stone base course ---
  p.gradV(6,50,52,14,P.gray3,P.gray2);
  p.hline(6,57,50,P.gray4);
  p.hline(6,57,54,darken(P.gray3,0.2));
  p.hline(6,57,58,darken(P.gray3,0.2));
  for(let x=9;x<56;x+=8){ p.vline(51,53,x,darken(P.gray3,0.18)); p.vline(55,57,x+4,darken(P.gray3,0.18)); p.vline(59,62,x,darken(P.gray3,0.18)); }
  p.speckle(7,51,50,12,P.gray2,16,9);

  // --- timber frame ---
  p.rect(6,29,52,2,P.woodD);
  p.hline(6,57,29,P.woodL);
  p.rect(6,31,2,19,P.wood);  p.vline(31,49,6,P.woodL);
  p.rect(56,31,2,19,P.wood); p.vline(31,49,57,P.woodD);
  p.rect(21,31,2,19,P.wood); p.vline(31,49,21,P.woodL);
  p.rect(41,31,2,19,P.wood); p.vline(31,49,41,P.woodL);
  p.rect(6,46,15,2,P.wood);  p.hline(6,20,46,P.woodL);
  p.rect(43,46,15,2,P.wood); p.hline(43,57,46,P.woodL);

  // --- hanging horseshoe sign (left panel) ---
  p.vline(31,33,14,P.gray4);
  p.gradV(9,34,12,9,P.woodL,P.wood);
  p.hline(9,20,34,lighten(P.woodL,0.1));
  p.hline(9,20,42,P.woodD);
  p.vline(34,42,9,P.woodL); p.vline(34,42,20,P.woodD);
  p.ring(14,38,3,P.steelL);
  p.rect(13,40,3,2,P.wood);
  p.px(12,40,P.steelD); p.px(16,40,P.steelD);
  p.px(12,36,P.white);

  // --- furnace window (right panel, warm glow) ---
  p.rect(43,32,11,10,P.woodD);
  p.gradV(44,33,9,8,P.goldL,P.ember);
  p.vline(33,40,48,P.woodD);
  p.hline(44,52,36,P.woodD);
  p.rect(42,42,13,2,P.wood); p.hline(42,54,42,P.woodL);
  p.glow(48,37,5,P.gold,0.35,3);

  // --- gabled slate roof ---
  for(let y=8;y<=28;y++){
    const half = 2 + Math.round((y-8)*1.35);
    p.hline(31-half,31+half,y,roofC);
    p.hline(31-half,30,y,roofL);
    if(y%4===3) p.hline(31-half+2,31+half-2,y,roofD);
    p.px(31-half,y,lighten(roofL,0.12));
    p.px(31+half,y,roofD);
  }
  p.hline(2,60,28,roofD);
  p.rect(29,7,5,2,roofD);
  p.hline(29,33,7,roofL);
  p.px(31,6,P.woodD); p.px(31,5,P.gold);

  // --- big stone chimney (front of right slope) ---
  p.gradV(45,9,10,18,P.gray4,P.gray3);
  p.rect(44,6,12,3,P.gray4);
  p.hline(44,55,6,lighten(P.gray4,0.25));
  p.vline(9,26,45,lighten(P.gray4,0.18));
  p.vline(9,26,54,P.gray2);
  p.hline(46,53,13,P.gray2);
  p.hline(46,53,18,P.gray2);
  p.hline(46,53,23,P.gray2);
  p.speckle(46,10,8,15,P.gray2,10,5);
  p.rect(47,5,6,1,darken(P.ember,0.2));
  p.glow(50,5,3,P.ember,0.45,3);

  // --- arched stone doorway ---
  p.rect(24,42,16,22,P.gray4);
  p.hline(26,37,40,P.gray4);
  p.hline(25,38,41,P.gray4);
  p.px(24,42,P.gray3); p.px(39,42,P.gray3);
  p.vline(43,62,24,lighten(P.gray4,0.15));
  p.vline(43,62,39,P.gray3);

  // door interior: dark forge with furnace glow rising from below
  p.hline(29,34,42,P.ink);
  p.hline(27,36,43,P.ink);
  p.gradV(26,44,12,20,P.ink,mix(P.ember,P.ink,0.5));
  p.rect(27,59,10,4,mix(P.ember,P.ink,0.3));
  p.glow(32,61,6,P.ember,0.5,4);

  // anvil silhouette against the glow
  p.rect(28,53,8,2,P.ink);
  p.px(36,53,P.ink);
  p.rect(30,55,4,3,P.ink);
  p.rect(29,58,6,2,P.ink);

  // threshold step + glow spilling out
  p.rect(23,62,18,2,P.gray4);
  p.hline(23,40,62,lighten(P.gray4,0.15));
  p.glow(32,62,7,P.ember,0.4,4);

  // drifting forge sparks
  p.sparkle(35,48,P.emberL,1);
  p.px(30,46,P.ember);
  p.sparkle(29,50,P.ember,1);

  p.rimLight(P.rim,0.35,-1,-1);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_fc_wardrobe
defineSprite('town_fc_wardrobe',64,64,(p)=>{
  const wallL=lighten(P.bone,0.16), wall=P.bone, wallD=mix(P.bone,P.gray2,0.35);
  // ---- wall body ----
  p.gradV(8,22,49,41,wallL,wall);
  p.rect(53,22,4,41,wallD); // shadow side (right)
  // corner trim posts
  p.rect(8,22,2,41,P.white);
  p.rect(55,22,2,41,mix(P.white,P.gray2,0.4));
  // ---- foundation ----
  p.rect(7,59,51,5,P.gray2);
  p.hline(7,57,59,P.gray3);
  p.speckle(8,60,49,3,P.gray1,12,9);
  // ---- gabled sakura roof ----
  for(let i=0;i<=17;i++){
    const y=2+i;
    const half=2+Math.round(i*26/17);
    const x0=32-half, x1=32+half;
    p.hline(x0,x1,y,P.sakura);
    if(i%3===2) p.hline(x0+1,x1-1,y,mix(P.sakura,P.sakuraD,0.4));
    p.hline(x1-Math.max(2,half>>2),x1,y,mix(P.sakura,P.sakuraD,0.65));
    p.hline(x0,x0+1,y,lighten(P.sakura,0.3));
  }
  // eaves + under-eave shadow
  p.hline(3,61,20,P.sakuraD);
  p.hline(4,60,21,darken(P.sakuraD,0.18));
  p.hline(8,56,22,mix(P.bone,P.ink,0.25));
  // gold finial
  p.px(32,1,P.gold); p.px(32,0,P.goldL);
  // gable heart medallion
  p.circle(32,11,4,P.white);
  p.ring(32,11,4,P.sakuraD);
  p.px(31,9,P.sakura); p.px(33,9,P.sakura);
  p.hline(30,34,10,P.sakura);
  p.hline(31,33,11,P.sakura);
  p.px(32,12,P.sakura);
  // ---- shop sign: thread spool + trailing ribbon ----
  p.rect(14,24,36,8,P.woodL);
  p.hline(14,49,24,P.woodD); p.hline(14,49,31,P.woodD);
  p.vline(24,31,14,P.woodD); p.vline(24,31,49,P.woodD);
  p.rect(28,25,2,6,P.woodD); p.rect(34,25,2,6,P.woodD); // spool caps
  p.rect(30,26,4,4,P.sakura);                            // wound thread
  p.hline(30,33,26,lighten(P.sakura,0.25));
  p.hline(30,33,29,P.sakuraD);
  p.line(36,28,41,30,P.sakura);                          // ribbon trail
  p.line(41,30,45,27,lighten(P.sakura,0.3));
  p.hline(17,24,27,P.woodD); p.hline(17,21,29,P.woodD);  // painted name dashes
  // ---- striped awning (sakura / purpleL) ----
  p.hline(9,54,33,P.sakuraD); // rail
  for(let x=10;x<=53;x++){
    const s=Math.floor((x-10)/4)%2;
    p.vline(34,40,x,s?P.purpleL:P.sakura);
  }
  for(let k=0;k<11;k++){ // scalloped hem
    const sx=10+k*4;
    p.hline(sx+1,sx+2,41,k%2?P.purpleL:P.sakura);
  }
  p.hline(10,53,34,withAlpha(P.white,0.3));          // top sheen
  p.hline(11,52,42,mix(P.bone,P.ink,0.25));          // cast shadow
  // ---- left display window: dress-form mannequin ----
  p.rect(11,44,16,15,P.white);
  p.gradV(13,46,12,11,P.hiSky,P.blueL);
  p.px(19,47,P.gray2); p.px(19,48,P.gray2);          // knob + neck
  p.hline(18,20,49,P.purpleL);
  p.hline(17,21,50,P.purpleL);
  p.hline(17,21,51,P.sakura);                        // sash
  p.hline(18,20,52,P.purpleL);
  p.hline(18,20,53,P.purpleL);
  p.hline(17,21,54,P.purpleL);                       // skirt flare
  p.px(18,50,lighten(P.purpleL,0.3));
  p.px(19,55,P.gray2); p.hline(18,20,56,P.gray2);    // pole + base
  p.line(15,47,13,49,withAlpha(P.white,0.45));       // glass glint
  p.sparkle(23,48,P.white,1);
  p.rect(10,57,18,2,P.white);                        // sill
  // ---- right display window: ribbon spool shelves ----
  p.rect(37,44,16,15,P.white);
  p.gradV(39,46,12,11,P.hiSky,P.blueL);
  p.hline(39,50,51,P.woodL);                         // shelf
  p.rect(40,48,3,3,P.sakura);  p.px(41,49,P.sakuraD);
  p.rect(44,48,3,3,P.mana);    p.px(45,49,darken(P.mana,0.25));
  p.rect(48,48,3,3,P.purpleL); p.px(49,49,P.purple);
  p.rect(42,53,3,3,P.aurora);  p.px(43,54,darken(P.aurora,0.25));
  p.rect(46,53,3,3,P.gold);    p.px(47,54,P.goldD);
  p.hline(39,50,56,P.woodL);                         // lower shelf
  p.line(49,47,47,49,withAlpha(P.white,0.45));
  p.rect(36,57,18,2,P.white);                        // sill
  // ---- arched doorway (centered) ----
  p.ellipse(32,48,4,3,P.white);                      // frame arch
  p.rect(28,48,9,15,P.white);                        // frame
  p.ellipse(32,49,3,2,P.purpleL);                    // door arch
  p.rect(29,49,7,14,P.purpleL);                      // pastel door
  p.rect(30,50,5,3,P.hiSky);                         // peep window
  p.vline(53,62,31,P.purple); p.vline(53,62,33,P.purple); // plank seams
  p.px(34,56,P.goldL); p.px(34,57,P.gold);           // knob
  p.hline(27,37,63,P.gray3);                         // doorstep
  // ---- flanking flower pots ----
  p.rect(24,60,3,3,P.clay); p.px(25,59,P.leaf); p.px(25,58,P.sakura);
  p.rect(38,60,3,3,P.clay); p.px(39,59,P.leaf); p.px(39,58,P.purpleL);
  // ---- finish ----
  p.shadeBottom(0.12,57);
  p.rimLight(lighten(P.sakura,0.3),0.3);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_fc_hall
defineSprite('town_fc_hall',64,64,(p)=>{
  const mar = P.bone, marL = lighten(P.bone,0.14), marD = darken(P.bone,0.14), marD2 = darken(P.bone,0.28);
  // main marble wall
  p.gradV(2,19,60,39, mar, marD);
  p.vline(19,57,2,marL);
  p.vline(19,57,61,marD2);
  // recessed crest panel
  p.rect(23,23,19,16,marD);
  p.hline(23,41,23,marD2);
  p.vline(23,38,23,marD2);
  p.hline(23,41,38,marL);
  // pediment (triangle roof)
  for (let y=1;y<=13;y++){
    const hw = Math.round((y-1)*29/12);
    p.hline(32-hw,32,y,marL);
    p.hline(33,32+hw,y,mar);
  }
  p.line(32,1,3,13,lighten(P.bone,0.26));
  p.line(32,1,61,13,marD2);
  p.hline(3,61,13,P.gold);
  p.px(32,0,P.goldL);
  // pediment emblem: gold star + dots
  p.star4(32,8,3,P.gold,P.goldL);
  p.px(26,10,P.goldD); p.px(38,10,P.goldD);
  // entablature beam
  p.gradV(1,15,62,4,marL,mar);
  p.hline(1,62,14,P.goldD);
  p.hline(1,62,15,lighten(P.bone,0.22));
  for (let x=3;x<=60;x+=4) p.px(x,18,marD2);
  // four marble columns (lit from top-left)
  const cols=[4,16,44,56];
  for (let i=0;i<cols.length;i++){
    const cx=cols[i];
    p.rect(cx-1,19,7,3,mar);
    p.hline(cx-1,cx+5,19,marL);
    p.hline(cx-1,cx+5,21,marD);
    p.gradH(cx,22,5,33,marL,marD2);
    p.vline(22,54,cx,lighten(P.bone,0.22));
    p.vline(22,54,cx+2,marD);
    p.rect(cx-1,55,7,3,mar);
    p.hline(cx-1,cx+5,55,marL);
  }
  // star banners between columns
  p.hline(9,15,20,P.goldD);
  p.gradV(10,21,4,14,P.blueL,P.blueD);
  p.px(10,35,P.blueD); p.px(13,35,P.blueD);
  p.star4(11,27,2,P.goldL,P.white);
  p.hline(49,55,20,P.goldD);
  p.gradV(50,21,4,14,P.blue,P.blueD);
  p.px(50,35,P.blueD); p.px(53,35,P.blueD);
  p.star4(52,27,2,P.gold,P.goldL);
  // gold laurel ring + trophy crest above the door
  p.ring(32,31,6,P.gold);
  p.ring(32,31,5,P.goldD);
  p.px(26,27,P.goldL); p.px(38,27,P.goldL);
  p.px(27,35,P.goldL); p.px(37,35,P.goldL);
  p.rect(30,28,5,3,P.goldL);
  p.px(29,28,P.gold); p.px(35,28,P.gold);
  p.vline(31,32,32,P.gold);
  p.hline(31,33,33,P.gold);
  // arched doorway (gold frame, dark interior, warm glow)
  p.circle(32,47,6,P.goldD);
  p.circle(32,47,5,P.ink2);
  p.vline(47,57,26,P.goldD);
  p.vline(47,57,38,P.goldD);
  p.rect(27,47,11,11,P.ink2);
  p.glow(32,54,4,P.gold,0.35);
  // marble steps
  p.gradV(6,58,52,2,mar,P.gray3);
  p.hline(6,57,58,marL);
  p.gradV(3,60,58,2,mar,P.gray3);
  p.hline(3,60,60,marL);
  p.gradV(1,62,62,2,mar,P.gray3);
  p.hline(1,62,62,marL);
  p.shadeBottom(0.10,58);
  p.sparkle(8,12,P.white); p.sparkle(45,5,P.goldL);
  p.rimLight(P.white,0.3);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_fc_house
defineSprite('town_fc_house',64,64,(p)=>{
  const plas = lighten(P.bone,0.06);
  const plasD = darken(P.bone,0.14);
  const roofM = P.red;
  const roofD = darken(P.red,0.28);
  const roofL = lighten(P.red,0.22);
  const wood = P.wood, woodD = P.woodD, woodL = P.woodL;

  // --- chimney smoke (drifting up-right) ---
  p.circle(45,5,2,P.gray3);
  p.circle(49,3,2,lighten(P.gray3,0.18));
  p.circle(53,1,1,lighten(P.gray3,0.3));
  p.px(44,4,P.gray2);
  p.px(48,2,P.gray2);

  // --- chimney (base gets covered by the roof) ---
  p.rect(42,8,7,18,P.clay);
  p.gradH(42,8,3,18,lighten(P.clay,0.2),P.clay);
  p.rect(41,7,9,2,P.gray2);
  p.hline(41,49,7,lighten(P.gray2,0.2));
  p.hline(43,47,9,darken(P.clay,0.35));
  p.hline(43,46,13,darken(P.clay,0.2));
  p.hline(45,48,17,darken(P.clay,0.2));
  p.hline(42,44,21,darken(P.clay,0.2));

  // --- gable roof: apex (32,10) -> eaves y=33 ---
  for(let y=10;y<=33;y++){
    const t=(y-10)/23;
    const hw=2+Math.round(t*28);
    const xl=32-hw, xr=32+hw;
    p.hline(xl,xr,y,roofM);
    if(y%4===2) p.hline(xl+2,xr-2,y,roofD);
    p.px(xl,y,lighten(roofM,0.35));
    p.px(xl+1,y,roofL);
    p.px(xr,y,roofD);
    p.px(xr-1,y,darken(roofM,0.15));
  }
  // ridge cap
  p.rect(29,8,7,3,woodD);
  p.hline(29,35,8,woodL);
  // fascia / eaves board
  p.rect(2,32,60,2,woodD);
  p.hline(2,61,32,wood);

  // --- wall body (lit from the left) ---
  p.gradH(7,34,50,30,plas,plasD);
  // eave shadow on the plaster
  p.hline(9,55,34,darken(plas,0.18));
  // timber frame
  p.rect(7,34,2,30,woodD);
  p.rect(55,34,2,30,woodD);
  p.vline(34,63,7,wood);
  p.hline(9,55,38,woodD);
  p.vline(39,63,24,withAlpha(woodD,0.5));
  p.vline(39,63,40,withAlpha(woodD,0.5));

  // --- left window: warm light + flower box ---
  p.rect(11,40,12,12,woodD);
  p.gradV(12,41,10,10,P.goldL,P.gold);
  p.vline(41,50,16,wood);
  p.hline(12,21,45,wood);
  p.px(13,42,lighten(P.goldL,0.3));
  p.glow(16,45,6,P.goldL,0.35);
  p.rect(10,52,14,3,wood);
  p.hline(10,23,52,woodL);
  p.px(12,51,P.redL); p.px(14,51,P.sakura); p.px(16,51,P.gold); p.px(18,51,P.sakuraL); p.px(20,51,P.redL);
  p.px(13,51,P.greenL); p.px(17,51,P.green); p.px(21,51,P.greenL);

  // --- right window: warm light + green shutters ---
  p.rect(41,40,12,12,woodD);
  p.gradV(42,41,10,10,P.goldL,P.gold);
  p.vline(41,50,46,wood);
  p.hline(42,51,45,wood);
  p.px(43,42,lighten(P.goldL,0.3));
  p.glow(46,45,6,P.goldL,0.3);
  p.rect(39,40,2,12,P.greenD);
  p.vline(40,51,39,P.green);
  p.rect(53,40,2,12,P.greenD);
  p.vline(40,51,53,darken(P.greenD,0.15));
  p.rect(41,52,12,1,woodL);

  // --- stone step + little wooden door (arched), centered ---
  p.rect(24,62,16,2,P.gray2);
  p.hline(24,39,62,P.gray3);
  p.rect(25,44,14,2,woodD);
  p.hline(25,38,44,woodL);
  p.rect(26,46,12,16,woodD);
  p.rect(27,47,10,15,wood);
  p.px(27,47,woodD); p.px(36,47,woodD);
  p.hline(28,35,47,woodL);
  p.vline(48,61,28,woodL);
  p.vline(48,61,30,darken(wood,0.18));
  p.vline(48,61,33,darken(wood,0.18));
  p.px(34,55,P.gold);
  p.px(34,54,P.goldL);

  // tiny lantern by the door
  p.px(38,47,P.iron);
  p.rect(37,48,2,3,P.gold);
  p.px(37,48,P.goldL);
  p.glow(38,49,3,P.goldL,0.3);

  p.shadeBottom(0.12,56);
  p.rimLight(P.hiSky,0.35,-1,-1);
  p.outline(P.ink);
},{anchor:[32,63]});

// town_water
defineAnim('town_water',16,16,2,(p,f)=>{
  const deep=darken(P.ocean,0.12), base=P.ocean, mid=mix(P.ocean,P.blue,0.5);
  p.gradV(0,0,16,16,base,deep);
  // soft drifting tone bands (wrap so the tile stays seamless)
  const wrapH=(x,y,len,col)=>{for(let i=0;i<len;i++)p.px((x+i)&15,y&15,col);};
  const sh=f*2; // frame shift
  wrapH(1+sh,1,6,mid); wrapH(9+sh,3,5,mid);
  wrapH(4-sh,5,6,mid); wrapH(12-sh,7,5,mid);
  wrapH(2+sh,9,5,mid); wrapH(10+sh,11,6,mid);
  wrapH(6-sh,13,5,mid); wrapH(13-sh,15,4,mid);
  // ripple crest highlights, offset per frame for shimmer
  wrapH(3+sh,2,3,P.oceanL); wrapH(11-sh,4,4,P.oceanL);
  wrapH(6+sh,8,3,P.oceanL); wrapH(0-sh+16,10,4,P.oceanL);
  wrapH(9+sh,14,3,P.oceanL); wrapH(14-sh,6,3,P.oceanL);
  // tiny sky glints that swap spots between frames
  if(f===0){ p.px(5,3,P.skyL); p.px(13,9,P.skyL); p.px(2,12,P.skyL); }
  else { p.px(8,2,P.skyL); p.px(1,7,P.skyL); p.px(12,13,P.skyL); }
  // faint depth flecks (different seed per frame = subtle motion)
  p.speckle(0,0,16,16,withAlpha(P.oceanD,0.5),5,7+f);
},{anchor:[0,0],fps:4});

// town_bridge
defineSprite('town_bridge',16,16,(p)=>{
  const seam=darken(P.wood,0.3), grain=darken(P.wood,0.14), nail=P.gray2;
  // deck base
  p.rect(0,0,16,16,P.wood);
  // four cross-plank rows (4px each): seam line + lit top edge
  const seams=[6,12,3,9]; // staggered vertical butt-joints per row
  for(let r=0;r<4;r++){
    const y=r*4;
    p.hline(0,15,y,seam);          // gap between planks
    p.hline(0,15,y+1,P.woodL);     // top-left light catches the plank edge
    // wood grain ticks
    p.hline(2,4,y+2,grain); p.hline(9,12,y+3,grain); p.hline(13,14,y+2,grain);
    // staggered butt-joint + nail dots either side
    const sx=seams[r];
    p.vline(y+1,y+3,sx,seam);
    p.px(sx-1,y+2,nail); p.px((sx+2)&15,y+2,nail);
  }
  // side-rail hint: darker runner along the top edge with a glint
  p.hline(0,15,0,darken(P.woodD,0.18));
  p.px(4,0,P.woodL); p.px(11,0,P.woodL);
  // soft edge shadows so the deck reads raised over the stream
  p.hline(0,15,1,withAlpha(P.ink,0.18));
  p.hline(0,15,15,darken(P.woodD,0.22));
  p.hline(0,15,14,withAlpha(P.ink,0.14));
},{anchor:[0,0]});

// town_tree
defineSprite('town_tree',24,32,(p)=>{
  p.softShadow(12,30,9,3,0.35,P.shadow);
  p.rect(10,18,4,13,P.bark);
  p.vline(18,30,10,lighten(P.bark,0.18));
  p.vline(18,30,13,P.barkD);
  p.px(9,30,P.barkD); p.px(14,30,P.barkD);
  p.px(8,30,P.bark); p.px(15,30,P.bark);
  p.ellipse(12,11,10,8,P.leafD);
  p.ellipse(12,13,8,4,P.leafD);
  p.ellipse(12,10,9,7,P.leaf);
  p.ellipse(7,8,5,4,P.leaf);
  p.ellipse(17,9,5,4,P.leaf);
  p.ellipse(12,5,6,3,P.leaf);
  p.ellipse(9,5,5,3,lighten(P.leaf,0.12));
  p.ellipse(7,7,3,2,P.leafL);
  p.speckle(4,3,11,7,P.leafL,9,7);
  p.speckle(8,11,12,5,P.leafD,7,3);
  p.px(5,11,P.leafD); p.px(19,12,P.leafD);
  p.rimLight(P.leafL,0.35,-1,-1);
  p.outline(P.ink);
},{anchor:[12,31]});

// town_tree2
defineSprite('town_tree2',28,36,(p)=>{
  p.softShadow(14,34,10,3,0.35,P.shadow);
  p.rect(12,19,4,16,P.bark);
  p.vline(19,34,12,lighten(P.bark,0.18));
  p.vline(19,34,15,P.barkD);
  p.px(11,34,P.barkD); p.px(16,34,P.barkD);
  p.px(10,34,P.bark); p.px(17,34,P.bark);
  p.line(12,22,9,18,P.barkD);
  p.line(15,22,19,18,P.barkD);
  p.ellipse(14,11,12,9,P.sakuraD);
  p.ellipse(14,14,9,5,P.sakuraD);
  p.ellipse(14,10,11,8,P.sakura);
  p.ellipse(8,8,6,5,P.sakura);
  p.ellipse(20,9,6,5,P.sakura);
  p.ellipse(14,4,7,3,P.sakura);
  p.ellipse(10,5,6,3,P.sakuraL);
  p.ellipse(8,8,3,2,P.sakuraL);
  p.speckle(4,2,14,8,P.sakuraL,12,11);
  p.speckle(10,13,14,5,P.sakuraD,8,5);
  p.px(25,7,mix(P.sakura,P.white,0.4));
  p.px(4,22,P.sakuraL); p.px(5,23,P.sakura);
  p.px(23,21,P.sakuraL);
  p.px(8,27,P.sakura);
  p.px(21,28,P.sakuraL); p.px(22,29,P.sakura);
  p.rimLight(P.sakuraL,0.35,-1,-1);
  p.outline(P.ink);
},{anchor:[14,35]});

// town_bush
defineSprite('town_bush',16,12,(p)=>{
  p.softShadow(8,10,6,2,0.3,P.shadow);
  p.ellipse(8,7,7,4,P.greenD);
  p.ellipse(5,6,4,3,P.leaf);
  p.ellipse(11,6,4,3,P.leaf);
  p.ellipse(8,4,4,3,P.leaf);
  p.ellipse(6,4,3,2,P.leafL);
  p.px(10,3,P.leafL); p.px(11,4,P.leafL);
  p.speckle(3,6,10,4,P.greenD,5,4);
  p.px(5,7,P.holy); p.px(11,8,P.holy);
  p.rimLight(P.leafL,0.3,-1,-1);
  p.outline(P.ink);
},{anchor:[8,11]});

// town_fence_h
defineSprite('town_fence_h',16,14,(p)=>{
  // rails span the full width so segments tile seamlessly left-right
  p.rect(0,5,16,2,P.wood);
  p.hline(0,15,5,P.woodL);
  p.rect(0,9,16,2,P.wood);
  p.hline(0,15,9,P.woodL);
  p.px(7,6,P.woodD); p.px(2,10,P.woodD); p.px(13,10,P.woodD);
  // two posts over the rails
  p.rect(2,2,3,11,P.wood);
  p.rect(11,2,3,11,P.wood);
  p.vline(2,12,2,P.woodL);
  p.vline(2,12,11,P.woodL);
  p.vline(3,12,4,P.woodD);
  p.vline(3,12,13,P.woodD);
  // pointed caps catching top-left light
  p.px(3,1,P.woodL);
  p.px(12,1,P.woodL);
  p.hline(2,4,2,P.woodL);
  p.hline(11,13,2,P.woodL);
  p.outline(P.ink);
},{anchor:[8,13]});

// town_fence_v
defineSprite('town_fence_v',10,18,(p)=>{
  // single sturdy post seen edge-on
  p.rect(3,3,4,14,P.wood);
  p.vline(3,16,3,P.woodL);
  p.vline(4,16,6,P.woodD);
  // flat cap board
  p.rect(2,1,6,2,P.wood);
  p.hline(2,7,1,P.woodL);
  p.px(7,2,P.woodD);
  // grain + a knot
  p.px(5,8,P.woodD);
  p.px(4,12,P.woodD);
  p.vline(10,13,5,P.woodD);
  p.outline(P.ink);
},{anchor:[5,17]});

// town_bench
defineSprite('town_bench',20,14,(p)=>{
  // iron back uprights (drawn first, peek through slat gaps)
  p.vline(1,9,3,P.iron);
  p.vline(1,9,16,P.iron);
  // backrest slats
  p.rect(2,1,16,2,P.wood);
  p.hline(2,17,1,P.woodL);
  p.rect(2,4,16,2,P.wood);
  p.hline(2,17,4,P.woodL);
  // seat
  p.rect(1,7,18,3,P.wood);
  p.hline(1,18,7,P.woodL);
  p.hline(2,17,9,P.woodD);
  p.px(6,8,P.woodD);
  p.px(12,8,P.woodD);
  // iron legs
  p.rect(3,10,2,3,P.iron);
  p.rect(15,10,2,3,P.iron);
  p.px(3,10,P.steelL);
  p.px(15,10,P.steelL);
  p.outline(P.ink);
},{anchor:[10,13]});

// town_flowerbed
defineSprite('town_flowerbed',18,12,(p)=>{
  // foliage mound
  p.rect(2,4,14,3,P.greenD);
  p.ellipse(5,4,3,2,P.greenD);
  p.ellipse(12,4,3,2,P.greenD);
  p.px(4,3,P.green); p.px(7,4,P.green); p.px(11,3,P.green); p.px(14,4,P.green);
  p.px(3,4,P.leafL); p.px(9,4,P.leafL);
  // mixed blooms
  p.px(4,2,P.sakura); p.px(5,3,P.sakura); p.px(4,3,P.sakuraL);
  p.px(8,2,P.holy); p.px(9,2,P.holyL); p.px(9,3,P.holy);
  p.px(13,2,P.manaL); p.px(12,3,P.manaL); p.px(14,3,P.mana);
  p.sparkle(6,1,P.white,1);
  // wooden planter box
  p.rect(1,7,16,4,P.wood);
  p.hline(1,16,7,P.woodL);
  p.vline(8,10,1,P.woodL);
  p.vline(8,10,16,P.woodD);
  p.hline(2,15,10,P.woodD);
  p.vline(8,10,6,P.woodD);
  p.vline(8,10,11,P.woodD);
  p.outline(P.ink);
},{anchor:[9,11]});

// town_fc_stall
defineSprite('town_fc_stall',28,28,(p)=>{
  // support posts
  p.rect(2,8,2,19,P.wood);
  p.rect(24,8,2,19,P.wood);
  p.vline(8,26,2,P.woodL);
  p.vline(8,26,25,P.woodD);
  // crate of goods up on the counter (behind the awning fringe)
  p.rect(6,10,6,6,P.wood);
  p.hline(6,11,10,P.woodL);
  p.vline(10,15,6,P.woodL);
  p.line(6,10,11,15,P.woodD);
  p.line(11,10,6,15,P.woodD);
  // fruit beside the crate
  p.circle(16,14,1,P.red);
  p.px(15,13,P.redL);
  p.circle(20,14,1,P.gold);
  p.px(19,13,P.goldL);
  // counter (top board + plank front)
  p.rect(3,15,22,2,P.woodL);
  p.hline(3,24,16,P.woodD);
  p.rect(4,17,20,10,P.wood);
  p.vline(18,26,9,P.woodD);
  p.vline(18,26,14,P.woodD);
  p.vline(18,26,19,P.woodD);
  p.hline(4,23,17,P.woodL);
  // little sign plank on the front
  p.rect(10,19,8,5,P.bone);
  p.hline(11,16,21,P.woodD);
  p.px(12,22,P.woodD); p.px(15,22,P.woodD);
  // striped cloth canopy over everything
  for(let x=0;x<28;x+=8){ p.rect(x,3,4,6,P.red); p.rect(x+4,3,4,6,P.white); }
  p.hline(2,25,2,P.redD);
  // scalloped fringe
  for(let x=0;x<28;x+=8){ p.hline(x+1,x+2,9,P.red); p.hline(x+5,x+6,9,P.white); }
  p.hline(0,27,8,P.redD);
  p.hline(1,6,3,P.redL);
  p.outline(P.ink);
},{anchor:[14,27]});
