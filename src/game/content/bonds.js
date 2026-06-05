// 原#13 羈絆系統 (bond / synergy system).
// A bond completes when the run's build satisfies need(ctx). Its bonus(stats,player)
// is applied ONCE and persists for the rest of the run — builds only ever GROW within
// a run (you don't lose weapons/abilities except a rare fusion sacrifice), so one-shot
// application is safe and cheap. Bonuses are deliberately small ("些許能力差異").
//
// Schema: { id, name, desc, tag, need(ctx)->bool, bonus(stats, player), bonusDesc }

function ctxOf(run, player) {
  const weapons = new Set((player.weapons || []).map((w) => w.def.id));
  const abilities = new Set(run.abilities || []);
  const equips = new Set(Object.values(run.equipment || {}).filter(Boolean));
  return {
    weapons, abilities, equips, stats: player.stats,
    weaponCount: (player.weapons || []).filter((w) => !w.def.equipped).length,
    abilityCount: (run.abilities || []).length,
    hasW: (id) => weapons.has(id),
    hasA: (id) => abilities.has(id),
    hasE: (id) => equips.has(id),
    anyA: (...ids) => ids.some((id) => abilities.has(id)),
    allA: (...ids) => ids.every((id) => abilities.has(id)),
  };
}

export const BONDS = [
  { id: 'bond_inferno', name: '烈焰之心', tag: '焰', desc: '燃魂 ＋ 任一火焰武器', bonusDesc: '傷害 +6%',
    need: (c) => c.hasA('ignite') && (c.hasW('w_fan') || c.hasW('w_aura') || c.hasW('w_inferno')),
    bonus: (s) => { s.damageMult *= 1.06; } },
  { id: 'bond_storm', name: '雷霆網絡', tag: '雷', desc: '連鎖閃電 ＋ 迅捷符文', bonusDesc: '射速 +8%',
    need: (c) => c.hasW('w_lightning') && c.hasA('haste'),
    bonus: (s) => { s.fireRateMult *= 1.08; } },
  { id: 'bond_vampire', name: '血色君王', tag: '血', desc: '吸血 ＋ 任一詛咒被動', bonusDesc: '吸血 +2%',
    need: (c) => ((c.stats.lifesteal || 0) > 0.0 || c.hasA('lifesteal')) && c.anyA('curse_bloodpact', 'curse_frenzy', 'curse_titan', 'curse_glasssoul', 'curse_greedpact'),
    bonus: (s) => { s.lifesteal = (s.lifesteal || 0) + 0.02; } },
  { id: 'bond_assassin', name: '致命精準', tag: '暴', desc: '銳利之眼 ＋ 加速彈道', bonusDesc: '暴擊率 +5%、暴傷 +0.2',
    need: (c) => c.hasA('crit') && c.hasA('velocity'),
    bonus: (s) => { s.critChance += 0.05; s.critMult += 0.2; } },
  { id: 'bond_orbit', name: '環繞軍團', tag: '環', desc: '環衛刃 ＋ 環繞魂衛', bonusDesc: '範圍 +10%',
    need: (c) => c.hasW('w_orbit') && c.hasA('orbit'),
    bonus: (s) => { s.area = (s.area || 1) * 1.1; } },
  { id: 'bond_swift', name: '疾風行者', tag: '速', desc: '疾風之靴 ＋ 瞬影', bonusDesc: '移速 +8%、衝刺冷卻 -10%',
    need: (c) => c.hasA('swift') && c.hasA('dash'),
    bonus: (s) => { s.speed *= 1.08; s.dashCd *= 0.9; } },
  { id: 'bond_arsenal', name: '武器庫', tag: '武', desc: '攜帶 4 把以上武器', bonusDesc: '傷害 +8%',
    need: (c) => c.weaponCount >= 4,
    bonus: (s) => { s.damageMult *= 1.08; } },
  { id: 'bond_scholar', name: '萬法通曉', tag: '識', desc: '擁有 8 個以上被動', bonusDesc: '傷害 +4%、生命 +12',
    need: (c) => c.abilityCount >= 8,
    bonus: (s, p) => { s.damageMult *= 1.04; s.maxHp += 12; p.heal(12); } },
  { id: 'bond_fortress', name: '鋼鐵壁壘', tag: '守', desc: '荊棘護甲 ＋ 減傷 ≥ 2', bonusDesc: '減傷 +2、生命 +16',
    need: (c) => c.hasA('thorns') && (c.stats.defense || 0) >= 2,
    bonus: (s, p) => { s.defense += 2; s.maxHp += 16; p.heal(16); } },
  { id: 'bond_glass', name: '玻璃藝術', tag: '脆', desc: '玻璃大砲 ＋ 任一詛咒', bonusDesc: '傷害 +10%',
    need: (c) => c.hasA('glasscannon') && c.anyA('curse_bloodpact', 'curse_titan', 'curse_glasssoul', 'curse_frenzy'),
    bonus: (s) => { s.damageMult *= 1.1; } },
  { id: 'bond_collector', name: '鑑藏家', tag: '藏', desc: '三個裝備欄全數裝備', bonusDesc: '全能力小幅提升',
    need: (c) => c.equips.size >= 3,
    bonus: (s) => { s.damageMult *= 1.04; s.fireRateMult *= 1.04; s.maxHp += 10; } },
  { id: 'bond_homing', name: '索命彈幕', tag: '導', desc: '追魂彈 ＋ 追蹤魂彈被動', bonusDesc: '投射物 +1',
    need: (c) => c.hasW('w_homing') && c.hasA('homing'),
    bonus: (s) => { s.projCountAdd = (s.projCountAdd || 0) + 1; } },
];

// Detect newly-completed bonds, apply each ONCE, record on run.bonds. Returns the
// list of bonds completed this call (for the banner).
export function checkBonds(run, player) {
  run.bonds = run.bonds || [];
  const c = ctxOf(run, player);
  const newly = [];
  for (const b of BONDS) {
    if (run.bonds.includes(b.id)) continue;
    let ok = false; try { ok = b.need(c); } catch (e) { /* */ }
    if (ok) { run.bonds.push(b.id); try { b.bonus(player.stats, player); } catch (e) { /* */ } newly.push(b); }
  }
  return newly;
}

export function activeBonds(run) { return (run.bonds || []).map((id) => BONDS.find((b) => b.id === id)).filter(Boolean); }
