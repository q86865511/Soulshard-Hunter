// AUTO-GENERATED index of workflow art packs (dynamic import = fault isolation).
const PACKS = ["enemies_beast","enemies_undead","enemies_elemental","bosses","abilities_combat","abilities_utility","equipment_weapons","equipment_gear","items","talents","facilities"];
for (const m of PACKS) {
  try { await import('./' + m + '.js'); }
  catch (e) { console.warn('[gen-art] pack failed to load:', m, e && e.message); }
}
export const GEN_ART_PACKS = PACKS;
