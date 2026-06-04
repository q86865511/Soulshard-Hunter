// Content registries — the integration seam. Core content and any
// workflow-generated content register their definitions here; gameplay code
// only ever reads from these registries.

function makeRegistry(kind) {
  const map = new Map();
  return {
    kind,
    register(def) {
      if (!def || !def.id) throw new Error(`[${kind}] definition needs an id`);
      if (map.has(def.id)) console.warn(`[${kind}] duplicate id overwritten: ${def.id}`);
      map.set(def.id, def);
      return def;
    },
    registerMany(defs) { for (const d of defs) this.register(d); return defs; },
    get(id) { return map.get(id); },
    has(id) { return map.has(id); },
    all() { return [...map.values()]; },
    ids() { return [...map.keys()]; },
    count() { return map.size; },
    filter(fn) { return this.all().filter(fn); },
    byTier(t) { return this.all().filter((d) => (d.tier ?? 1) === t); },
    upTo(t) { return this.all().filter((d) => (d.tier ?? 1) <= t); },
  };
}

export const Enemies = makeRegistry('enemy');
export const Items = makeRegistry('item');
export const Equipment = makeRegistry('equipment');
export const Abilities = makeRegistry('ability');
export const Talents = makeRegistry('talent');
export const Facilities = makeRegistry('facility');
export const Weapons = makeRegistry('weapon');     // auto-firing in-run weapons (VS-style)
export const Characters = makeRegistry('character'); // playable characters

export function registryStats() {
  return {
    enemies: Enemies.count(), items: Items.count(), equipment: Equipment.count(),
    abilities: Abilities.count(), talents: Talents.count(), facilities: Facilities.count(),
    weapons: Weapons.count(), characters: Characters.count(),
  };
}
