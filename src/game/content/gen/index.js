// AUTO-GENERATED index (dynamic import = fault isolation).
const PACKS = ["abilities_combat","abilities_utility","bosses","enemies_beast","enemies_elemental","enemies_undead","equipment_gear","equipment_weapons","facilities","gen_abilities_c","gen_bosses2","gen_bosses_extra","gen_characters","gen_enemies_frost","gen_epic_gear","gen_hazard_art","gen_heroes2","gen_heroes3","gen_items_anvils","gen_items_c","gen_special2","gen_special_monsters","gen_weapons_a","gen_weapons_b","gen_weapons_c","items","talents"];
for (const m of PACKS) {
  try { await import('./' + m + '.js'); }
  catch (e) { console.warn('[gen-content] pack failed to load:', m, e && e.message); }
}
export const GEN_CONTENT_PACKS = PACKS;
