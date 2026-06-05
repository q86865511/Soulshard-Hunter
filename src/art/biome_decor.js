// Rich per-biome decoration sets (round 6.1). Each biome gets a mix of natural +
// man-made props so maps read as distinct, populated places — not one sprite scattered.
// DECOR_SETS (exported) is consumed by maps.js placement.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix } from '../engine/palette.js';

// ============================ CRYPT 幽影地穴 ============================
defineSprite('bd_crypt_pillar', 14, 28, (p) => {            // broken stone pillar
  p.rect(2, 24, 10, 4, P.gray1); p.rect(2, 24, 10, 1, P.gray3);
  p.rect(4, 6, 6, 19, P.gray2); p.rect(4, 6, 2, 19, P.gray3); p.rect(9, 6, 1, 19, darken(P.gray1, 0.15));
  p.rect(3, 4, 8, 3, P.gray3);
  p.line(5, 10, 9, 14, darken(P.gray1, 0.25)); p.px(6, 4, P.gray1); p.px(8, 5, darken(P.gray1, 0.2));
  p.outline(P.ink);
}, { anchor: [7, 27] });
defineSprite('bd_crypt_tomb', 14, 16, (p) => {              // tombstone
  p.rect(2, 14, 10, 2, darken(P.gray1, 0.3));
  p.rect(4, 3, 6, 12, P.gray2); p.ellipse(7, 3, 3, 3, P.gray2); p.rect(4, 3, 2, 12, P.gray3);
  p.hline(5, 9, 7, darken(P.gray1, 0.3)); p.hline(5, 8, 9, darken(P.gray1, 0.3)); p.hline(5, 9, 11, darken(P.gray1, 0.3));
  p.outline(P.ink);
}, { anchor: [7, 15] });
defineSprite('bd_crypt_bones', 16, 10, (p) => {             // skull + crossed bones
  p.ellipse(5, 6, 3, 2.6, P.bone); p.rect(4, 8, 3, 2, darken(P.bone, 0.18)); p.px(4, 6, P.ink); p.px(6, 6, P.ink);
  p.line(9, 9, 14, 5, P.bone); p.line(10, 5, 13, 9, darken(P.bone, 0.12));
  p.px(9, 9, lighten(P.bone, 0.2)); p.px(14, 5, lighten(P.bone, 0.2)); p.px(13, 9, lighten(P.bone, 0.2)); p.px(10, 5, lighten(P.bone, 0.2));
  p.outline(P.ink);
}, { anchor: [8, 9] });
defineAnim('bd_crypt_candles', 12, 18, 3, (p, f) => {       // candelabra (lit)
  p.rect(3, 15, 6, 3, P.gray1); p.vline(10, 16, 6, P.gray2);
  p.rect(2, 7, 2, 5, P.bone); p.rect(8, 7, 2, 5, P.bone); p.rect(5, 6, 2, 6, P.bone);
  const fl = [0, 1, -1][f];
  p.px(2, 6 + fl, P.emberL); p.px(8, 6 + fl, P.ember); p.px(5, 5 + fl, P.emberL);
  p.outline(P.ink);
}, { anchor: [6, 17], fps: 6 });

// ============================ CAVERN 水晶洞窟 ============================
defineAnim('bd_cav_cluster', 18, 20, 2, (p, f) => {         // big crystal cluster
  p.ellipse(9, 18, 7, 2.5, '#162426');
  p.line(9, 18, 5, 7, P.shardD); p.line(9, 18, 9, 3, P.shard); p.line(9, 18, 13, 8, P.shardD); p.line(9, 18, 7, 5, P.shard);
  p.line(6, 18, 4, 11, P.shardD); p.line(12, 18, 14, 10, P.shard);
  p.px(9, 3 + f, P.shardL); p.px(5, 7, P.shardL); p.px(13, 9, lighten(P.shard, 0.2));
  p.outline(P.ink);
}, { anchor: [9, 18], fps: 2 });
defineSprite('bd_cav_stalagmite', 12, 18, (p) => {          // rock spire
  p.ellipse(6, 16, 5, 2, '#1a2a2c');
  p.line(6, 16, 5, 2, '#2e4a4e'); p.line(6, 16, 7, 4, '#3a5a5e'); p.rect(3, 12, 6, 4, '#243638'); p.rect(4, 9, 4, 4, '#2e4a4e');
  p.px(5, 4, '#4a7076'); p.outline(P.ink);
}, { anchor: [6, 16] });
defineAnim('bd_cav_mushroom', 14, 14, 2, (p, f) => {        // glowing cave mushrooms
  p.line(5, 13, 5, 8, P.bone); p.line(9, 13, 9, 6, P.bone);
  p.ellipse(5, 7, 3, 2, P.toxic); p.ellipse(5, 7, 2, 1.3, lighten(P.toxic, 0.2 + f * 0.1));
  p.ellipse(9, 5, 3.4, 2.4, P.green); p.ellipse(9, 5, 2, 1.4, lighten(P.greenL, f * 0.15));
  p.px(9, 4, P.white); p.outline(P.ink);
}, { anchor: [7, 13], fps: 2 });
defineSprite('bd_cav_rocks', 16, 10, (p) => {               // rubble pile
  p.ellipse(5, 7, 4, 3, '#2e4a4e'); p.ellipse(11, 8, 4, 2.6, '#243638'); p.ellipse(8, 5, 3, 2.4, '#3a5a5e');
  p.px(4, 5, '#4a7076'); p.px(10, 6, '#4a7076'); p.outline(P.ink);
}, { anchor: [8, 9] });

// ============================ FROST 霜寒冰原 ============================
defineSprite('bd_frost_spikes', 16, 16, (p) => {            // ice spike cluster
  p.ellipse(8, 14, 6, 2.4, '#1a2436');
  p.line(5, 14, 4, 5, P.iceD); p.line(5, 14, 6, 3, P.ice); p.line(10, 14, 11, 2, P.ice); p.line(10, 14, 9, 6, P.iceD); p.line(8, 14, 8, 8, P.ice);
  p.px(6, 3, P.white); p.px(11, 2, P.white); p.outline(P.ink);
}, { anchor: [8, 14] });
defineSprite('bd_frost_tree', 18, 26, (p) => {              // frozen dead tree
  p.rect(8, 16, 3, 10, P.woodD); p.rect(8, 16, 1, 10, P.wood);
  p.line(9, 16, 3, 8, P.woodD); p.line(9, 14, 15, 6, P.woodD); p.line(9, 12, 5, 4, P.woodD); p.line(9, 11, 13, 3, P.woodD);
  p.px(3, 8, P.ice); p.px(15, 6, P.ice); p.px(5, 4, P.white); p.px(13, 3, P.white); p.px(9, 9, P.ice);
  p.outline(P.ink);
}, { anchor: [9, 25] });
defineSprite('bd_frost_drift', 16, 8, (p) => {              // snow drift
  p.ellipse(8, 6, 7, 2.6, P.white); p.ellipse(5, 5, 3, 1.6, lighten(P.ice, 0.3)); p.ellipse(11, 5, 3, 1.6, P.white);
  p.outline(P.iceD);
}, { anchor: [8, 7] });
defineSprite('bd_frost_pillar', 14, 24, (p) => {            // ice-encased broken pillar
  p.rect(3, 20, 8, 4, P.gray1);
  p.rect(4, 5, 6, 16, P.gray2); p.rect(4, 5, 2, 16, P.gray3);
  p.rect(3, 4, 8, 14, '#9fd8ee'); p.replace('#9fd8ee', P.ice);   // ice sheath (semi)
  p.rect(4, 5, 6, 16, P.gray2); p.rect(4, 5, 2, 16, P.gray3);     // re-draw stone over
  p.line(3, 7, 4, 18, P.ice); p.line(10, 6, 11, 17, lighten(P.ice, 0.2)); p.px(5, 4, P.white);
  p.outline(P.ink);
}, { anchor: [7, 23] });

// ============================ INFERNO 熔岩深淵 ============================
defineSprite('bd_inf_obsidian', 14, 18, (p) => {            // obsidian spike
  p.ellipse(7, 16, 5, 2, '#1c0e0c');
  p.line(7, 16, 5, 3, '#3a1c16'); p.line(7, 16, 7, 1, '#4a2a22'); p.line(7, 16, 9, 4, '#321c16');
  p.px(7, 2, P.ember); p.px(6, 6, darken(P.ember, 0.3)); p.outline(P.ink);
}, { anchor: [7, 16] });
defineSprite('bd_inf_stump', 14, 12, (p) => {               // charred tree stump
  p.ellipse(7, 10, 5, 2.4, '#1c0e0c'); p.rect(4, 4, 7, 7, '#2a1410'); p.rect(4, 4, 2, 7, '#3a1c16');
  p.ellipse(7, 4, 3.4, 1.6, '#1c0e0c'); p.px(6, 6, P.ember); p.px(9, 8, darken(P.ember, 0.3));
  p.line(5, 11, 3, 12, '#2a1410'); p.outline(P.ink);
}, { anchor: [7, 11] });
defineAnim('bd_inf_brazier', 14, 20, 3, (p, f) => {         // iron brazier (fire)
  p.vline(9, 19, 7, P.iron); p.rect(5, 16, 4, 4, P.iron);
  p.rect(3, 9, 8, 4, darken(P.iron, 0.2)); p.rect(3, 9, 8, 1, P.steel);
  const fl = [0, 1, -1][f];
  p.ellipse(7, 7 + fl * 0.5, 3, 3.5, P.ember); p.ellipse(7, 6 + fl * 0.5, 1.8, 2.4, P.emberL); p.px(7, 4 + fl, P.white);
  p.outline(P.ink);
}, { anchor: [7, 19], fps: 7 });
defineSprite('bd_inf_skulls', 16, 10, (p) => {              // scorched skull pile
  p.ellipse(5, 6, 3, 2.4, darken(P.bone, 0.25)); p.px(4, 6, P.ember); p.px(6, 6, P.ember);
  p.ellipse(10, 7, 2.6, 2, darken(P.bone, 0.35)); p.rect(4, 8, 8, 1, '#1c0e0c');
  p.outline(P.ink);
}, { anchor: [8, 9] });

// ============================ VOID 虛空裂界 ============================
defineSprite('bd_void_monolith', 14, 26, (p) => {           // dark monolith
  p.rect(2, 22, 10, 4, P.void);
  p.rect(4, 2, 6, 21, P.void); p.rect(4, 2, 2, 21, P.purpleD); p.rect(9, 2, 1, 21, darken(P.void, 0.3));
  p.line(7, 5, 7, 20, P.purpleL); p.px(7, 8, P.manaL); p.px(7, 14, P.manaL); p.px(7, 18, P.white);
  p.outline(P.ink);
}, { anchor: [7, 25] });
defineAnim('bd_void_rune', 16, 16, 3, (p, f) => {           // floating rune circle
  p.ring(8, 8, 5, P.purpleD); p.ring(8, 8, 5 - 0, P.purple);
  const r = [0, 1, 2][f];
  p.line(8, 4, 8, 12, withAlphaSafe(P.purpleL)); p.line(4, 8, 12, 8, P.purpleL);
  p.px(8, 8, P.manaL); p.px(8, 3 + (r === 1 ? -1 : 0), P.white); p.px(13 - r, 8, P.manaL);
  p.outline(P.ink, true);
}, { anchor: [8, 14], fps: 3 });
defineSprite('bd_void_shards', 16, 16, (p) => {             // alien crystal shards
  p.ellipse(8, 14, 6, 2.2, '#160e26');
  p.line(5, 14, 3, 6, P.purpleD); p.line(8, 14, 9, 2, P.purpleL); p.line(8, 14, 7, 5, P.purple); p.line(11, 14, 13, 7, P.purpleD);
  p.px(9, 2, P.white); p.px(3, 6, P.manaL); p.outline(P.ink);
}, { anchor: [8, 14] });
defineAnim('bd_void_eye', 14, 14, 4, (p, f) => {            // floating eldritch eye
  p.ellipse(7, 7, 6, 4, P.void); p.ellipse(7, 7, 5, 3, P.purpleD);
  const look = [0, 1, 0, -1][f];
  p.ellipse(7, 7, 2.4, 2.4, P.manaL); p.ellipse(7 + look, 7, 1.4, 1.6, P.ink); p.px(7 + look, 6, P.white);
  p.outline(P.ink);
}, { anchor: [7, 11], fps: 3 });

// withAlpha isn't needed here; tiny guard so a typo can't crash the bake
function withAlphaSafe(c) { return c; }

// biome id -> decor sprite pool (mix of NEW + the pre-existing single sprite)
export const DECOR_SETS = {
  crypt:   ['bd_crypt_pillar', 'bd_crypt_tomb', 'bd_crypt_bones', 'bd_crypt_candles', 'torch'],
  cavern:  ['bd_cav_cluster', 'bd_cav_stalagmite', 'bd_cav_mushroom', 'bd_cav_rocks', 'dec_crystal'],
  frost:   ['bd_frost_spikes', 'bd_frost_tree', 'bd_frost_drift', 'bd_frost_pillar', 'dec_ice'],
  inferno: ['bd_inf_obsidian', 'bd_inf_stump', 'bd_inf_brazier', 'bd_inf_skulls', 'dec_lava'],
  void:    ['bd_void_monolith', 'bd_void_rune', 'bd_void_shards', 'bd_void_eye', 'dec_voidcrystal'],
};
// a "feature" subset worth placing in small clusters (the rest scatter singly)
export const DECOR_CLUSTERS = {
  crypt:   ['bd_crypt_tomb', 'bd_crypt_bones'],
  cavern:  ['bd_cav_cluster', 'bd_cav_stalagmite', 'dec_crystal'],
  frost:   ['bd_frost_spikes', 'bd_frost_drift'],
  inferno: ['bd_inf_obsidian', 'dec_lava'],
  void:    ['bd_void_shards', 'dec_voidcrystal'],
};
