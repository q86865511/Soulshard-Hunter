// hub/upgrades.js — upgrades methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { BIOMES } from '../../../art/biomes.js';
import { Sfx } from '../../../engine/audio.js';
import { mouse } from '../../../engine/input.js';
import { goldStr, uiScale } from '../../../engine/renderer.js';
import { SKINS, ownsSkin, skinnedSprite } from '../../content/characters.js';
import { dailyChallenge } from '../../content/daily.js';
import { FORGE_EFFECTS, FORGE_MAX_EFFECTS, FORGE_MAX_LEVEL, buyForgeEffect, buyForgeLevel, forgeEffectCost, forgeLevelCost, forgeOf, forgeableWeapons } from '../../content/forge.js';
import { GUILD_RANKS, claimGuildRank, claimableRanks } from '../../content/guild.js';
import { MAX_TRACKED, chapterState, claimChapter, claimQuest, claimWeekly, guildQuests, questLockedBy, trackQuest, weeklyQuests } from '../../content/quests.js';
import { Characters, Facilities, Talents, Weapons } from '../../content/registry.js';
import { ensureSkinOffers, rerollCost, rerollSkinShop, skinPoolDry, skinPrice } from '../../content/skinshop.js';
import { TALENT_BRANCHES } from '../../content/talents.js';
import { facilityGate, gate } from '../../content/town_gates.js';
import { setScene } from '../../scene.js';
import { META, newRun, saveMeta } from '../../state.js';
import { refs } from '../refs.js';
import { inside } from './shared.js';

export const upgradesMixin = {

  talentNodes() {
    const f = this.panelFrame(); const S = f.S;
    const cols = TALENT_BRANCHES.length; const colW = f.w / cols;
    const nodes = [];
    TALENT_BRANCHES.forEach((br, ci) => {
      const list = Talents.filter((t) => t.branch === br.id).sort((a, b) => (a.row || 0) - (b.row || 0));
      list.forEach((def, ri) => {
        const nodeW = Math.min(colW - 22 * S, 168 * S);
        const nodeH = 66 * S;
        const x = f.x + ci * colW + (colW - nodeW) / 2;
        const y = f.y + 92 * S + ri * (nodeH + 12 * S) - (this.panelScroll || 0);
        nodes.push({ def, x, y, w: nodeW, h: nodeH, color: br.color });
      });
    });
    return { f, nodes };
  },
  updateTalents(mx, my) {
    if (!mouse.justDown) return;
    const { nodes } = this.talentNodes();
    for (const n of nodes) if (inside(mx, my, n)) { const def = n.def, cur = META.talents[def.id] || 0; if (this.talentState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'talentPurchases')), () => this.buyTalent(def)); else { const st = this.talentState(def); this.feedback(st === 'gated' ? ('🔒 ' + gate(META, 'talentRow2')) : st === 'locked' ? '需先解鎖前置天賦' : st === 'max' ? '已達滿級' : '金幣不足'); } return; }
  },

  facilityCards() {
    const f = this.panelFrame(); const S = f.S;
    const list = Facilities.all();
    const cols = 3; const cardW = (f.w - 40 * S - (cols - 1) * 16 * S) / cols; const cardH = 92 * S;
    const top = this.bodyTop(f) + 12 * S;
    const cards = list.map((def, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return { def, x: f.x + 20 * S + c * (cardW + 16 * S), y: top + r * (cardH + 14 * S) - (this.panelScroll || 0), w: cardW, h: cardH };
    });
    return { f, cards };
  },
  updateFacilities(mx, my) {
    if (!mouse.justDown) return;
    const { cards } = this.facilityCards();
    for (const c of cards) if (inside(mx, my, c)) { const def = c.def, cur = META.facilities[def.id] || 0; if (this.facilityState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'facilityPurchases')), () => this.buyFacility(def)); else { const st = this.facilityState(def); this.feedback(st === 'gated' ? ('🔒 ' + facilityGate(META, def.id, cur + 1)) : st === 'max' ? '已達滿級' : '金幣不足'); } return; }
  },

  // ---- forge (5-5) ---------------------------------------------------------
  forgeLayout() {
    const f = this.panelFrame(); const S = f.S;
    const list = forgeableWeapons(META);
    const listW = 200 * S, top = this.bodyTop(f) + 12 * S, rowH = 34 * S;
    const rows = list.map((w, i) => ({ w, x: f.x + 20 * S, y: top + i * (rowH + 4 * S) - (this.panelScroll || 0), wd: listW, h: rowH }));
    const detail = { x: f.x + 20 * S + listW + 18 * S, y: top, w: f.w - (40 * S + listW + 18 * S), h: f.h - 100 * S };
    return { f, rows, detail, list, rowH };
  },
  updateForge(mx, my) {
    if (gate(META, 'forge')) return;   // R17/9.1: gated until the first biome clear
    const L = this.forgeLayout();
    if (!mouse.justDown) return;
    for (const r of L.rows) if (mx >= r.x && mx <= r.x + r.wd && my >= r.y && my <= r.y + r.h) { this.forgeSel = r.w.id; this.panelScroll = this.panelScroll || 0; Sfx.play('uiClick'); return; }   // r.wd, NOT inside()'s r.w (which is the weapon def)
    const sel = this.forgeSel; if (!sel) return;
    // level button + effect buttons in the detail pane
    const b = this.forgeButtons(L.detail);
    const wname = (Weapons.get(sel) || {}).name || sel;
    if (b.level && inside(mx, my, b.level)) { const cost = forgeLevelCost(forgeOf(META, sel).level); if (META.gold >= cost) this.ask('強化「' + wname + '」鍛造等級？', goldStr(cost), () => { if (buyForgeLevel(META, sel)) { saveMeta(); this.feedback('鍛造強化 +1'); } }); else this.feedback('金幣不足或已滿級'); return; }
    for (const eb of b.effects) if (inside(mx, my, eb)) { if (eb.owned || eb.full) { this.feedback(eb.owned ? '已鑲嵌' : '特效欄已滿'); return; } const cost = forgeEffectCost(forgeOf(META, sel).effects.length); if (META.gold >= cost) this.ask('在「' + wname + '」鑲嵌特效：' + eb.name + '？', goldStr(cost), () => { if (buyForgeEffect(META, sel, eb.id)) { saveMeta(); this.feedback('鑲嵌特效：' + eb.name); } }); else this.feedback('金幣不足'); return; }
  },
  forgeButtons(d) {
    const S = uiScale(); const sel = this.forgeSel; const f = sel ? forgeOf(META, sel) : { level: 0, effects: [] };
    const level = f.level < FORGE_MAX_LEVEL ? { x: d.x + 14 * S, y: d.y + 92 * S, w: d.w - 28 * S, h: 32 * S } : null;
    // R17 UI-sweep: compress the effect-row pitch when the (viewport-capped) detail pane can't
    // fit all rows at 38S — at uiScale 1.5 the last rows used to paint past the panel bottom.
    const pitch = Math.max(26 * S, Math.min(38 * S, (d.h - 150 * S - 8 * S) / Math.max(1, FORGE_EFFECTS.length)));
    const rowH = Math.min(32 * S, pitch - 4 * S);
    const effects = FORGE_EFFECTS.map((e, i) => ({ ...e, owned: f.effects.includes(e.id), full: f.effects.length >= FORGE_MAX_EFFECTS, x: d.x + 14 * S, y: d.y + 150 * S + i * pitch, w: d.w - 28 * S, h: rowH }));
    return { level, effects };
  },

  // ---- guild rank (5-3) ----------------------------------------------------
  guildRankRows() {
    const f = this.panelFrame(); const S = f.S;
    const top = this.bodyTop(f) + 60 * S, rowH = 34 * S;
    const rows = GUILD_RANKS.map((rk, i) => ({ rk, i, x: f.x + 20 * S, y: top + i * (rowH + 5 * S) - (this.panelScroll || 0), w: f.w - 40 * S, h: rowH, claim: { x: f.x + f.w - 132 * S, y: top + i * (rowH + 5 * S) + 4 * S - (this.panelScroll || 0), w: 92 * S, h: 26 * S } }));
    return { f, rows };
  },
  updateGuildRank(mx, my) {
    if (!mouse.justDown) return;
    const claimable = new Set(claimableRanks(META).map((c) => c.i));
    for (const r of this.guildRankRows().rows) if (claimable.has(r.i) && inside(mx, my, r.claim)) { const rk = claimGuildRank(META, r.i); if (rk) { saveMeta(); this.feedback('晉升「' + rk.name + '」'); } return; }
  },

  // ---- sortie --------------------------------------------------------------
  sortieLayout() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all();
    // R17/4.1: 9 heroes per page (3×3); the bottom hero-info block is gone — each card now
    // carries its own info (left: sprite+name, right: starting weapon + effect lines).
    const perPage = 9, cols = 3;
    const pages = Math.max(1, Math.ceil(chars.length / perPage));
    if (this.sortPage >= pages) this.sortPage = pages - 1;
    if (this.sortPage < 0) this.sortPage = 0;
    const start = { x: f.x + f.w / 2 - 110 * S, y: f.y + f.h - 52 * S, w: 220 * S, h: 40 * S };
    const dY = start.y - 44 * S;
    const dPrev = { x: f.x + f.w / 2 - 96 * S, y: dY, w: 30 * S, h: 26 * S };
    const dNext = { x: f.x + f.w / 2 + 66 * S, y: dY, w: 30 * S, h: 26 * S };
    const lvlY = dY - 44 * S;
    const levels = BIOMES.slice(0, Math.min(BIOMES.length, (META.levels && META.levels.unlocked) || 1));
    const lbW = Math.min(116 * S, (f.w - 48 * S) / Math.max(1, levels.length) - 8 * S);
    const lvlButtons = levels.map((b, i) => ({ b, x: f.x + 24 * S + i * (lbW + 8 * S), y: lvlY, w: lbW, h: 30 * S }));
    const pgY = lvlY - 34 * S;
    const prev = { x: f.x + f.w / 2 - 116 * S, y: pgY, w: 34 * S, h: 22 * S };
    const next = { x: f.x + f.w / 2 + 82 * S, y: pgY, w: 34 * S, h: 22 * S };
    const dailyBar = { x: f.x + 20 * S, y: f.y + 52 * S, w: f.w - 40 * S, h: 28 * S };   // R18/B9 每日挑戰 entry
    const top = f.y + 88 * S;
    const cw = (f.w - 40 * S - (cols - 1) * 12 * S) / cols;
    // R17 B15: NO hard floor — at high uiScale a 56S floor pushed the grid over the page/level
    // rows. Tight space instead switches the cards into a compact mode (drawSortie reads card.h).
    const chh = Math.max(34 * S, Math.min(86 * S, (pgY - 8 * S - top) / 3 - 8 * S));
    const pageChars = chars.slice(this.sortPage * perPage, this.sortPage * perPage + perPage);
    const cards = pageChars.map((c, i) => ({ c, x: f.x + 20 * S + (i % cols) * (cw + 12 * S), y: top + Math.floor(i / cols) * (chh + 8 * S), w: cw, h: chh }));
    return { f, cards, prev, next, pages, pgY, levels, lvlButtons, lvlY, dPrev, dNext, dY, start, dailyBar };
  },
  // R18/B9: launch today's daily challenge — a closed showcase run (borrowed biome+hero,
  // fixed difficulty 3, deterministic mutators). No unlocks are written (clearLevel/hub guard).
  launchDaily() {
    const dc = dailyChallenge();
    Sfx.play('portal'); saveMeta();
    setScene(refs.run, { run: newRun({ biomeId: dc.biomeId, characterId: dc.characterId, difficulty: 3, mode: 'daily', challengeKey: dc.key, dailyMutators: dc.mutators }) });
  },
  curBiome(L) { return this.selBiome || (L.levels.length ? L.levels[L.levels.length - 1].id : BIOMES[0].id); },
  maxDiff(biomeId) { return ((META.levels && META.levels.diff && META.levels.diff[biomeId]) || 0) + 1; },
  // R17/4.2: 無盡 unlocks PER BIOME — clearing it once (any difficulty incl. 劇情 writes ≥1)
  biomeCleared(biomeId) { return ((META.levels && META.levels.diff && META.levels.diff[biomeId]) || 0) >= 1; },
  selectChar(c) {
    if (META.unlocked.characters.includes(c.id)) { META.selectedCharacter = c.id; this.heroSprite = skinnedSprite(META, c.id); saveMeta(); Sfx.play('uiClick'); }
    else if (c.unlock.type === 'gold') {
      if (META.gold >= c.unlock.cost) { META.gold -= c.unlock.cost; META.unlocked.characters.push(c.id); META.selectedCharacter = c.id; this.heroSprite = skinnedSprite(META, c.id); saveMeta(); this.feedback('解鎖 ' + c.name); }
      else this.feedback('金幣不足');
    } else this.feedback(c.unlock.hint || '尚未解鎖');
  },
  updateSortie(mx, my) {
    const L = this.sortieLayout();
    if (mouse.wheel) this.sortPage = Math.max(0, Math.min(L.pages - 1, this.sortPage + (mouse.wheel > 0 ? 1 : -1)));
    if (!mouse.justDown) return;
    if (inside(mx, my, L.dailyBar)) { this.launchDaily(); return; }   // R18/B9 每日挑戰
    for (const card of L.cards) if (inside(mx, my, card)) { this.selectChar(card.c); return; }
    if (inside(mx, my, L.prev)) { this.sortPage = Math.max(0, this.sortPage - 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.next)) { this.sortPage = Math.min(L.pages - 1, this.sortPage + 1); Sfx.play('uiClick'); return; }
    for (const lb of L.lvlButtons) if (inside(mx, my, lb)) { this.selBiome = lb.b.id; this.selDiff = 1; Sfx.play('uiClick'); return; }
    // R17/4.2: the difficulty stepper IS the mode picker now — 劇情(0) → 1..maxD → 無盡(maxD+1,
    // only on a biome that's been cleared once). The separate 模式 toggle button is gone.
    const b0 = this.curBiome(L);
    const maxD = this.maxDiff(b0);
    const topD = maxD + (this.biomeCleared(b0) ? 1 : 0);
    if (inside(mx, my, L.dPrev)) { this.selDiff = Math.max(0, this.selDiff - 1); Sfx.play('uiClick'); return; }   // 6.5: 0 = 劇情難度
    if (inside(mx, my, L.dNext)) { this.selDiff = Math.min(topD, this.selDiff + 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.start)) {
      const b = this.curBiome(L); const mD = this.maxDiff(b);
      const isEndless = this.biomeCleared(b) && this.selDiff > mD;
      const d = isEndless ? mD : Math.min(mD, Math.max(0, this.selDiff));   // endless runs at the biome's highest unlocked difficulty
      Sfx.play('portal'); saveMeta();
      setScene(refs.run, { run: newRun({ biomeId: b, difficulty: d, mode: isEndless ? 'endless' : 'normal' }) });
    }
  },

  // ---- quests (guild tab 0) ------------------------------------------------
  questLayout() {
    const f = this.panelFrame(); const S = f.S; const t0 = this.bodyTop(f);
    const mainClaim = { x: f.x + 24 * S, y: t0 + 58 * S, w: 150 * S, h: 30 * S };
    const mainTrack = { x: f.x + 182 * S, y: t0 + 58 * S, w: 112 * S, h: 30 * S };
    const list = guildQuests(META).slice(0, 6);
    const rowH = 38 * S, gap = 6 * S, scroll = this.panelScroll || 0;
    // R18/B9: weekly bounties ride at the top of the same scroll region (header + 3 rows),
    // then a「一般懸賞」sub-header and the regular tracked bounties below.
    const weeklies = weeklyQuests(META);
    const wTop = t0 + 134 * S + 22 * S;   // +22 leaves room for the「本週懸賞」label
    const weeklyRows = weeklies.map((q, i) => { const y = wTop + i * (rowH + gap) - scroll; return { q, y, h: rowH, weekly: true, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    const top = wTop + weeklies.length * (rowH + gap) + 30 * S;   // +30 for the「一般懸賞」label
    // R17 UI-sweep: rows scroll (at uiScale 1.5 rows 4-6 painted 145px past the panel bottom)
    const rows = list.map((q, i) => { const y = top + i * (rowH + gap) - scroll; return { q, y, h: rowH, track: { x: f.x + f.w - 196 * S, y: y + 6 * S, w: 84 * S, h: 26 * S }, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    return { f, mainClaim, mainTrack, rows, weeklyRows, wTop, t0, top, clipTop: t0 + 134 * S - 4 * S };
  },
  updateQuests(mx, my) {
    if (!mouse.justDown) return;
    const L = this.questLayout();
    const cur = chapterState(META, META.questIndex || 0);
    if (cur && cur.done && inside(mx, my, L.mainClaim)) { const q = claimChapter(META); if (q) { saveMeta(); this.feedback('完成 ' + q.title); } return; }
    if (inside(mx, my, L.mainTrack)) { const res = trackQuest(META, 'story'); Sfx.play('uiClick'); if (res === 'full') { this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); } else { saveMeta(); this.feedback(res === 'added' ? '追蹤主線' : '取消追蹤主線'); } return; }
    for (const r of L.weeklyRows) {   // R18/B9 weekly claim
      if (r.y + r.h < L.clipTop || r.y > L.f.y + L.f.h - 24 * L.f.S) continue;
      if (inside(mx, my, r.claim)) { if (claimWeekly(META, r.q.id)) { saveMeta(); this.feedback('領取週常：' + r.q.title); } else this.feedback('尚未達成或已領取'); return; }
    }
    for (const r of L.rows) {
      if (r.y + r.h < L.clipTop || r.y > L.f.y + L.f.h - 24 * L.f.S) continue;   // R17 UI-sweep: scrolled-out rows aren't clickable
      const lockedBy = questLockedBy(META, r.q);   // 5.5: locked rows hide their buttons; clicking the row hints the prerequisite
      if (lockedBy) { if (inside(mx, my, { x: L.f.x, y: r.y, w: L.f.w, h: r.h })) { this.feedback('🔒 需先完成：' + lockedBy); return; } continue; }
      if (inside(mx, my, r.track)) { const res = trackQuest(META, r.q.id); if (res === 'added' || res === 'removed') { saveMeta(); this.feedback((res === 'added' ? '追蹤：' : '取消追蹤：') + r.q.title); } else if (res === 'full') this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); Sfx.play('uiClick'); return; }
      if (inside(mx, my, r.claim)) { if (claimQuest(META, r.q.id)) { saveMeta(); this.feedback('領取：' + r.q.title); } else this.feedback('尚未達成'); return; }
    }
  },

  // ---- wardrobe / clothing store (5-6 + R16/3.8 two-layer) -----------------
  // Layer 1: a grid of unlocked heroes (this.wardrobeChar == null). Layer 2: that hero's
  // skins, with two tabs — 我的造型 (owned → equip) / 造型商店 (ALL skins → buy, tier-priced).
  wardrobeCharCards() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all().filter((c) => (META.unlocked.characters || []).includes(c.id));
    const cols = 4, gap = 14 * S, cw = (f.w - 48 * S - (cols - 1) * gap) / cols, ch = 104 * S;
    const top = f.y + 64 * S;
    const cards = chars.map((c, i) => ({ c, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap) - (this.panelScroll || 0), w: cw, h: ch }));
    return { f, cards, top };
  },
  // R17/3.1: wardrobe entry — two big doors:「我的造型」(equip flow) /「造型商店」(8-slot rack)
  wardrobeEntryRects(f) {
    const S = f.S, w = Math.min(300 * S, (f.w - 72 * S) / 2), h = Math.min(170 * S, f.h * 0.42);
    const y = f.y + f.h / 2 - h / 2 - 8 * S, gap = 24 * S;
    const x0 = f.x + f.w / 2 - w - gap / 2;
    return { mine: { x: x0, y, w, h }, shop: { x: x0 + w + gap, y, w, h } };
  },
  updateWardrobeEntry(mx, my) {
    if (!mouse.justDown) return;
    const r = this.wardrobeEntryRects(this.panelFrame());
    if (inside(mx, my, r.mine)) { this.wardrobeView = 'mine'; this.wardrobeChar = null; this.panelScroll = 0; Sfx.play('uiClick'); }
    else if (inside(mx, my, r.shop)) { this.wardrobeView = 'shop'; this.panelScroll = 0; ensureSkinOffers(META); saveMeta(); Sfx.play('uiClick'); }
  },
  wardrobeBackRect(f) { const S = f.S; return { x: f.x + f.w - 96 * S, y: f.y + 48 * S, w: 78 * S, h: 26 * S }; },   // R17 B15: +2S — sat exactly on the header divider
  updateWardrobeChars(mx, my) {
    if (!mouse.justDown) return;
    if (inside(mx, my, this.wardrobeBackRect(this.panelFrame()))) { this.wardrobeView = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    for (const c of this.wardrobeCharCards().cards) if (inside(mx, my, c)) { this.wardrobeChar = c.c.id; this.panelScroll = 0; Sfx.play('uiClick'); return; }
  },
  wardrobeSkinLayout() {
    const f = this.panelFrame(); const S = f.S; const cid = this.wardrobeChar;
    // R17/3.1:「我的造型」lists OWNED skins only — buying moved entirely to the shop view
    const list = [{ id: null, base: true }, ...SKINS.filter((sk) => ownsSkin(META, cid, sk.id))];
    const rowH = 44 * S, top = this.bodyTop(f) + 6 * S;
    const rows = list.map((sk, i) => { const y = top + i * (rowH + 6 * S) - (this.panelScroll || 0); return { sk, y, h: rowH, btn: { x: f.x + f.w - 134 * S, y: y + 8 * S, w: 110 * S, h: 28 * S } }; });
    const back = this.wardrobeBackRect(f);
    return { f, cid, rows, top, back };
  },
  updateWardrobe(mx, my) {
    if (!this.wardrobeView) { this.updateWardrobeEntry(mx, my); return; }
    if (this.wardrobeView === 'shop') { this.updateSkinShop(mx, my); return; }
    if (this.wardrobeChar == null) { this.updateWardrobeChars(mx, my); return; }
    const L = this.wardrobeSkinLayout();
    const S = L.f.S;
    if (mouse.justDown && inside(mx, my, L.back)) { this.wardrobeChar = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    if (!mouse.justDown) return;
    for (const r of L.rows) if (inside(mx, my, r.btn) || inside(mx, my, { x: L.f.x + 16 * S, y: r.y, w: L.f.w - 32 * S, h: r.h })) { this.pickSkin(L.cid, r.sk); return; }
  },
  // R17/3.1: equip-only — every listed row is owned (the buy path lives in the shop view)
  pickSkin(cid, sk) {
    const id = sk.id || null;
    if (id && !ownsSkin(META, cid, id)) { this.feedback('尚未擁有此造型'); return; }
    if (id) META.skins[cid] = id; else delete META.skins[cid];
    if (cid === (META.selectedCharacter || 'hunter')) this.heroSprite = skinnedSprite(META, cid);
    saveMeta(); Sfx.play('uiClick'); this.feedback('套用造型：' + (id ? sk.name : '原色'));
  },
  // ---- R17/3.2 造型商店: 8-slot (char, skin) rack ---------------------------
  skinShopLayout(f) {
    const S = f.S, cols = 4, gap = 14 * S;
    const top = this.bodyTop(f) + 4 * S;
    const cw = (f.w - 48 * S - (cols - 1) * gap) / cols;
    const chh = Math.min(172 * S, (f.y + f.h - 40 * S - top - gap) / 2);
    const offers = ensureSkinOffers(META);
    const cards = offers.map((o, i) => ({ o, i, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (chh + gap), w: cw, h: chh }));
    const reroll = { x: f.x + f.w - 286 * S, y: f.y + 50 * S, w: 182 * S, h: 26 * S };   // R17 UI-sweep polish: clear of the 50S title divider
    return { f, cards, reroll, back: this.wardrobeBackRect(f), top };
  },
  updateSkinShop(mx, my) {
    if (!mouse.justDown) return;
    const L = this.skinShopLayout(this.panelFrame());
    if (inside(mx, my, L.back)) { this.wardrobeView = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    if (!skinPoolDry(META) && inside(mx, my, L.reroll)) {   // R17 QA: pool exhausted — button is hidden, ignore the click
      this.ask('重新進貨？', goldStr(rerollCost(META)) + '　·　立即更換 8 款上架造型', () => {
        if (rerollSkinShop(META)) { saveMeta(); this.feedback('已重新進貨'); }
        else this.feedback((META.gold || 0) < rerollCost(META) ? '金幣不足' : '未進到新貨，金幣已退還');
      });
      return;
    }
    for (const cd of L.cards) if (inside(mx, my, cd)) { this.buySkinOffer(cd.o); return; }
  },
  buySkinOffer(o) {
    const sk = SKINS.find((s) => s.id === o.s); const c = Characters.get(o.c);
    if (!sk || !c) return;
    const key = o.c + ':' + o.s;
    if ((META.ownedSkins || []).includes(key)) { this.feedback('已擁有此造型'); return; }
    const pr = skinPrice(META, sk);
    if ((META.gold || 0) < pr.price) { this.feedback('金幣不足'); return; }
    this.ask('購買 ' + c.name + ' 造型「' + sk.name + '」？', goldStr(pr.price) + (pr.onSale ? '　·　特賣 8 折！' : '') + (sk.hidden ? '　·　★隱藏造型' : ''), () => {
      if ((META.gold || 0) < pr.price) { this.feedback('金幣不足'); return; }
      META.gold -= pr.price; (META.ownedSkins = META.ownedSkins || []).push(key); saveMeta();
      this.feedback('購買造型：' + c.name + '「' + sk.name + '」');
    });
  },
};
