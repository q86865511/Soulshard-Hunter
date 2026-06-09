// 原#13 + Round16/8.2：多階羈絆系統 (multi-tier bond / synergy system, TFT 式).
//
// 每個羈絆現在有「階級」(tiers / 突破點)。隨著一局的 build 成長，羈絆的「進度數」
// (滿足的需求件數，或一個數值門檻) 上升並跨越階級門檻；每跨過一個階級就把該階的
// 「增量」加成套用一次。一局之內 build 只增不減，所以「每階套用一次」永遠安全。
//
// Schema:
//   { id, name, tag, goal,
//     parts?: [{ label, ids:[...], test(c)->bool }]              // 組合型：進度數 = 滿足的 parts 數
//     count?: (c)->number,  feeds?: 'weapon'|'ability'|'equip'   // 數量型：進度數 = 門檻計數
//     tiers:  [{ at, bonusDesc, bonus(stats, player) }]          // at 遞增；bonus = 跨入此階時套用的「增量」
//   }
// 顯示：bonusDesc 描述「此階新增的」效果(增量)，與 bonus() 完全一致，避免乘法漂移。

const CURSES = ['curse_bloodpact', 'curse_frenzy', 'curse_titan', 'curse_glasssoul', 'curse_greedpact'];
const FIRE_WEAPONS = ['w_fan', 'w_aura', 'w_inferno'];

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
  { id: 'bond_inferno', name: '烈焰之心', tag: '焰', goal: '燃魂 ＋ 火焰武器 ＋ 玻璃大砲',
    parts: [
      { label: '燃魂', ids: ['ignite'], test: (c) => c.hasA('ignite') },
      { label: '火焰武器', ids: FIRE_WEAPONS, test: (c) => FIRE_WEAPONS.some((w) => c.hasW(w)) },
      { label: '玻璃大砲', ids: ['glasscannon'], test: (c) => c.hasA('glasscannon') },
    ],
    tiers: [
      { at: 2, bonusDesc: '傷害 +6%', bonus: (s) => { s.damageMult *= 1.06; } },
      { at: 3, bonusDesc: '傷害 +8%', bonus: (s) => { s.damageMult *= 1.08; } },
    ] },
  { id: 'bond_storm', name: '雷霆網絡', tag: '雷', goal: '連鎖閃電 ＋ 迅捷符文 ＋ 加速彈道',
    parts: [
      { label: '連鎖閃電', ids: ['w_lightning'], test: (c) => c.hasW('w_lightning') },
      { label: '迅捷符文', ids: ['haste'], test: (c) => c.hasA('haste') },
      { label: '加速彈道', ids: ['velocity'], test: (c) => c.hasA('velocity') },
    ],
    tiers: [
      { at: 2, bonusDesc: '射速 +8%', bonus: (s) => { s.fireRateMult *= 1.08; } },
      { at: 3, bonusDesc: '射速 +6%、彈速 +12%', bonus: (s) => { s.fireRateMult *= 1.06; s.projSpeedMult *= 1.12; } },
    ] },
  { id: 'bond_vampire', name: '血色君王', tag: '血', goal: '吸血 ＋ 任一詛咒 ＋ 撕裂',
    parts: [
      { label: '吸血', ids: ['lifesteal'], test: (c) => (c.stats.lifesteal || 0) > 0 || c.hasA('lifesteal') },
      { label: '任一詛咒', ids: CURSES, test: (c) => c.anyA(...CURSES) },
      { label: '撕裂', ids: ['lacerate'], test: (c) => c.hasA('lacerate') },
    ],
    tiers: [
      { at: 2, bonusDesc: '吸血 +2%', bonus: (s) => { s.lifesteal = (s.lifesteal || 0) + 0.02; } },
      { at: 3, bonusDesc: '吸血 +2%、生命 +20', bonus: (s, p) => { s.lifesteal = (s.lifesteal || 0) + 0.02; s.maxHp += 20; p.heal(20); } },
    ] },
  { id: 'bond_assassin', name: '致命精準', tag: '暴', goal: '銳利之眼 ＋ 加速彈道 ＋ 穿透',
    parts: [
      { label: '銳利之眼', ids: ['crit'], test: (c) => c.hasA('crit') },
      { label: '加速彈道', ids: ['velocity'], test: (c) => c.hasA('velocity') },
      { label: '穿透', ids: ['pierce'], test: (c) => c.hasA('pierce') },
    ],
    tiers: [
      { at: 2, bonusDesc: '暴擊率 +5%、暴傷 +0.2', bonus: (s) => { s.critChance += 0.05; s.critMult += 0.2; } },
      { at: 3, bonusDesc: '暴擊率 +5%、暴傷 +0.3', bonus: (s) => { s.critChance += 0.05; s.critMult += 0.3; } },
    ] },
  { id: 'bond_orbit', name: '環繞軍團', tag: '環', goal: '環衛刃 ＋ 環繞魂衛 ＋ 環域光環',
    parts: [
      { label: '環衛刃', ids: ['w_orbit'], test: (c) => c.hasW('w_orbit') },
      { label: '環繞魂衛', ids: ['orbit'], test: (c) => c.hasA('orbit') },
      { label: '環域光環', ids: ['w_aura'], test: (c) => c.hasW('w_aura') },
    ],
    tiers: [
      { at: 2, bonusDesc: '範圍 +10%', bonus: (s) => { s.area = (s.area || 1) * 1.1; } },
      { at: 3, bonusDesc: '範圍 +10%、投射物 +1', bonus: (s) => { s.area = (s.area || 1) * 1.1; s.projCountAdd = (s.projCountAdd || 0) + 1; } },
    ] },
  { id: 'bond_swift', name: '疾風行者', tag: '速', goal: '疾風之靴 ＋ 瞬影 ＋ 加速彈道',
    parts: [
      { label: '疾風之靴', ids: ['swift'], test: (c) => c.hasA('swift') },
      { label: '瞬影', ids: ['dash'], test: (c) => c.hasA('dash') },
      { label: '加速彈道', ids: ['velocity'], test: (c) => c.hasA('velocity') },
    ],
    tiers: [
      { at: 2, bonusDesc: '移速 +8%、衝刺冷卻 -10%', bonus: (s) => { s.speed *= 1.08; s.dashCd *= 0.9; } },
      { at: 3, bonusDesc: '移速 +6%、閃避 +5%', bonus: (s) => { s.speed *= 1.06; s.dodge = (s.dodge || 0) + 0.05; } },
    ] },
  { id: 'bond_arsenal', name: '武器庫', tag: '武', goal: '攜帶 4 / 5 / 6 把武器', feeds: 'weapon',
    count: (c) => c.weaponCount,
    tiers: [
      { at: 4, bonusDesc: '傷害 +8%', bonus: (s) => { s.damageMult *= 1.08; } },
      { at: 5, bonusDesc: '傷害 +5%', bonus: (s) => { s.damageMult *= 1.05; } },
      { at: 6, bonusDesc: '傷害 +5%、射速 +5%', bonus: (s) => { s.damageMult *= 1.05; s.fireRateMult *= 1.05; } },
    ] },
  { id: 'bond_scholar', name: '萬法通曉', tag: '識', goal: '擁有 6 / 9 / 12 個被動', feeds: 'ability',
    count: (c) => c.abilityCount,
    tiers: [
      { at: 6, bonusDesc: '傷害 +4%、生命 +12', bonus: (s, p) => { s.damageMult *= 1.04; s.maxHp += 12; p.heal(12); } },
      { at: 9, bonusDesc: '傷害 +4%、生命 +14', bonus: (s, p) => { s.damageMult *= 1.04; s.maxHp += 14; p.heal(14); } },
      { at: 12, bonusDesc: '傷害 +4%、生命 +16', bonus: (s, p) => { s.damageMult *= 1.04; s.maxHp += 16; p.heal(16); } },
    ] },
  { id: 'bond_fortress', name: '鋼鐵壁壘', tag: '守', goal: '荊棘護甲 ＋ 防禦 ≥2 ＋ 活力',
    parts: [
      { label: '荊棘護甲', ids: ['thorns'], test: (c) => c.hasA('thorns') },
      { label: '防禦 ≥2', ids: [], test: (c) => (c.stats.defense || 0) >= 2 },
      { label: '活力', ids: ['vitality'], test: (c) => c.hasA('vitality') },
    ],
    tiers: [
      { at: 2, bonusDesc: '減傷 +2、生命 +16', bonus: (s, p) => { s.defense += 2; s.maxHp += 16; p.heal(16); } },
      { at: 3, bonusDesc: '減傷 +2、生命 +20', bonus: (s, p) => { s.defense += 2; s.maxHp += 20; p.heal(20); } },
    ] },
  { id: 'bond_glass', name: '玻璃藝術', tag: '脆', goal: '玻璃大砲 ＋ 任一詛咒 ＋ 過載',
    parts: [
      { label: '玻璃大砲', ids: ['glasscannon'], test: (c) => c.hasA('glasscannon') },
      { label: '任一詛咒', ids: CURSES, test: (c) => c.anyA(...CURSES) },
      { label: '過載', ids: ['overload'], test: (c) => c.hasA('overload') },
    ],
    tiers: [
      { at: 2, bonusDesc: '傷害 +10%', bonus: (s) => { s.damageMult *= 1.1; } },
      { at: 3, bonusDesc: '傷害 +12%', bonus: (s) => { s.damageMult *= 1.12; } },
    ] },
  { id: 'bond_collector', name: '鑑藏家', tag: '藏', goal: '裝備 1 / 2 / 3 個裝備欄', feeds: 'equip',
    count: (c) => c.equips.size,
    tiers: [
      { at: 1, bonusDesc: '全能力 +2%、生命 +4', bonus: (s, p) => { s.damageMult *= 1.02; s.fireRateMult *= 1.02; s.maxHp += 4; p.heal(4); } },
      { at: 2, bonusDesc: '全能力 +2%、生命 +6', bonus: (s, p) => { s.damageMult *= 1.02; s.fireRateMult *= 1.02; s.maxHp += 6; p.heal(6); } },
      { at: 3, bonusDesc: '全能力 +2%、暴擊 +3%', bonus: (s) => { s.damageMult *= 1.02; s.fireRateMult *= 1.02; s.critChance += 0.03; } },
    ] },
  { id: 'bond_homing', name: '索命彈幕', tag: '導', goal: '追魂彈 ＋ 追蹤魂彈 ＋ 散射',
    parts: [
      { label: '追魂彈', ids: ['w_homing'], test: (c) => c.hasW('w_homing') },
      { label: '追蹤魂彈', ids: ['homing'], test: (c) => c.hasA('homing') },
      { label: '散射', ids: ['multishot'], test: (c) => c.hasA('multishot') },
    ],
    tiers: [
      { at: 2, bonusDesc: '投射物 +1', bonus: (s) => { s.projCountAdd = (s.projCountAdd || 0) + 1; } },
      { at: 3, bonusDesc: '投射物 +1、傷害 +5%', bonus: (s) => { s.projCountAdd = (s.projCountAdd || 0) + 1; s.damageMult *= 1.05; } },
    ] },
];

// ---- derivation helpers (checkBonds + UI 共用) ----------------------------
export function bondCtx(run, player) { return ctxOf(run, player); }
function safeTest(p, c) { try { return !!p.test(c); } catch (e) { return false; } }
function rawCount(b, c) { return b.count ? (b.count(c) || 0) : b.parts.filter((p) => safeTest(p, c)).length; }
function levelFromCount(b, n) { let lv = 0; for (const t of b.tiers) if (n >= t.at) lv++; return lv; }
export function bondLevel(b, c) { return levelFromCount(b, rawCount(b, c)); }
export function bondMaxLevel(b) { return b.tiers.length; }

// 完整進度快照，供 UI 使用（3選一 / build 面板 / 圖鑑）。
export function bondProgress(b, run, player) {
  const c = ctxOf(run, player);
  const n = rawCount(b, c);
  const level = levelFromCount(b, n);
  const max = b.tiers.length;
  const parts = b.parts ? b.parts.map((p) => ({ label: p.label, ok: safeTest(p, c) })) : null;
  const nextTier = level < max ? b.tiers[level] : null;
  return { count: n, level, max, parts, nextTier, tiers: b.tiers };
}

// 選這個升級選項會不會「推進 / 湊成」這個羈絆？回傳 {fillsPart, fromLevel, toLevel, crosses, toward} 或 null。
export function bondAdvancedBy(b, choice, run, player) {
  if (!choice || choice.kind === 'fuse') return null;
  const c = ctxOf(run, player);
  const n = rawCount(b, c);
  let after = n, fillsPart = null;
  if (b.parts) {
    for (const p of b.parts) {
      if (!safeTest(p, c) && p.ids && p.ids.includes(choice.id)) {
        const adds = choice.kind === 'weapon' || (choice.kind === 'ability' && !(run.abilityLevels && run.abilityLevels[choice.id] > 0));
        if (adds) { after = n + 1; fillsPart = p.label; break; }
      }
    }
  } else if (b.feeds) {
    const lastAt = b.tiers[b.tiers.length - 1].at;
    const adds = (b.feeds === 'weapon' && choice.kind === 'weapon')
      || (b.feeds === 'ability' && choice.kind === 'ability' && !(run.abilityLevels && run.abilityLevels[choice.id] > 0));
    if (adds && n < lastAt) after = n + 1;
  }
  if (after <= n) return null;
  const fromLevel = levelFromCount(b, n);
  const toLevel = levelFromCount(b, after);
  // 「邁向」的那一階：跨階時 = 剛達成的階；未跨階時 = 下一個尚未達成的階。
  const toward = b.tiers[Math.min(toLevel > fromLevel ? toLevel - 1 : fromLevel, b.tiers.length - 1)];
  return { fillsPart, fromLevel, toLevel, crosses: toLevel > fromLevel, toward, max: b.tiers.length };
}

// 偵測剛跨越的階，逐階套用增量一次，記錄於 run。回傳本次跨越的
// { bond, fromTier, toTier, tier } 清單（給橫幅用）。
export function checkBonds(run, player) {
  run.bonds = run.bonds || [];
  run.bondTiers = run.bondTiers || {};
  const c = ctxOf(run, player);
  const newly = [];
  for (const b of BONDS) {
    const lvl = bondLevel(b, c);
    const prev = run.bondTiers[b.id] || 0;
    if (lvl > prev) {
      for (let k = prev; k < lvl; k++) { try { b.tiers[k].bonus(player.stats, player); } catch (e) { /* */ } }
      run.bondTiers[b.id] = lvl;
      if (!run.bonds.includes(b.id)) run.bonds.push(b.id);
      newly.push({ bond: b, fromTier: prev, toTier: lvl, tier: b.tiers[lvl - 1] });
    }
  }
  return newly;
}

// 已達成（≥1 階）的羈絆＋其當前階級，給結算 / build 面板。保留 name/tag/bonusDesc
// 欄位讓舊呼叫端（只取 .name / .bonusDesc）仍可運作。
export function activeBonds(run) {
  const tiers = run.bondTiers || {};
  return (run.bonds || []).map((id) => {
    const b = BONDS.find((x) => x.id === id);
    if (!b) return null;
    const tier = Math.min(tiers[id] || 1, b.tiers.length);
    return { bond: b, tier, name: b.name, tag: b.tag, bonusDesc: b.tiers[tier - 1].bonusDesc };
  }).filter(Boolean);
}
