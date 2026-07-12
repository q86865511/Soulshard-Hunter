// AUTO-GENERATED index (dynamic import = fault isolation).
const PACKS = ["abilities_combat","abilities_utility","art_decals_abyss","art_decals_cavern","art_decals_celestial","art_decals_crypt","art_decals_desert","art_decals_frost","art_decals_inferno","art_decals_swamp","art_decals_verdant","art_decals_void","bosses","enemies_beast","enemies_elemental","enemies_undead","equipment_gear","equipment_weapons","facilities","items","talents"];
for (const m of PACKS) {
  try { await import('./' + m + '.js'); }
  catch (e) { console.warn('[gen-art] pack failed to load:', m, e && e.message); }
}
export const GEN_ART_PACKS = PACKS;
