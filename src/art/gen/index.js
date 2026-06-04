// AUTO-GENERATED index (dynamic import = fault isolation).
const PACKS = ["abilities_combat","abilities_utility","bosses","enemies_beast","enemies_elemental","enemies_undead","equipment_gear","equipment_weapons","facilities","items","talents"];
for (const m of PACKS) {
  try { await import('./' + m + '.js'); }
  catch (e) { console.warn('[gen-art] pack failed to load:', m, e && e.message); }
}
export const GEN_ART_PACKS = PACKS;
