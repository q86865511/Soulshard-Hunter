// R18/B10 — personal-room decorations (10) + mini-pet followers (3). Hand-integrated from a
// Fable(draw)->Opus(verify) workflow. Purely cosmetic; placement/equip logic lives in
// content/room_decor.js + content/pets.js.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// rd_planter
defineSprite('rd_planter',22,22,(p)=>{
  const potHi = lighten(P.clay,0.22);
  const potSh = darken(P.clay,0.2);
  // legs of the tiered stand
  p.vline(9,19,4,P.woodD); p.vline(9,19,5,P.wood);
  p.vline(9,19,16,P.wood); p.vline(9,19,17,P.woodD);
  // feet
  p.rect(3,20,4,2,P.woodD); p.rect(15,20,4,2,P.woodD);
  p.hline(3,6,20,P.wood); p.hline(15,18,20,P.wood);
  // bottom shelf (wide)
  p.rect(2,15,18,2,P.wood);
  p.hline(2,19,15,P.woodL);
  p.hline(2,19,16,P.woodD);
  // top shelf (narrow)
  p.rect(7,8,8,2,P.wood);
  p.hline(7,14,8,P.woodL);
  p.hline(7,14,9,P.woodD);
  // --- top pot (terracotta) ---
  p.rect(8,4,6,1,P.bronze);
  p.rect(9,5,4,3,P.clay);
  p.vline(5,7,9,potHi);
  p.vline(5,7,12,potSh);
  // top foliage + sakura blooms
  p.ellipse(11,3,3,2,P.greenD);
  p.px(8,3,P.green); p.px(13,2,P.green); p.px(10,4,P.greenL);
  p.px(9,1,P.sakura); p.px(10,0,P.sakuraL); p.px(12,1,P.sakura);
  p.px(11,2,P.sakuraL); p.px(13,3,P.holy);
  // --- lower left pot ---
  p.rect(6,11,4,1,P.bronze);
  p.rect(6,12,4,3,P.clay);
  p.vline(12,14,6,potHi);
  p.vline(12,14,9,potSh);
  p.ellipse(7,10,2,1,P.greenD);
  p.px(7,9,P.holy); p.px(8,10,P.holyL);
  // --- lower right pot ---
  p.rect(12,11,4,1,P.bronze);
  p.rect(12,12,4,3,P.clay);
  p.vline(12,14,12,potHi);
  p.vline(12,14,15,potSh);
  p.ellipse(14,10,2,1,P.greenD);
  p.px(13,9,P.manaL); p.px(14,10,P.mana);
  // finish
  p.sparkle(16,2,P.holyL);
  p.rimLight(P.rim,0.4);
  p.outline(P.ink);
},{anchor:[11,21]});

// rd_rug
defineSprite('rd_rug',26,16,(p)=>{
  // plush oval rug, flat on the floor at a slight angle
  p.ellipse(13,8,12,7,P.redD);
  p.ellipse(13,8,10,6,P.red);
  p.ellipse(13,8,7,4,P.gold);
  p.ellipse(13,8,5,3,P.bone);
  // woven dot motifs around the red band
  p.px(8,4,P.goldL); p.px(18,4,P.goldL);
  p.px(8,12,P.goldL); p.px(18,12,P.goldL);
  p.px(5,8,P.goldL); p.px(21,8,P.goldL);
  p.px(13,3,P.goldL); p.px(13,13,P.goldL);
  // center diamond motif on the bone field
  p.px(13,7,P.red); p.px(12,8,P.red); p.px(14,8,P.red); p.px(13,9,P.red);
  p.px(13,8,P.gold);
  // soft pile highlights (top-left light)
  p.px(7,5,lighten(P.red,0.2)); p.px(10,3,lighten(P.red,0.2));
  p.px(8,6,lighten(P.gold,0.25)); p.px(9,5,lighten(P.gold,0.25));
  p.px(11,7,lighten(P.bone,0.15)); p.px(12,6,lighten(P.bone,0.15));
  p.rimLight(lighten(P.red,0.3),0.4);
  p.shadeBottom(0.12,10);
  p.outline(P.ink);
},{anchor:[13,15]});

// rd_painting
defineSprite('rd_painting',22,18,(p)=>{
  // splayed easel legs + center back leg
  p.line(6,14,3,17,P.woodD);
  p.line(15,14,18,17,P.woodD);
  p.vline(14,17,11,P.woodD);
  // ornate gold frame
  p.rect(3,0,16,14,P.goldD);
  p.rect(4,1,14,12,P.gold);
  // corner studs + top crest catching the light
  p.px(3,0,P.goldL); p.px(18,0,P.goldL);
  p.px(3,13,P.goldL); p.px(18,13,P.goldL);
  p.px(10,0,P.goldL); p.px(11,0,P.goldL);
  // canvas: warm sunset sky
  p.gradV(5,2,12,6,P.sky,P.holy);
  p.glow(13,4,2,P.holyL,0.5,3);
  p.circle(13,4,1,P.holyL);
  p.px(13,4,P.white);
  // rolling green hills
  p.ellipse(8,8,3,2,P.leafD);
  p.ellipse(14,9,2,2,P.leaf);
  p.rect(5,9,12,3,P.leaf);
  p.hline(5,16,11,P.leafD);
  p.px(7,7,lighten(P.leafD,0.2));
  // wooden easel ledge under the frame
  p.hline(2,19,14,P.woodL);
  p.hline(2,19,15,P.wood);
  p.rimLight(P.glint,0.4);
  p.outline(P.ink);
},{anchor:[11,17]});

// rd_fireplace
defineSprite('rd_fireplace',26,24,(p)=>{
  const stone=P.gray2, stoneD=P.gray1, stoneL=lighten(P.gray2,0.22);
  const soot='#1c1210';
  p.softShadow(13,23,12,2,0.35);
  // chimney stub above the mantel
  p.rect(7,0,12,3,stone);
  p.hline(7,18,0,stoneL);
  p.vline(0,2,7,stoneL);
  p.vline(0,2,18,stoneD);
  // wooden mantel shelf
  p.rect(2,3,22,3,P.wood);
  p.hline(2,23,3,P.woodL);
  p.hline(2,23,5,P.woodD);
  p.vline(3,5,2,P.woodL);
  p.vline(3,5,23,P.woodD);
  // stone body
  p.rect(3,6,20,15,stone);
  p.hline(3,22,6,stoneL);
  p.vline(6,20,3,stoneL);
  p.vline(6,20,22,stoneD);
  // mortar block seams on the side pillars
  p.hline(3,7,11,stoneD); p.hline(18,22,11,stoneD);
  p.hline(3,7,16,stoneD); p.hline(18,22,16,stoneD);
  p.px(5,8,stoneL); p.px(20,13,stoneL);
  p.speckle(3,6,20,15,stoneD,10,7);
  // arched firebox opening
  p.rect(8,10,10,11,soot);
  p.hline(9,16,9,soot);
  p.vline(9,20,7,stoneD);
  p.vline(9,20,18,stoneD);
  // hearth glow
  p.glow(13,17,5,P.ember,0.55);
  // logs
  p.rect(9,19,8,2,P.barkD);
  p.hline(9,16,19,P.bark);
  p.px(11,20,P.emberL); p.px(14,20,P.emberL);
  // crackling fire
  p.ellipse(13,17,3,3,P.ember);
  p.px(10,15,P.ember); p.px(16,15,P.ember);
  p.ellipse(13,17,2,2,P.emberL);
  p.px(13,13,P.ember); p.px(12,14,P.emberL); p.px(14,14,P.emberL);
  p.px(12,17,P.goldL); p.px(13,16,P.gold); p.px(13,17,P.goldL); p.px(14,17,P.gold);
  p.sparkle(11,12,P.emberL); p.sparkle(15,13,P.gold);
  // hearth base slab
  p.rect(1,21,24,3,stone);
  p.hline(1,24,21,stoneL);
  p.shadeBottom(0.18,22);
  // warm firelight spill onto the slab
  p.hline(10,15,21,mix(stoneL,P.emberL,0.45));
  p.outline(P.ink);
},{anchor:[13,23]});

// rd_bookwall
defineSprite('rd_bookwall',26,26,(p)=>{
  const wd=P.woodD;
  const edge=darken(wd,0.25), lite=lighten(wd,0.2), cav=darken(wd,0.5);
  p.softShadow(13,25,11,2,0.35,P.ink);
  // wooden case
  p.rect(3,4,20,22,wd);
  p.hline(3,22,4,lite);
  p.vline(4,25,3,edge);
  p.vline(4,25,22,edge);
  p.hline(3,22,25,edge);
  // shelf cavities (dark interior)
  p.rect(5,5,16,6,cav);
  p.rect(5,12,16,6,cav);
  p.rect(5,19,16,6,cav);
  // shelf-board top highlights
  p.hline(5,20,11,lite);
  p.hline(5,20,18,lite);
  // --- top shelf (books stand on y10) ---
  p.rect(5,6,2,5,P.red);
  p.rect(7,5,2,6,P.blue);
  p.rect(9,7,2,4,P.gold);
  p.rect(11,6,2,5,P.green);
  p.line(13,10,15,6,P.purple);
  p.line(14,10,16,6,P.purple);
  p.rect(17,5,2,6,P.red);
  p.rect(19,6,2,5,P.blue);
  p.px(5,6,lighten(P.red,0.3));
  p.px(7,5,lighten(P.blue,0.3));
  p.px(9,7,lighten(P.gold,0.3));
  p.px(11,6,lighten(P.green,0.3));
  p.px(17,5,lighten(P.red,0.3));
  p.px(19,6,lighten(P.blue,0.3));
  // --- middle shelf (books stand on y17) ---
  p.rect(5,12,2,6,P.purple);
  p.rect(7,13,2,5,P.gold);
  p.line(11,17,9,13,P.green);
  p.line(12,17,10,13,P.green);
  p.rect(13,12,2,6,P.blue);
  p.px(5,12,lighten(P.purple,0.3));
  p.px(7,13,lighten(P.gold,0.3));
  p.px(13,12,lighten(P.blue,0.3));
  // small flat stack on the right
  p.rect(16,17,5,1,P.red);
  p.rect(16,16,4,1,P.gold);
  p.rect(17,15,3,1,P.green);
  // --- bottom shelf (books stand on y24) ---
  p.rect(5,20,2,5,P.gold);
  p.rect(7,19,2,6,P.green);
  p.rect(9,20,2,5,P.purple);
  p.rect(11,19,2,6,P.red);
  p.rect(13,21,2,4,P.blue);
  p.line(16,24,18,20,P.gold);
  p.line(17,24,19,20,P.gold);
  p.rect(19,19,2,6,P.green);
  p.px(5,20,lighten(P.gold,0.3));
  p.px(7,19,lighten(P.green,0.3));
  p.px(9,20,lighten(P.purple,0.3));
  p.px(11,19,lighten(P.red,0.3));
  p.px(13,21,lighten(P.blue,0.3));
  p.px(19,19,lighten(P.green,0.3));
  // little candle on top
  p.rect(16,2,2,2,P.bone);
  p.px(17,2,lighten(P.bone,0.2));
  p.px(16,1,P.emberL);
  p.glow(16,1,2,P.ember,0.45);
  p.shadeBottom(0.15);
  p.rimLight(P.rim,0.3);
  p.outline(P.ink);
},{anchor:[13,25]});

// rd_trophycase
defineSprite('rd_trophycase',24,24,(p)=>{
  const wd=P.woodD, w=P.wood, wl=P.woodL;
  const glass=withAlpha(P.white,0.22), glass2=withAlpha(P.white,0.12);
  p.softShadow(12,23,9,2,0.35,P.shadow);
  // legs
  p.rect(4,21,2,3,wd); p.rect(18,21,2,3,wd);
  // top cap (light from top-left)
  p.rect(2,2,20,2,w);
  p.hline(2,21,2,wl);
  p.star4(12,1,1,P.goldL,P.white);
  // side frame columns
  p.rect(3,4,2,17,wd);
  p.rect(19,4,2,17,wd);
  p.vline(5,18,4,w);
  // bottom board
  p.rect(3,19,18,2,w);
  p.hline(4,20,19,wl);
  // dark interior back
  p.gradV(5,4,14,15,'#343b4d','#20242f');
  // middle shelf
  p.rect(5,11,14,1,wl);
  p.hline(5,18,12,withAlpha(P.ink,0.35));
  // --- upper shelf: grand gold cup ---
  p.hline(10,13,5,P.goldL);
  p.rect(10,6,4,2,P.gold);
  p.px(9,5,P.gold); p.px(14,5,P.gold);
  p.px(9,6,P.goldD); p.px(14,6,P.goldD);
  p.rect(11,8,2,1,P.goldD);
  p.rect(10,9,4,1,P.goldD);
  p.rect(9,10,6,1,wd);
  p.px(10,6,P.goldL);
  p.sparkle(13,6,P.white);
  // --- lower shelf: medal + bronze cup ---
  p.px(7,14,P.red); p.px(9,14,P.redD); p.px(8,15,P.red);
  p.circle(8,17,1,P.gold);
  p.px(8,17,P.goldL);
  const brL=lighten(P.bronze,0.25), brD=darken(P.bronze,0.2);
  p.hline(14,16,14,brL);
  p.rect(14,15,3,2,P.bronze);
  p.px(14,15,brL);
  p.px(15,17,brD);
  p.rect(14,18,3,1,brD);
  // glass sheen over contents
  p.line(6,17,15,8,glass);
  p.line(9,18,17,10,glass2);
  // nameplate on front board
  p.rect(10,20,4,1,P.goldD);
  p.px(11,20,P.gold);
  p.rimLight(P.rim,0.3);
  p.outline(P.ink);
},{anchor:[12,23]});

// rd_chandelier
defineSprite('rd_chandelier',22,22,(p)=>{
  const g=P.gold, gl=P.goldL, gd=P.goldD;
  const cr=P.shard, crl=P.shardL, crd=P.shardD;
  // ceiling chain
  p.px(11,0,P.gray3); p.px(11,1,P.gray2); p.px(11,2,P.gray3); p.px(11,3,P.gray2);
  // central gold stem
  p.vline(4,11,11,g); p.px(11,4,gl); p.px(11,5,gl);
  // curved support arms down to the lower tier
  p.line(11,9,5,11,gd); p.line(11,9,17,11,gd);
  // upper tier arm
  p.hline(7,15,8,g); p.px(7,8,gl); p.px(8,8,gl); p.px(15,8,gd);
  // lower tier arm (lit from the left)
  p.gradH(3,11,17,1,gl,g); p.px(19,11,gd);
  // candles - upper tier ends
  p.vline(6,7,7,P.bone); p.px(7,6,P.white);
  p.vline(6,7,15,P.bone);
  p.px(7,5,P.emberL); p.px(7,4,P.ember);
  p.px(15,5,P.emberL); p.px(15,4,P.ember);
  // candles - lower tier ends
  p.vline(9,10,4,P.bone); p.px(4,9,P.white);
  p.vline(9,10,18,P.bone);
  p.px(4,8,P.emberL); p.px(18,8,P.emberL);
  // crystal teardrops dripping from the lower arm
  p.px(6,12,crl); p.px(6,13,cr);
  p.px(9,12,crl); p.px(9,13,cr); p.px(9,14,crd);
  p.px(13,12,crl); p.px(13,13,cr); p.px(13,14,crd);
  p.px(16,12,crl); p.px(16,13,cr);
  // big central crystal finial
  p.px(11,12,gd); p.px(11,13,gd);
  p.px(11,14,crl);
  p.hline(10,12,15,cr); p.px(10,15,crl);
  p.hline(10,12,16,cr); p.px(12,16,crd);
  p.px(11,17,cr); p.px(11,18,crd);
  // warm candlelight + crystal shimmer
  p.glow(7,5,2,P.emberL,0.5,3); p.glow(15,5,2,P.emberL,0.5,3);
  p.glow(4,8,2,P.emberL,0.4,3); p.glow(18,8,2,P.emberL,0.4,3);
  p.glow(11,15,3,P.shardL,0.4,3);
  p.sparkle(6,12,P.white); p.sparkle(13,13,P.white);
  p.star4(11,15,1,crl,P.white);
  p.outline(P.ink);
},{anchor:[11,21]});

// rd_aquarium
defineSprite('rd_aquarium',24,20,(p)=>{
  const glassHi = withAlpha(P.white,0.45);
  // wood stand (cabinet)
  p.rect(2,15,20,2,P.wood);
  p.hline(2,21,15,P.woodL);
  p.rect(3,17,18,3,P.woodD);
  p.vline(17,19,3,darken(P.woodD,0.2));
  p.vline(17,19,20,darken(P.woodD,0.25));
  p.hline(3,20,19,darken(P.woodD,0.3));
  p.px(11,18,P.bronze); p.px(12,18,P.bronze); // drawer handle
  // tank frame
  p.hline(4,19,2,P.steel);
  p.hline(4,19,13,P.steelD);
  p.vline(2,13,4,P.steel);
  p.vline(2,13,19,P.steelD);
  p.px(4,2,P.steelL); // top-left corner catches light
  // water
  p.gradV(5,3,14,10,P.blueL,P.blueD);
  p.hline(5,18,3,lighten(P.blueL,0.3)); // surface line
  // gravel bed
  p.hline(5,18,12,P.sand);
  p.speckle(5,12,14,1,P.sandD,4,7);
  // soulshard cluster (glowing)
  p.px(7,11,P.shard);
  p.px(8,11,P.shard);
  p.px(9,11,P.shardD);
  p.px(8,10,P.shard);
  p.px(8,9,P.shardL);
  p.glow(8,10,3,P.shardL,0.4,3);
  // shard-fish one (swimming right)
  p.rect(13,5,2,1,P.shardL);
  p.px(12,5,P.shard); // tail
  // shard-fish two (swimming left)
  p.rect(14,9,2,1,P.shardL);
  p.px(16,9,P.shard); // tail
  p.glow(14,5,2,P.shardL,0.3,2);
  p.glow(15,9,2,P.shardL,0.3,2);
  // bubbles
  p.px(6,5,glassHi);
  p.px(17,4,P.white);
  p.px(16,7,glassHi);
  // glass shine, top-left light
  p.vline(4,8,6,glassHi);
  p.px(7,4,glassHi);
  p.rimLight(P.rim,0.4,-1,-1);
  p.outline(P.ink);
},{anchor:[12,19]});

// rd_impdoll
defineSprite('rd_impdoll',16,18,(p)=>{
  const pur=P.purple, purD=P.purpleD, purL=P.purpleL;
  p.softShadow(8,17,7,1,0.3,P.ink);
  p.rect(4,16,8,2,P.wood);
  p.hline(4,11,16,P.woodL);
  p.hline(4,11,17,P.woodD);
  p.rect(7,14,2,2,P.woodD);
  p.px(12,13,pur); p.px(13,12,pur); p.px(14,11,purD);
  p.px(14,10,P.magenta); p.px(13,10,P.magentaD);
  p.ellipse(8,12,3,2,pur);
  p.px(5,11,pur); p.px(4,12,purD);
  p.px(11,11,pur); p.px(12,12,purD);
  p.px(6,14,purD); p.px(10,14,purD);
  p.ellipse(8,12,2,1,lighten(pur,0.28));
  p.px(8,12,P.holy);
  p.circle(8,6,4,pur);
  p.px(3,6,pur); p.px(3,5,pur); p.px(2,4,purD);
  p.px(13,6,pur); p.px(13,5,pur); p.px(14,4,purD);
  p.px(5,3,P.magenta); p.px(4,2,P.magentaL);
  p.px(11,3,P.magenta); p.px(12,2,P.magentaL);
  p.px(6,3,purL); p.px(7,3,purL); p.px(5,4,purL);
  p.px(5,5,P.holy); p.px(7,7,P.holy); p.px(7,5,P.holy); p.px(5,7,P.holy);
  p.px(9,5,P.holy); p.px(11,7,P.holy); p.px(11,5,P.holy); p.px(9,7,P.holy);
  p.hline(7,9,9,darken(pur,0.35));
  p.px(8,10,darken(pur,0.35));
  p.sparkle(13,2,P.holy,1);
  p.rimLight(P.rim,0.4);
  p.outline(P.ink);
},{anchor:[8,17]});

// rd_throne
defineSprite('rd_throne',24,28,(p)=>{
  const G=P.gold, GL=P.goldL, GD=P.goldD;
  p.softShadow(12,26,11,2,0.35,P.ink);
  // tall side posts with orb finials
  p.rect(3,4,2,18,G); p.rect(19,4,2,18,G);
  p.vline(4,21,3,GL); p.vline(4,21,20,GD);
  p.rect(3,2,2,2,GL); p.rect(19,2,2,2,GL);
  p.px(3,2,P.glint);
  // gilded backrest slab
  p.gradV(5,3,14,14,GL,G);
  p.vline(3,16,18,GD);
  // crown: center peak + side peaks, ruby set in the crest
  p.rect(10,0,4,3,G); p.rect(6,1,3,2,G); p.rect(15,1,3,2,G);
  p.px(10,0,GL); p.px(6,1,GL);
  p.px(11,1,P.red); p.px(12,1,P.redL);
  // red velvet back panel with tufting
  p.gradV(7,5,10,10,P.red,P.redD);
  p.dither(7,11,10,4,P.redD,P.red);
  p.px(8,6,P.redL);
  p.px(9,8,P.redD); p.px(12,8,P.redD); p.px(15,8,P.redD);
  // gem inlays on the posts
  p.px(4,8,P.shardL); p.px(4,14,P.shard);
  p.px(19,8,P.shard); p.px(19,14,P.shard);
  // armrests
  p.rect(2,16,6,2,G); p.rect(16,16,6,2,G);
  p.hline(2,7,16,GL); p.hline(16,21,16,GL);
  p.px(2,16,P.glint); p.px(21,17,GD);
  // plush seat cushion
  p.gradV(5,18,14,3,P.red,P.redD);
  p.hline(5,18,18,P.redL);
  // gold seat trim + stepped base
  p.hline(4,19,21,GD);
  p.rect(4,22,16,2,G);
  p.hline(4,19,22,GL);
  p.rect(2,24,20,4,G);
  p.hline(2,21,24,GL);
  // jeweled base front
  p.px(7,25,P.red); p.px(12,25,P.shard); p.px(16,25,P.red);
  p.shadeBottom(0.25,23);
  p.rimLight(P.glint,0.45);
  p.sparkle(17,4,P.white,1);
  p.outline(P.ink);
},{anchor:[12,27]});

// pet_slime
defineAnim('pet_slime',12,11,2,(p,f)=>{
  const sq = f===1;
  const bod = withAlpha(P.green,0.85);
  const core = withAlpha(P.greenD,0.8);
  const hi = withAlpha(P.greenL,0.9);
  p.softShadow(6,10,4,1,0.3,P.shadow);
  if(sq){
    p.ellipse(6,8,5,2,bod);
    p.ellipse(6,6,4,2,bod);
  } else {
    p.ellipse(6,8,4,2,bod);
    p.ellipse(6,5,3,3,bod);
  }
  p.ellipse(6,sq?8:7,3,1,core);
  p.px(4,sq?4:3,hi);
  p.px(3,sq?5:4,withAlpha(P.greenL,0.7));
  const ey = sq?6:5;
  p.px(4,ey,P.white); p.px(8,ey,P.white);
  p.px(4,ey+1,P.ink); p.px(8,ey+1,P.ink);
  p.px(6,ey+2,P.greenD);
  p.sparkle(8,sq?4:3,withAlpha(P.white,0.8),1);
  p.outline(P.ink);
},{anchor:[6,10],fps:4});

// pet_ghostcat
defineAnim('pet_ghostcat',14,13,2,(p,f)=>{
  const oy = f===1 ? -1 : 0;
  const bod = withAlpha(mix(P.skyL,P.white,0.55),0.88);
  const dim = withAlpha(P.skyL,0.8);
  p.softShadow(7,12,3,1,0.25,P.shadow);
  p.glow(7,6+oy,4,P.rimCool,0.2,3);
  p.px(11,9+oy,dim); p.px(12,8+oy,dim); p.px(13,7+oy,dim); p.px(12,6+oy,withAlpha(P.white,0.7));
  p.ellipse(7,6+oy,4,4,bod);
  p.px(4,11+oy,dim); p.px(7,11+oy,dim); p.px(10,11+oy,dim);
  p.vline(1+oy,2+oy,4,bod); p.vline(1+oy,2+oy,10,bod);
  p.px(4,2+oy,withAlpha(P.sakura,0.85)); p.px(10,2+oy,withAlpha(P.sakura,0.85));
  p.rect(4,5+oy,2,2,P.manaL); p.rect(8,5+oy,2,2,P.manaL);
  p.px(4,5+oy,P.white); p.px(8,5+oy,P.white);
  p.glow(5,6+oy,2,P.mana,0.3,2); p.glow(9,6+oy,2,P.mana,0.3,2);
  p.px(7,8+oy,withAlpha(P.sakura,0.9));
  p.px(2,7+oy,withAlpha(P.white,0.5));
  p.px(5,3+oy,withAlpha(P.white,0.8));
  p.rimLight(P.rimCool,0.4);
  p.outline(P.ink);
},{anchor:[7,12],fps:4});

// pet_imp
defineAnim('pet_imp',13,15,2,(p,f)=>{
  const oy = f===1 ? -1 : 0;
  const bod = P.purple, lit = P.purpleL, drk = P.purpleD;
  p.softShadow(6,14,3,1,0.35,P.shadow);
  const tip = f===1 ? 6 : 10;
  p.line(4,9+oy,1,tip+oy,drk);
  p.line(4,10+oy,1,tip+1+oy,drk);
  p.px(2,tip+1+oy,withAlpha(drk,0.9));
  p.line(8,9+oy,11,tip+oy,drk);
  p.line(8,10+oy,11,tip+1+oy,drk);
  p.px(10,tip+1+oy,withAlpha(drk,0.9));
  p.px(8,12+oy,drk); p.px(9,12+oy,drk); p.px(10,11+oy,drk); p.px(10,10+oy,drk); p.px(10,9+oy,P.magenta);
  p.rect(4,12+oy,2,2,drk); p.rect(7,12+oy,2,2,drk);
  p.ellipse(6,9+oy,3,3,bod);
  p.circle(6,5+oy,3,bod);
  p.px(4,2+oy,drk); p.px(3,1+oy,P.bone);
  p.px(8,2+oy,drk); p.px(9,1+oy,P.bone);
  p.px(5,5+oy,P.magentaL); p.px(7,5+oy,P.magentaL);
  p.glow(6,5+oy,2,P.magenta,0.3,2);
  p.hline(5,7,7+oy,darken(bod,0.4));
  p.px(6,8+oy,P.white);
  p.ellipse(6,10+oy,2,1,lit);
  p.px(4,3+oy,lit);
  p.rimLight(P.magentaL,0.35);
  p.outline(P.ink);
},{anchor:[6,14],fps:4});
