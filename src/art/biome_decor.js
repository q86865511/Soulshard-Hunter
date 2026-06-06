// Rich per-biome decoration sets (round 7 — "living biomes" pass). Each biome gets
// a mix of natural + man-made props so maps read as distinct, populated places —
// not one sprite scattered. This pass enriches every original bd_* / dec_* set with
// a committed top-left light source, 3-4 tonal steps per material, rim light, soft
// ground shadows and subtle anime VFX (kira sparkles, glowing cores, neon trims).
//
// It ALSO adds five new biome decor families — verdant / desert / swamp / abyss /
// celestial — each with 5 sprites, several animated and "alive" (glowing flowers,
// drifting fireflies, swaying kelp, bubbling water, anglerfish lure-glow, drifting
// feathers, twinkling stars). DECOR_SETS (exported) is consumed by maps.js placement;
// DECOR_CLUSTERS lists the "feature" subset worth placing in small clusters.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ============================ CRYPT 幽影地穴 ============================
defineSprite('bd_crypt_pillar', 14, 28, (p) => {            // broken stone pillar
  p.softShadow(7, 27, 7, 2, 0.42);
  p.rect(2, 24, 10, 4, P.gray1); p.rect(2, 24, 10, 1, P.gray3);
  // shaft: core + left light + right shadow + a vertical specular seam
  p.rect(4, 6, 6, 19, P.gray2);
  p.rect(4, 6, 2, 19, P.gray3);
  p.rect(9, 6, 1, 19, darken(P.gray1, 0.15));
  p.vline(5, 7, 17, lighten(P.gray3, 0.18));
  p.rect(3, 4, 8, 3, P.gray3);                              // shattered cap
  p.px(4, 4, lighten(P.gray3, 0.2)); p.px(5, 3, lighten(P.gray3, 0.2));
  // cracks + weathering
  p.line(5, 10, 9, 14, darken(P.gray1, 0.25));
  p.line(7, 16, 6, 22, darken(P.gray1, 0.2));
  p.speckle(4, 7, 6, 17, darken(P.gray1, 0.3), 5, 71);
  p.px(6, 4, P.gray1); p.px(8, 5, darken(P.gray1, 0.2));
  // faint moonlit cool rim on the left edge
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: [7, 27] });
defineSprite('bd_crypt_tomb', 14, 16, (p) => {              // tombstone
  p.softShadow(7, 15, 6, 1.6, 0.4);
  p.rect(2, 14, 10, 2, darken(P.gray1, 0.3));
  p.rect(4, 3, 6, 12, P.gray2); p.ellipse(7, 3, 3, 3, P.gray2);
  p.rect(4, 3, 2, 12, P.gray3); p.px(5, 1, lighten(P.gray3, 0.2));
  // engraved cross / RIP marks
  p.hline(5, 9, 7, darken(P.gray1, 0.3)); p.hline(5, 8, 9, darken(P.gray1, 0.3)); p.hline(5, 9, 11, darken(P.gray1, 0.3));
  p.vline(7, 6, 6, darken(P.gray1, 0.25));
  // creeping moss at the base for life
  p.px(4, 13, P.moss); p.px(9, 12, darken(P.moss, 0.1)); p.px(5, 14, P.moss);
  p.rimLight(P.rimCool, 0.38);
  p.outline(P.ink);
}, { anchor: [7, 15] });
defineSprite('bd_crypt_bones', 16, 10, (p) => {             // skull + crossed bones
  p.softShadow(8, 9, 6, 1.4, 0.36);
  p.ellipse(5, 6, 3, 2.6, P.bone); p.ellipse(4, 5, 1.4, 1.2, lighten(P.bone, 0.15));
  p.rect(4, 8, 3, 2, darken(P.bone, 0.18));
  // hollow eyes with a faint ghost-glow
  p.glow(4, 6, 1.4, P.toxic, 0.4, 3); p.glow(6, 6, 1.4, P.toxic, 0.4, 3);
  p.px(4, 6, P.ink); p.px(6, 6, P.ink);
  p.line(9, 9, 14, 5, P.bone); p.line(10, 5, 13, 9, darken(P.bone, 0.12));
  p.px(9, 9, lighten(P.bone, 0.2)); p.px(14, 5, lighten(P.bone, 0.2)); p.px(13, 9, lighten(P.bone, 0.2)); p.px(10, 5, lighten(P.bone, 0.2));
  p.outline(P.ink);
}, { anchor: [8, 9] });
defineAnim('bd_crypt_candles', 12, 18, 3, (p, f) => {       // candelabra (lit)
  p.softShadow(6, 17, 5, 1.4, 0.4);
  p.rect(3, 15, 6, 3, P.gray1); p.rect(3, 15, 6, 1, P.gray3); p.vline(10, 16, 6, P.gray2);
  p.rect(2, 7, 2, 5, P.bone); p.rect(8, 7, 2, 5, P.bone); p.rect(5, 6, 2, 6, P.bone);
  p.vline(2, 7, 5, lighten(P.bone, 0.15)); p.vline(5, 6, 6, lighten(P.bone, 0.15));
  const fl = [0, 1, -1][f];
  // soft flame glow + bright cores + tiny spark
  p.glow(3, 5 + fl, 2.4, P.ember, 0.5, 3);
  p.glow(9, 5 + fl, 2.4, P.ember, 0.5, 3);
  p.glow(6, 4 + fl, 2.6, P.emberL, 0.5, 3);
  p.px(2, 6 + fl, P.emberL); p.px(8, 6 + fl, P.ember); p.px(5, 5 + fl, P.emberL);
  p.px(6, 3 + fl, P.white);
  if (f === 1) p.sparkle(6, 2, P.holy, 1);
  p.outline(P.ink);
}, { anchor: [6, 17], fps: 6 });

// ============================ CAVERN 水晶洞窟 ============================
defineAnim('bd_cav_cluster', 18, 20, 2, (p, f) => {         // big crystal cluster
  p.softShadow(9, 18, 7, 2.2, 0.45);
  p.ellipse(9, 18, 7, 2.5, '#162426');
  // crystal blades: dark base + bright facet + a few light glints
  p.line(9, 18, 5, 7, P.shardD); p.line(9, 18, 9, 3, P.shard); p.line(9, 18, 13, 8, P.shardD); p.line(9, 18, 7, 5, P.shard);
  p.line(6, 18, 4, 11, P.shardD); p.line(12, 18, 14, 10, P.shard);
  p.line(8, 18, 8, 6, lighten(P.shard, 0.2));
  // inner energy glow that pulses across the two frames
  p.glow(9, 9, 3 + f, P.shard, 0.4, 3);
  p.px(9, 3 + f, P.shardL); p.px(5, 7, P.shardL); p.px(13, 9, lighten(P.shard, 0.2));
  if (f === 0) p.star4(9, 4, 2, P.shardL, P.white);
  p.outline(P.ink);
}, { anchor: [9, 18], fps: 2 });
defineSprite('bd_cav_stalagmite', 12, 18, (p) => {          // rock spire
  p.softShadow(6, 16, 5, 1.8, 0.42);
  p.ellipse(6, 16, 5, 2, '#1a2a2c');
  p.line(6, 16, 5, 2, '#2e4a4e'); p.line(6, 16, 7, 4, '#3a5a5e');
  p.rect(3, 12, 6, 4, '#243638'); p.rect(4, 9, 4, 4, '#2e4a4e');
  p.vline(4, 9, 7, '#4a7076');                              // wet left-edge sheen
  p.speckle(3, 10, 6, 6, '#1a2a2c', 4, 33);
  p.px(5, 4, '#6fa0a6'); p.px(5, 3, lighten('#6fa0a6', 0.2));
  p.outline(P.ink);
}, { anchor: [6, 16] });
defineAnim('bd_cav_mushroom', 14, 14, 2, (p, f) => {        // glowing cave mushrooms
  p.softShadow(7, 13, 5, 1.2, 0.36);
  p.line(5, 13, 5, 8, P.bone); p.line(9, 13, 9, 6, P.bone);
  p.vline(9, 6, 7, lighten(P.bone, 0.12));
  // bioluminescent caps with a soft halo that breathes between frames
  p.glow(5, 7, 2.4 + f * 0.5, P.toxic, 0.4, 3);
  p.ellipse(5, 7, 3, 2, P.toxic); p.ellipse(5, 7, 2, 1.3, lighten(P.toxic, 0.2 + f * 0.1));
  p.glow(9, 5, 2.8 + f * 0.5, P.greenL, 0.4, 3);
  p.ellipse(9, 5, 3.4, 2.4, P.green); p.ellipse(9, 5, 2, 1.4, lighten(P.greenL, f * 0.15));
  p.px(9, 4, P.white); p.px(5, 6, lighten(P.toxic, 0.3));
  if (f === 1) p.sparkle(11, 3, P.toxic, 1);
  p.outline(P.ink);
}, { anchor: [7, 13], fps: 2 });
defineSprite('bd_cav_rocks', 16, 10, (p) => {               // rubble pile
  p.softShadow(8, 9, 6, 1.4, 0.38);
  p.ellipse(5, 7, 4, 3, '#2e4a4e'); p.ellipse(11, 8, 4, 2.6, '#243638'); p.ellipse(8, 5, 3, 2.4, '#3a5a5e');
  p.px(3, 5, '#6fa0a6'); p.px(7, 3, '#6fa0a6'); p.px(9, 4, '#4a7076');
  // tiny crystal seam glinting in the rubble for life
  p.px(12, 6, P.shardL); p.glow(12, 6, 1.6, P.shard, 0.35, 2);
  p.speckle(2, 4, 12, 5, '#1a2a2c', 5, 91);
  p.outline(P.ink);
}, { anchor: [8, 9] });

// ============================ FROST 霜寒冰原 ============================
defineSprite('bd_frost_spikes', 16, 16, (p) => {            // ice spike cluster
  p.softShadow(8, 14, 6, 1.8, 0.4);
  p.ellipse(8, 14, 6, 2.4, '#1a2436');
  p.line(5, 14, 4, 5, P.iceD); p.line(5, 14, 6, 3, P.ice); p.line(10, 14, 11, 2, P.ice); p.line(10, 14, 9, 6, P.iceD); p.line(8, 14, 8, 8, P.ice);
  p.line(6, 14, 6, 6, lighten(P.ice, 0.25));                // inner glassy core
  p.glow(8, 8, 3, P.ice, 0.3, 3);
  p.px(6, 3, P.white); p.px(11, 2, P.white); p.px(8, 9, P.hiSky);
  p.star4(11, 2, 2, P.rimCool, P.white);
  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
}, { anchor: [8, 14] });
defineSprite('bd_frost_tree', 18, 26, (p) => {              // frozen dead tree
  p.softShadow(9, 25, 7, 2, 0.4);
  p.rect(8, 16, 3, 10, P.woodD); p.rect(8, 16, 1, 10, P.wood);
  p.speckle(8, 17, 3, 8, darken(P.woodD, 0.2), 4, 17);
  p.line(9, 16, 3, 8, P.woodD); p.line(9, 14, 15, 6, P.woodD); p.line(9, 12, 5, 4, P.woodD); p.line(9, 11, 13, 3, P.woodD);
  // frost-glazed branch tips with cool glints
  p.px(3, 8, P.ice); p.px(15, 6, P.ice); p.px(5, 4, P.white); p.px(13, 3, P.white); p.px(9, 9, P.ice);
  p.glow(13, 3, 2, P.rimCool, 0.3, 2);
  p.star4(5, 4, 2, P.rimCool, P.white);
  p.rimLight(P.rimCool, 0.45);
  p.outline(P.ink);
}, { anchor: [9, 25] });
defineSprite('bd_frost_drift', 16, 8, (p) => {              // snow drift
  p.softShadow(8, 7, 7, 1.2, 0.3);
  p.ellipse(8, 6, 7, 2.6, P.white); p.ellipse(5, 5, 3, 1.6, lighten(P.ice, 0.3)); p.ellipse(11, 5, 3, 1.6, P.white);
  p.gradV(2, 4, 12, 3, P.white, lighten(P.ice, 0.2));
  p.px(4, 4, P.hiSky); p.px(10, 4, P.hiSky);
  p.sparkle(6, 4, P.rimCool, 1);
  p.outline(P.iceD);
}, { anchor: [8, 7] });
defineSprite('bd_frost_pillar', 14, 24, (p) => {            // ice-encased broken pillar
  p.softShadow(7, 23, 6, 1.8, 0.4);
  p.rect(3, 20, 8, 4, P.gray1); p.rect(3, 20, 8, 1, P.gray3);
  p.rect(4, 5, 6, 16, P.gray2); p.rect(4, 5, 2, 16, P.gray3);
  p.rect(3, 4, 8, 14, '#9fd8ee'); p.replace('#9fd8ee', P.ice);   // ice sheath (semi)
  p.rect(4, 5, 6, 16, P.gray2); p.rect(4, 5, 2, 16, P.gray3);     // re-draw stone over
  // glassy ice streaks + a frozen highlight
  p.line(3, 7, 4, 18, P.ice); p.line(10, 6, 11, 17, lighten(P.ice, 0.2));
  p.line(11, 8, 12, 16, withAlpha(P.hiSky, 0.6));
  p.glow(7, 11, 3, P.ice, 0.25, 3);
  p.px(5, 4, P.white); p.px(11, 5, P.hiSky);
  p.rimLight(P.rimCool, 0.45);
  p.outline(P.ink);
}, { anchor: [7, 23] });

// ============================ INFERNO 熔岩深淵 ============================
defineSprite('bd_inf_obsidian', 14, 18, (p) => {            // obsidian spike
  p.softShadow(7, 16, 5, 1.6, 0.45);
  p.ellipse(7, 16, 5, 2, '#1c0e0c');
  p.line(7, 16, 5, 3, '#3a1c16'); p.line(7, 16, 7, 1, '#4a2a22'); p.line(7, 16, 9, 4, '#321c16');
  p.line(7, 16, 7, 6, mix('#4a2a22', P.ember, 0.4));         // glowing inner seam
  p.glow(7, 7, 2.4, P.ember, 0.35, 3);
  p.px(7, 2, P.ember); p.px(7, 1, P.emberL); p.px(6, 6, darken(P.ember, 0.3));
  p.px(6, 4, lighten('#4a2a22', 0.15));
  p.outline(P.ink);
}, { anchor: [7, 16] });
defineSprite('bd_inf_stump', 14, 12, (p) => {               // charred tree stump
  p.softShadow(7, 11, 6, 1.4, 0.42);
  p.ellipse(7, 10, 5, 2.4, '#1c0e0c'); p.rect(4, 4, 7, 7, '#2a1410'); p.rect(4, 4, 2, 7, '#3a1c16');
  p.ellipse(7, 4, 3.4, 1.6, '#1c0e0c');
  // smouldering embers glowing inside the burnt rings
  p.glow(7, 5, 2.4, P.ember, 0.4, 3);
  p.px(6, 6, P.ember); p.px(8, 5, P.emberL); p.px(9, 8, darken(P.ember, 0.3));
  p.line(5, 11, 3, 12, '#2a1410');
  p.speckle(4, 4, 7, 7, P.ember, 3, 53);
  p.outline(P.ink);
}, { anchor: [7, 11] });
defineAnim('bd_inf_brazier', 14, 20, 3, (p, f) => {         // iron brazier (fire)
  p.softShadow(7, 19, 5, 1.4, 0.45);
  p.vline(9, 19, 7, P.iron); p.rect(5, 16, 4, 4, P.iron); p.rect(5, 16, 4, 1, P.steel);
  p.rect(3, 9, 8, 4, darken(P.iron, 0.2)); p.rect(3, 9, 8, 1, P.steel);
  const fl = [0, 1, -1][f];
  // layered flame: outer glow, body, hot core, white tip + rising spark
  p.glow(7, 6 + fl, 4, P.ember, 0.45, 4);
  p.ellipse(7, 7 + fl * 0.5, 3, 3.5, P.ember); p.ellipse(7, 6 + fl * 0.5, 1.8, 2.4, P.emberL); p.px(7, 4 + fl, P.white);
  p.px(7, 2 + fl, withAlpha(P.emberL, 0.7));
  if (f === 1) p.sparkle(9, 3, P.emberL, 1);
  p.outline(P.ink);
}, { anchor: [7, 19], fps: 7 });
defineSprite('bd_inf_skulls', 16, 10, (p) => {              // scorched skull pile
  p.softShadow(8, 9, 6, 1.4, 0.4);
  p.ellipse(5, 6, 3, 2.4, darken(P.bone, 0.25)); p.ellipse(4, 5, 1.2, 1, darken(P.bone, 0.1));
  // glowing ember eye-sockets
  p.glow(4, 6, 1.4, P.ember, 0.45, 3); p.glow(6, 6, 1.4, P.ember, 0.45, 3);
  p.px(4, 6, P.emberL); p.px(6, 6, P.emberL);
  p.ellipse(10, 7, 2.6, 2, darken(P.bone, 0.35)); p.px(10, 7, P.ember);
  p.rect(4, 8, 8, 1, '#1c0e0c');
  p.outline(P.ink);
}, { anchor: [8, 9] });

// ============================ VOID 虛空裂界 ============================
defineSprite('bd_void_monolith', 14, 26, (p) => {           // dark monolith
  p.softShadow(7, 25, 7, 2, 0.45);
  p.rect(2, 22, 10, 4, P.void);
  p.rect(4, 2, 6, 21, P.void); p.rect(4, 2, 2, 21, P.purpleD); p.rect(9, 2, 1, 21, darken(P.void, 0.3));
  // glowing rune-seam down the face + floating mana nodes
  p.glow(7, 12, 3, P.astral, 0.3, 3);
  p.line(7, 5, 7, 20, P.purpleL); p.line(7, 5, 7, 20, withAlpha(P.astralL, 0.5));
  p.px(7, 8, P.manaL); p.px(7, 14, P.manaL); p.px(7, 18, P.white);
  p.px(5, 4, lighten(P.purpleD, 0.2));
  p.star4(7, 8, 2, P.astralL, P.white);
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: [7, 25] });
defineAnim('bd_void_rune', 16, 16, 3, (p, f) => {           // floating rune circle
  p.softShadow(8, 14, 5, 1.2, 0.3);
  p.glow(8, 8, 5, P.astral, 0.3, 3);
  p.ring(8, 8, 5, P.purpleD); p.ring(8, 8, 5 - 0, P.purple);
  const r = [0, 1, 2][f];
  p.line(8, 4, 8, 12, P.purpleL); p.line(4, 8, 12, 8, P.purpleL);
  p.px(8, 8, P.manaL); p.glow(8, 8, 2, P.astralL, 0.5, 3);
  p.px(8, 3 + (r === 1 ? -1 : 0), P.white); p.px(13 - r, 8, P.manaL);
  if (f === 0) p.sparkle(8, 8, P.white, 1);
  p.outline(P.ink, true);
}, { anchor: [8, 14], fps: 3 });
defineSprite('bd_void_shards', 16, 16, (p) => {             // alien crystal shards
  p.softShadow(8, 14, 6, 1.6, 0.4);
  p.ellipse(8, 14, 6, 2.2, '#160e26');
  p.line(5, 14, 3, 6, P.purpleD); p.line(8, 14, 9, 2, P.purpleL); p.line(8, 14, 7, 5, P.purple); p.line(11, 14, 13, 7, P.purpleD);
  p.glow(9, 6, 3, P.astral, 0.3, 3);
  p.px(9, 2, P.white); p.px(3, 6, P.manaL); p.px(13, 7, P.astralL);
  p.star4(9, 2, 2, P.astralL, P.white);
  p.outline(P.ink);
}, { anchor: [8, 14] });
defineAnim('bd_void_eye', 14, 14, 4, (p, f) => {            // floating eldritch eye
  p.softShadow(7, 12, 5, 1.2, 0.3);
  p.glow(7, 7, 5, P.astral, 0.28, 3);
  p.ellipse(7, 7, 6, 4, P.void); p.ellipse(7, 7, 5, 3, P.purpleD);
  const look = [0, 1, 0, -1][f];
  p.ellipse(7, 7, 2.4, 2.4, P.manaL); p.glow(7, 7, 2, P.astralL, 0.4, 3);
  p.ellipse(7 + look, 7, 1.4, 1.6, P.ink); p.px(7 + look, 6, P.white);
  p.outline(P.ink);
}, { anchor: [7, 11], fps: 3 });

// ============================ VERDANT 翠野林地 ============================
defineSprite('bd_verdant_tree', 20, 30, (p) => {            // lush broadleaf tree
  p.softShadow(10, 29, 8, 2.4, 0.42);
  // trunk: bark core + left light + right shadow + a knot
  p.rect(8, 18, 4, 12, P.barkD); p.rect(8, 18, 2, 12, P.bark);
  p.vline(9, 19, 11, lighten(P.bark, 0.15));
  p.px(10, 23, darken(P.barkD, 0.2));
  p.line(10, 18, 6, 13, P.bark); p.line(10, 18, 14, 13, P.barkD);
  // canopy: dark base, mid leaf, bright top-left lit lobes
  p.ellipse(10, 11, 9, 7, P.leafD);
  p.ellipse(8, 10, 6, 5, P.leaf);
  p.ellipse(7, 8, 4, 3.4, P.leafL);
  p.ellipse(14, 12, 4, 3, P.leaf);
  p.ellipse(6, 7, 2.4, 2, lighten(P.leafL, 0.18));
  p.speckle(4, 5, 12, 9, P.leafL, 7, 23);
  p.speckle(5, 8, 11, 8, P.leafD, 5, 47);
  p.rimLight(P.rim, 0.4);
  p.outline(P.ink);
}, { anchor: [10, 29] });
defineSprite('bd_verdant_bush', 16, 12, (p) => {            // berry bush
  p.softShadow(8, 11, 6, 1.6, 0.38);
  p.ellipse(5, 8, 4, 3, P.leafD); p.ellipse(11, 8, 4, 3, P.leafD);
  p.ellipse(8, 6, 5, 3.4, P.leaf); p.ellipse(7, 5, 3, 2.2, P.leafL);
  p.speckle(3, 3, 11, 7, P.leafL, 6, 11);
  // ripe sakura-pink berries with a glint
  p.px(5, 7, P.sakura); p.px(10, 6, P.sakura); p.px(8, 8, P.sakuraL); p.px(12, 7, P.sakura);
  p.px(5, 6, P.sakuraL);
  p.rimLight(P.rim, 0.35);
  p.outline(P.ink);
}, { anchor: [8, 11] });
defineSprite('bd_verdant_flowers', 14, 10, (p) => {         // glowing flower patch
  p.softShadow(7, 9, 6, 1.2, 0.32);
  // stems
  p.vline(3, 6, 3, P.leafD); p.vline(7, 5, 4, P.leaf); p.vline(11, 6, 3, P.leafD);
  // three blossoms, soft glow + bright centres (anime "magic flowers")
  const bloom = (x, y, c, cl) => {
    p.glow(x, y, 2.4, cl, 0.4, 3);
    p.px(x, y - 1, c); p.px(x - 1, y, c); p.px(x + 1, y, c); p.px(x, y + 1, c);
    p.px(x, y, P.white);
  };
  bloom(3, 5, P.sakura, P.sakuraL);
  bloom(7, 4, P.magenta, P.magentaL);
  bloom(11, 5, P.holy, P.holyL);
  p.sparkle(7, 2, P.holyL, 1);
  p.outline(P.ink);
}, { anchor: [7, 9] });
defineSprite('bd_verdant_log', 18, 10, (p) => {             // mossy fallen log
  p.softShadow(9, 9, 8, 1.6, 0.4);
  p.rect(2, 4, 14, 5, P.barkD); p.rect(2, 4, 14, 1, P.bark);
  p.ellipse(3, 6, 2.4, 2.4, lighten(P.bark, 0.1));          // end-grain rings
  p.ring(3, 6, 1.4, P.barkD); p.px(3, 6, darken(P.barkD, 0.2));
  // moss blanket on top + a tiny mushroom sprouting
  p.hline(3, 14, 3, P.moss); p.px(6, 3, P.mossL ? P.mossL : lighten(P.moss, 0.2)); p.px(9, 3, lighten(P.moss, 0.2)); p.px(12, 3, P.moss);
  p.line(13, 4, 13, 2, P.bone); p.ellipse(13, 2, 1.6, 1, P.toxic); p.px(13, 2, P.white);
  p.speckle(4, 5, 11, 3, darken(P.barkD, 0.15), 5, 67);
  p.rimLight(P.rim, 0.32);
  p.outline(P.ink);
}, { anchor: [9, 9] });
defineAnim('bd_verdant_fireflies', 14, 16, 4, (p, f) => {   // drifting fireflies over grass
  p.softShadow(7, 15, 5, 1, 0.26);
  // tufts of grass
  p.vline(3, 15, 3, P.leafD); p.vline(6, 15, 4, P.leaf); p.vline(9, 15, 3, P.leafD); p.vline(12, 15, 4, P.leaf);
  p.px(6, 11, P.leafL); p.px(12, 11, P.leafL);
  // fireflies bob on gentle paths; each is a warm glowing orb
  const fly = (bx, by, ph) => {
    const x = bx + [0, 1, 1, 0][(f + ph) & 3];
    const y = by - [0, 1, 2, 1][(f + ph) & 3];
    p.glow(x, y, 2.2, P.holy, 0.5, 3);
    p.px(x, y, P.holyL); p.px(x, y - 1, P.white);
  };
  fly(4, 9, 0);
  fly(9, 7, 2);
  fly(11, 11, 1);
  if (f === 0) p.sparkle(9, 4, P.holyL, 1);
  p.outline(P.ink);
}, { anchor: [7, 15], fps: 5 });

// ============================ DESERT 灼漠黃沙 ============================
defineSprite('bd_desert_cactus', 14, 22, (p) => {           // saguaro cactus + bloom
  p.softShadow(7, 21, 6, 1.8, 0.36);
  // body: green core, left light, right shadow, vertical ribs
  p.rect(5, 4, 4, 17, P.green); p.rect(5, 4, 1, 17, P.greenL); p.rect(8, 4, 1, 17, darken(P.green, 0.2));
  p.ellipse(7, 4, 2, 1.6, P.greenL);
  p.vline(6, 6, 14, darken(P.green, 0.12)); p.vline(7, 6, 14, lighten(P.green, 0.12));
  // arms
  p.rect(2, 10, 3, 2, P.green); p.vline(2, 7, 4, P.green); p.px(2, 7, P.greenL);
  p.rect(9, 8, 3, 2, P.green); p.vline(11, 5, 4, P.green); p.px(11, 5, P.greenL);
  // spines + a pink desert bloom on top
  p.px(4, 8, P.bone); p.px(9, 12, P.bone); p.px(6, 15, P.bone);
  p.glow(7, 3, 2, P.sakura, 0.4, 3); p.px(7, 3, P.sakuraL); p.px(7, 2, P.white);
  p.rimLight(P.rim, 0.38);
  p.outline(P.ink);
}, { anchor: [7, 21] });
defineSprite('bd_desert_rock', 16, 12, (p) => {             // sun-baked sandstone
  p.softShadow(8, 11, 7, 1.4, 0.34);
  p.ellipse(8, 8, 6, 4, P.sandD);
  p.ellipse(7, 6, 5, 3, P.sand); p.ellipse(6, 5, 3, 2, P.sandL);
  // wind-carved strata lines
  p.line(3, 8, 13, 9, darken(P.sandD, 0.12));
  p.line(4, 6, 12, 7, darken(P.sandD, 0.08));
  p.speckle(3, 4, 11, 6, P.sandL, 5, 19);
  p.px(5, 4, lighten(P.sandL, 0.15));
  p.rimLight(P.rim, 0.36);
  p.outline(P.ink);
}, { anchor: [8, 11] });
defineSprite('bd_desert_bones', 16, 12, (p) => {            // bleached ribcage + skull
  p.softShadow(8, 11, 7, 1.4, 0.32);
  // half-buried skull
  p.ellipse(4, 8, 2.6, 2.2, P.bone); p.ellipse(3, 7, 1.2, 1, lighten(P.bone, 0.15));
  p.px(3, 8, P.ink); p.px(5, 8, P.ink); p.rect(3, 10, 3, 1, darken(P.bone, 0.18));
  // arched ribs fading into the dune
  for (let i = 0; i < 4; i++) {
    p.line(8 + i * 2, 10, 8 + i * 2, 5 + (i & 1), P.bone);
    p.px(8 + i * 2, 5 + (i & 1), lighten(P.bone, 0.18));
  }
  p.line(8, 6, 14, 6, darken(P.bone, 0.1));
  p.hline(2, 14, 11, P.sandD);                              // sand line
  p.outline(P.ink);
}, { anchor: [8, 11] });
defineSprite('bd_desert_palm', 20, 30, (p) => {             // oasis palm
  p.softShadow(10, 29, 7, 2.2, 0.4);
  // curved trunk: 3 segments leaning right, banded bark
  p.rect(8, 20, 3, 10, P.bark); p.rect(9, 14, 3, 7, P.bark); p.rect(10, 8, 3, 7, P.bark);
  p.vline(8, 20, 10, lighten(P.bark, 0.15)); p.vline(9, 14, 6, lighten(P.bark, 0.12));
  p.hline(8, 11, 23, P.barkD); p.hline(9, 12, 18, P.barkD); p.hline(10, 13, 12, P.barkD);
  // fronds radiating from the crown
  const cx = 12, cy = 8;
  const frond = (dx, dy, c) => { p.line(cx, cy, cx + dx, cy + dy, c); p.px(cx + dx, cy + dy, lighten(c, 0.2)); };
  frond(-8, -2, P.leafD); frond(-6, 2, P.leaf); frond(8, -1, P.leafD); frond(6, 3, P.leaf);
  frond(-2, -6, P.leaf); frond(3, -5, P.leafL); frond(0, 4, P.leafD);
  p.ellipse(cx, cy, 2, 1.6, P.leafL);
  // coconuts
  p.px(11, 9, P.barkD); p.px(13, 9, P.barkD);
  p.rimLight(P.rim, 0.38);
  p.outline(P.ink);
}, { anchor: [10, 29] });
defineAnim('bd_desert_pylon', 14, 26, 3, (p, f) => {        // ancient runed obelisk (man-made)
  p.softShadow(7, 25, 6, 1.8, 0.4);
  p.rect(3, 22, 8, 4, P.sandD); p.rect(3, 22, 8, 1, P.sandL);
  // tapered obelisk body
  p.rect(4, 4, 6, 19, P.clay); p.rect(4, 4, 2, 19, lighten(P.clay, 0.15)); p.rect(9, 4, 1, 19, darken(P.clay, 0.18));
  p.line(5, 2, 7, 0, P.clay); p.line(7, 0, 9, 2, lighten(P.clay, 0.12));   // pyramidion
  p.rect(5, 1, 4, 3, P.clay); p.rect(5, 1, 2, 3, lighten(P.clay, 0.15));
  // glyph column glowing with a slow pulse
  const pulse = [0.35, 0.55, 0.45][f];
  p.glow(7, 12, 3, P.neon, pulse, 3);
  p.px(7, 7, P.neonL); p.px(7, 11, P.neon); p.px(6, 14, P.neon); p.px(8, 17, P.neonL);
  p.px(7, 20, P.neonL);
  if (f === 1) p.star4(7, 4, 2, P.neonL, P.white);
  p.rimLight(P.rim, 0.34);
  p.outline(P.ink);
}, { anchor: [7, 25], fps: 4 });

// ============================ SWAMP 沼澤瘴地 ============================
defineSprite('bd_swamp_willow', 20, 30, (p) => {            // drooping willow
  p.softShadow(10, 29, 8, 2.4, 0.42);
  p.rect(8, 18, 4, 12, P.barkD); p.rect(8, 18, 2, 12, mix(P.bark, P.murk, 0.3));
  p.vline(9, 19, 11, lighten(P.bark, 0.1));
  // gnarled mossy canopy
  p.ellipse(10, 11, 9, 6, P.murk);
  p.ellipse(9, 9, 6, 4, P.bog);
  p.ellipse(8, 8, 4, 3, P.bogL);
  // drooping willow strands trailing down
  for (let i = 0; i < 7; i++) {
    const x = 3 + i * 2.4 | 0;
    p.vline(x, 13, 5 + (i % 3) * 3, mix(P.bog, P.leafD, 0.4));
    p.px(x, 13, P.bogL);
  }
  p.speckle(4, 6, 12, 8, P.slimeBog, 6, 29);
  p.px(7, 6, lighten(P.bogL, 0.2));
  p.rimLight(P.rimCool, 0.3);
  p.outline(P.ink);
}, { anchor: [10, 29] });
defineSprite('bd_swamp_lily', 16, 8, (p) => {               // lily pads + bloom on murky water
  p.ellipse(8, 5, 8, 3, P.oceanD);                          // water patch
  p.dither(2, 4, 12, 3, P.oceanD, mix(P.oceanD, P.bog, 0.4));
  // pads
  p.ellipse(5, 4, 3, 1.6, P.leafD); p.ellipse(5, 4, 2, 1, P.leaf);
  p.ellipse(11, 5, 3, 1.6, P.leafD); p.ellipse(11, 5, 2, 1, P.leaf);
  p.px(4, 4, P.murk); p.px(10, 5, P.murk);                  // pad notch
  // glowing lotus bloom
  p.glow(8, 3, 2, P.sakura, 0.4, 3);
  p.px(8, 2, P.sakuraL); p.px(7, 3, P.sakura); p.px(9, 3, P.sakura); p.px(8, 3, P.white);
  p.sparkle(11, 2, P.sakuraL, 1);
  p.outline(P.ink);
}, { anchor: [8, 6] });
defineSprite('bd_swamp_reeds', 14, 16, (p) => {             // cattail reeds
  p.softShadow(7, 15, 5, 1.2, 0.3);
  // blades, leaning gently
  p.line(4, 15, 3, 3, P.bogL); p.line(7, 15, 7, 1, P.leaf); p.line(10, 15, 11, 4, P.bogL);
  p.line(7, 15, 8, 5, P.leafL);
  // cattail seed-heads
  p.rect(6, 3, 2, 4, P.bark); p.rect(6, 3, 1, 4, lighten(P.bark, 0.15));
  p.px(7, 2, P.barkD);
  p.rect(3, 4, 1, 3, darken(P.bark, 0.1));
  p.speckle(3, 5, 9, 8, P.slimeBog, 4, 41);
  p.rimLight(P.rim, 0.3);
  p.outline(P.ink);
}, { anchor: [7, 15] });
defineAnim('bd_swamp_bubbles', 14, 14, 4, (p, f) => {       // bubbling toxic mire
  p.ellipse(7, 11, 6, 2.6, P.murk);                         // mud pit rim
  p.ellipse(7, 11, 5, 2, P.bog);
  p.ellipse(7, 11, 3, 1.4, P.slimeBog);                     // slime surface
  // bubbles rise + pop across the loop, each with a toxic glow
  const bub = (bx, ph) => {
    const k = (f + ph) & 3;
    const y = 11 - k * 2;
    const r = k === 3 ? 0.6 : 1.2;
    if (k < 3) {
      p.glow(bx, y, 2, P.toxic, 0.4, 3);
      p.ellipse(bx, y, r, r, lighten(P.slimeBog, 0.2));
      p.px(bx - 0, y - 1, P.white);
    } else {
      p.sparkle(bx, y, P.toxic, 1);                         // pop
    }
  };
  bub(5, 0); bub(9, 2); bub(7, 1);
  p.outline(P.ink);
}, { anchor: [7, 12], fps: 4 });
defineSprite('bd_swamp_log', 18, 10, (p) => {               // rotting half-sunk log
  p.softShadow(9, 9, 8, 1.4, 0.38);
  p.ellipse(9, 8, 8, 2.4, P.oceanD);                        // water around it
  p.rect(2, 4, 14, 4, mix(P.barkD, P.murk, 0.4)); p.rect(2, 4, 14, 1, mix(P.bark, P.murk, 0.3));
  p.ellipse(3, 6, 2.2, 2.2, mix(P.bark, P.murk, 0.3)); p.ring(3, 6, 1.2, darken(P.barkD, 0.2));
  // slime, moss, and a couple of glowing toxic spores
  p.hline(3, 14, 3, P.slimeBog); p.px(6, 3, P.bogL); p.px(10, 3, P.slimeBog);
  p.px(8, 4, P.toxic); p.glow(8, 4, 1.6, P.toxic, 0.35, 2);
  p.px(12, 5, P.toxic);
  p.speckle(4, 5, 11, 3, P.murk, 5, 83);
  p.outline(P.ink);
}, { anchor: [9, 9] });

// ============================ ABYSS 深淵海淵 ============================
defineSprite('bd_abyss_coral', 16, 18, (p) => {             // branching coral
  p.softShadow(8, 17, 6, 1.8, 0.4);
  p.ellipse(8, 16, 6, 2, P.abyss);
  // branching trunk + arms, coral-pink with bright tips
  p.line(8, 16, 8, 6, P.coral); p.line(8, 12, 4, 5, P.coral); p.line(8, 11, 12, 4, P.coral);
  p.line(8, 14, 6, 9, darken(P.coral, 0.18)); p.line(8, 13, 11, 8, darken(P.coral, 0.18));
  // polyp bumps + glowing tips
  p.px(4, 5, P.sakuraL); p.px(12, 4, P.sakuraL); p.px(8, 6, P.sakuraL);
  p.glow(8, 6, 2, P.coral, 0.35, 3); p.glow(12, 4, 1.6, P.sakura, 0.35, 2);
  p.px(6, 9, lighten(P.coral, 0.2)); p.px(10, 8, lighten(P.coral, 0.2));
  p.rimLight(P.rimCool, 0.35);
  p.outline(P.ink);
}, { anchor: [8, 17] });
defineAnim('bd_abyss_kelp', 14, 26, 4, (p, f) => {          // swaying kelp stalk
  p.softShadow(7, 25, 4, 1.4, 0.32);
  p.ellipse(7, 24, 4, 1.6, P.abyss);                        // holdfast
  // stalk sways left/right along its height across frames
  const sway = [0, 1, 0, -1][f];
  let px = 7;
  const pts = [];
  for (let y = 23; y >= 2; y -= 3) {
    const t = (23 - y) / 21;
    px = 7 + Math.round(sway * t * 3);
    pts.push([px, y]);
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    p.line(a[0], a[1], b[0], b[1], P.ocean);
    p.line(a[0] - 1, a[1], b[0] - 1, b[1], P.oceanD);
    p.px(b[0] + 1, b[1], P.oceanL);                          // leaf blade
  }
  // luminous bladders + a glow tip
  const tip = pts[pts.length - 1];
  p.glow(tip[0], tip[1], 2.2, P.aurora, 0.4, 3); p.px(tip[0], tip[1], P.auroraL);
  p.px(pts[2][0] + 1, pts[2][1], P.aurora);
  p.outline(P.ink);
}, { anchor: [7, 25], fps: 4 });
defineSprite('bd_abyss_shell', 14, 10, (p) => {             // giant clam / spiral shell
  p.softShadow(7, 9, 6, 1.4, 0.36);
  p.ellipse(7, 7, 6, 3, mix(P.coral, P.sand, 0.4));
  p.ellipse(7, 7, 5, 2.4, lighten(mix(P.coral, P.sand, 0.4), 0.12));
  // fan ribs
  for (let i = -3; i <= 3; i++) p.line(7, 7, 7 + i * 1.6, 3, darken(mix(P.coral, P.sand, 0.4), 0.15));
  p.hline(2, 12, 9, darken(mix(P.coral, P.sand, 0.4), 0.25));
  // glowing pearl inside
  p.glow(7, 6, 2, P.rimCool, 0.5, 3); p.px(7, 6, P.white); p.px(7, 5, P.hiSky);
  p.sparkle(10, 4, P.rimCool, 1);
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: [7, 9] });
defineAnim('bd_abyss_vent', 14, 20, 3, (p, f) => {          // hydrothermal vent
  p.softShadow(7, 19, 6, 1.6, 0.42);
  // dark chimney
  p.rect(4, 10, 6, 9, P.abyss); p.rect(4, 10, 2, 9, mix(P.abyss, P.ocean, 0.25));
  p.rect(5, 8, 4, 3, darken(P.abyss, 0.15));
  p.speckle(4, 11, 6, 7, '#06141d', 5, 13);
  // glowing magma core + rising shimmering smoke plume
  p.glow(6, 9, 2.4, P.ember, 0.45, 3); p.px(6, 9, P.emberL);
  const plume = [0, 1, -1][f];
  p.px(6 + plume, 6, withAlpha(P.oceanL, 0.6));
  p.px(6, 4, withAlpha(P.aurora, 0.5));
  p.px(6 - plume, 2, withAlpha(P.auroraL, 0.4));
  if (f === 1) p.sparkle(6, 3, P.emberL, 1);
  p.outline(P.ink);
}, { anchor: [7, 19], fps: 4 });
defineAnim('bd_abyss_anglerfish', 18, 14, 4, (p, f) => {    // lurking anglerfish (lure glow)
  p.softShadow(9, 13, 6, 1.2, 0.28);
  // body, dark deep-sea tone with a lit top edge
  p.ellipse(9, 8, 6, 4, P.abyss); p.ellipse(8, 7, 5, 3, mix(P.abyss, P.ocean, 0.3));
  p.ellipse(8, 6, 3, 1.6, P.oceanD);
  // tail fin
  p.line(15, 8, 17, 5, P.abyss); p.line(15, 8, 17, 11, P.abyss); p.line(15, 8, 17, 8, mix(P.abyss, P.ocean, 0.3));
  // gaping jaw + needle teeth
  p.line(3, 9, 6, 10, P.abyss); p.px(4, 8, P.bone); p.px(5, 9, P.bone); p.px(6, 8, P.bone);
  // big anime eye with catch-light
  p.glow(6, 6, 2, P.aurora, 0.4, 3); p.ellipse(6, 6, 1.6, 1.6, P.auroraL); p.px(6, 6, P.ink); p.px(5, 5, P.white);
  // bioluminescent lure dangling above the head, pulsing brighter mid-loop
  const lx = 4, ly = 2 + [0, -1, 0, -1][f];
  p.line(5, 4, lx, ly + 1, mix(P.abyss, P.ocean, 0.4));
  const lure = [0.45, 0.6, 0.45, 0.55][f];
  p.glow(lx, ly, 2.4, P.aurora, lure, 3); p.px(lx, ly, P.auroraL); p.px(lx, ly - 1, P.white);
  if (f === 1) p.star4(lx, ly, 2, P.auroraL, P.white);
  p.outline(P.ink);
}, { anchor: [9, 13], fps: 4 });

// ============================ CELESTIAL 天界星壇 ============================
defineSprite('bd_cel_pillar', 14, 30, (p) => {              // marble + gold temple pillar
  p.softShadow(7, 29, 7, 2.2, 0.4);
  p.rect(2, 26, 10, 4, P.cloud); p.rect(2, 26, 10, 1, P.white);     // base
  // fluted marble shaft
  p.rect(4, 5, 6, 21, P.cloud); p.rect(4, 5, 2, 21, P.white); p.rect(9, 5, 1, 21, mix(P.cloud, P.skyL, 0.5));
  p.vline(6, 6, 19, mix(P.cloud, P.sky, 0.2)); p.vline(8, 6, 19, mix(P.cloud, P.sky, 0.2));
  // gilded capital + base ring
  p.rect(3, 3, 8, 3, P.holy); p.rect(3, 3, 8, 1, P.holyL);
  p.hline(4, 9, 25, P.holy);
  // holy glow + a kira on the gold
  p.glow(7, 4, 2.4, P.holy, 0.35, 3);
  p.star4(5, 3, 2, P.holyL, P.white);
  p.rimLight(P.rim, 0.45);
  p.outline(P.ink);
}, { anchor: [7, 29] });
defineSprite('bd_cel_cloud', 16, 10, (p) => {               // floating cloud platform
  p.softShadow(8, 9, 7, 1.2, 0.22);
  // puffy lobes, bright top-left lit
  p.ellipse(5, 6, 4, 2.6, P.cloud); p.ellipse(11, 6, 4, 2.6, P.cloud); p.ellipse(8, 4, 5, 3, P.cloud);
  p.ellipse(7, 3, 3, 1.8, P.white);
  p.gradV(2, 6, 12, 3, P.cloud, mix(P.cloud, P.sky, 0.4));   // shaded underside
  p.dither(3, 7, 10, 2, mix(P.cloud, P.sky, 0.3), P.cloud);
  p.px(5, 2, P.white); p.px(8, 2, P.hiSky);
  p.rimLight(P.rim, 0.4);
  p.outline(mix(P.sky, P.ink, 0.5));
}, { anchor: [8, 9] });
defineAnim('bd_cel_star', 14, 14, 4, (p, f) => {            // twinkling fallen star
  p.softShadow(7, 12, 4, 1, 0.2);
  // pulsing aura halo
  p.aura(7, 7, 4, P.holy, f / 4, 2);
  p.glow(7, 7, 4, P.holyL, 0.45, 4);
  // 4-point star that grows/shrinks across the loop
  const r = [3, 4, 3, 2][f];
  p.star4(7, 7, r, P.holyL, P.white);
  p.px(7, 7, P.white);
  // little orbiting sparkles
  const orb = [[10, 4], [11, 9], [3, 10], [4, 3]][f];
  p.sparkle(orb[0], orb[1], P.holyL, 1);
  p.outline(P.ink);
}, { anchor: [7, 12], fps: 4 });
defineSprite('bd_cel_crystal', 16, 20, (p) => {             // astral prism crystal
  p.softShadow(8, 19, 6, 1.8, 0.36);
  p.ellipse(8, 18, 6, 2, mix(P.astral, P.void, 0.5));
  // floating prism: facets in astral violet + aurora sheen
  p.line(8, 18, 5, 8, P.astral); p.line(8, 18, 11, 9, darken(P.astral, 0.2));
  p.line(8, 2, 5, 8, P.astralL); p.line(8, 2, 11, 9, P.astral);
  p.rect(6, 8, 5, 1, lighten(P.astralL, 0.1));               // mid-band facet
  p.line(8, 4, 8, 16, withAlpha(P.aurora, 0.5));             // inner refraction
  p.glow(8, 9, 3, P.astral, 0.4, 3);
  p.px(8, 2, P.white); p.px(6, 8, P.auroraL);
  p.star4(8, 3, 2, P.astralL, P.white);
  p.rimLight(P.rimCool, 0.4);
  p.outline(P.ink);
}, { anchor: [8, 19] });
defineSprite('bd_cel_feather', 12, 16, (p) => {             // drifting angelic feather
  p.softShadow(6, 15, 4, 1, 0.2);
  // a single quill, curved, with soft sheen + holy glint
  p.line(5, 14, 7, 3, P.cloud);                              // rachis
  // barbs left & right
  for (let i = 0; i < 6; i++) {
    const y = 4 + i * 1.6 | 0;
    const x = 7 - i * 0.4 | 0;
    p.line(x, y, x - 2 - (i >> 1), y + 1, P.white);
    p.line(x, y, x + 1 + (i >> 2), y + 1, P.cloud);
  }
  p.line(5, 14, 7, 3, mix(P.cloud, P.holy, 0.3));            // gilded shaft tip
  p.glow(7, 3, 2, P.holy, 0.4, 3); p.px(7, 3, P.holyL); p.px(7, 2, P.white);
  p.sparkle(3, 6, P.holyL, 1);
  p.rimLight(P.rim, 0.4);
  p.outline(mix(P.sky, P.ink, 0.4));
}, { anchor: [6, 15] });

// biome id -> decor sprite pool (mix of NEW + the pre-existing single sprite).
// Original five biomes are preserved byte-for-byte; five new biomes appended.
export const DECOR_SETS = {
  crypt:     ['bd_crypt_pillar', 'bd_crypt_tomb', 'bd_crypt_bones', 'bd_crypt_candles', 'torch'],
  cavern:    ['bd_cav_cluster', 'bd_cav_stalagmite', 'bd_cav_mushroom', 'bd_cav_rocks', 'dec_crystal'],
  frost:     ['bd_frost_spikes', 'bd_frost_tree', 'bd_frost_drift', 'bd_frost_pillar', 'dec_ice'],
  inferno:   ['bd_inf_obsidian', 'bd_inf_stump', 'bd_inf_brazier', 'bd_inf_skulls', 'dec_lava'],
  void:      ['bd_void_monolith', 'bd_void_rune', 'bd_void_shards', 'bd_void_eye', 'dec_voidcrystal'],
  // ---- new biomes ----
  verdant:   ['bd_verdant_tree', 'bd_verdant_bush', 'bd_verdant_flowers', 'bd_verdant_log', 'bd_verdant_fireflies'],
  desert:    ['bd_desert_cactus', 'bd_desert_rock', 'bd_desert_bones', 'bd_desert_palm', 'bd_desert_pylon'],
  swamp:     ['bd_swamp_willow', 'bd_swamp_lily', 'bd_swamp_reeds', 'bd_swamp_bubbles', 'bd_swamp_log'],
  abyss:     ['bd_abyss_coral', 'bd_abyss_kelp', 'bd_abyss_shell', 'bd_abyss_vent', 'bd_abyss_anglerfish'],
  celestial: ['bd_cel_pillar', 'bd_cel_cloud', 'bd_cel_star', 'bd_cel_crystal', 'bd_cel_feather'],
};
// a "feature" subset worth placing in small clusters (the rest scatter singly)
export const DECOR_CLUSTERS = {
  crypt:     ['bd_crypt_tomb', 'bd_crypt_bones'],
  cavern:    ['bd_cav_cluster', 'bd_cav_stalagmite', 'dec_crystal'],
  frost:     ['bd_frost_spikes', 'bd_frost_drift'],
  inferno:   ['bd_inf_obsidian', 'dec_lava'],
  void:      ['bd_void_shards', 'dec_voidcrystal'],
  // ---- new biomes ----
  verdant:   ['bd_verdant_tree', 'bd_verdant_flowers'],
  desert:    ['bd_desert_cactus', 'bd_desert_palm'],
  swamp:     ['bd_swamp_willow', 'bd_swamp_lily'],
  abyss:     ['bd_abyss_coral', 'bd_abyss_kelp'],
  celestial: ['bd_cel_pillar', 'bd_cel_star'],
};
