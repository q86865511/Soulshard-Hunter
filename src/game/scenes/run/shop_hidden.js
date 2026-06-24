// run/shop_hidden.js — shop_hidden methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { rng } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { drawSpriteUI, fillCircleWorld, glowWorld, strokeCircleWorld, uiClipRound, uiRect, uiScale, uiText, view, worldToScreen } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { BALANCE } from '../../balance.js';
import { skinSpriteName } from '../../content/characters.js';
import { equipItem } from '../../content/equipment.js';
import { claimHidden, hiddenClaimed, hiddenRoomById } from '../../content/hidden.js';
import { Enemies } from '../../content/registry.js';
import { META } from '../../state.js';
import { settingsUI } from '../../ui/settings.js';
import { ANVIL_POOL, inside } from './shared.js';

export const shopHiddenMixin = {

  // ---- in-run shop: epic/prismatic gear + stat anvils (+ hidden purist boon) -
  shopLayout() {
    const S = uiScale();
    const w = Math.min(view.W * 0.9, 720 * S), h = Math.min(view.H * 0.85, 520 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const close = { x: x + w - 38 * S, y: y + 10 * S, w: 28 * S, h: 28 * S };
    const colW = (w - 60 * S) / 2;
    const gearX = x + 24 * S, anvilX = x + 36 * S + colW;
    const cardH = 56 * S, top = y + 100 * S;
    const gearBuyCard = { x: gearX, y: top, w: colW, h: cardH * 1.4 };
    const anvilBuyCard = { x: anvilX, y: top, w: colW, h: cardH * 1.4 };
    // the paused 3-choice overlay (stat OR gear) (#3 / C1)
    let choiceCards = null;
    if (this.shopChoice) {
      // 原#4: GEAR cards stay tall (they fit the before/after diff rows); R17 UI-sweep polish:
      // STAT-anvil cards only hold an emblem + name + 2 desc lines — ×1.62 left ~65% empty.
      const cw = Math.min(166 * S, (w - 64 * S) / 3), ch = cw * (this.shopChoice.kind === 'gear' ? 1.62 : 1.0), cg = 14 * S;
      const totW = 3 * cw + 2 * cg, cx0 = x + (w - totW) / 2, cy = y + h / 2 - ch / 2;
      choiceCards = this.shopChoice.opts.map((opt, i) => ({ x: cx0 + i * (cw + cg), y: cy, w: cw, h: ch, opt }));
    }
    return { S, x, y, w, h, close, gearBuyCard, anvilBuyCard, choiceCards, gearX, anvilX, colW, top };
  },
  anvilPrice() { return Math.round(BALANCE.ANVIL_BASE_PRICE * Math.pow(BALANCE.ANVIL_PRICE_GROWTH, this.anvilBuys || 0) * (this.dailyShopMul || 1)); },   // R18/B9 m_tax
  gearPrice() { return Math.round(BALANCE.GEAR_ANVIL_BASE_PRICE * Math.pow(BALANCE.GEAR_ANVIL_GROWTH, this.gearBuys || 0) * (this.dailyShopMul || 1)); },   // R18/B9 m_tax
  updateShopPanel() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.shopLayout();
    if (this.shopChoice) {                        // choosing: only the 3 cards (+ skip) are live (game stays paused)
      const sk = this.shopSkipRect(L);            // 4.18: allow skipping the anvil roll
      if (pressed('escape') || (mouse.justDown && sk && inside(mx, my, sk))) { this.shopChoice = null; Sfx.play('uiClick'); return; }
      if (mouse.justDown && L.choiceCards) for (const c of L.choiceCards) if (inside(mx, my, c)) { this.pickShop(c.opt); return; }
      return;
    }
    if (pressed('escape') || pressed('interact') || pressed('build')) { this.shopOpen = false; return; }
    if (mouse.justDown) {
      if (inside(mx, my, L.close)) { this.shopOpen = false; return; }
      if (inside(mx, my, L.gearBuyCard)) { this.buyGearAnvil(); return; }
      if (inside(mx, my, L.anvilBuyCard)) { this.buyAnvil(); return; }
      if (!inside(mx, my, L)) this.shopOpen = false;
    }
  },
  buyAnvil() {
    const price = this.anvilPrice();
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    this.run.shards -= price; this.anvilBuys = (this.anvilBuys || 0) + 1;
    const pool = ANVIL_POOL.slice(), pick = [];
    for (let i = 0; i < 3 && pool.length; i++) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
    // R17 B15: resolve each option's diminishing factor NOW so the card desc tells the truth
    const nMap = (this.run._anvN = this.run._anvN || {});
    this.shopChoice = { kind: 'stat', opts: pick.map((o) => {
      const f = o.flat ? 1 : Math.pow(BALANCE.ANVIL_DIMINISH ?? 0.85, nMap[o.name] || 0);
      return { ...o, f, desc: o.desc + (f < 0.999 ? `（重複鍛造 · 效益 ×${f.toFixed(2)}）` : '') };
    }) };
    Sfx.play('buy');
  },
  buyGearAnvil() {
    const price = this.gearPrice();
    if (this.run.shards < price) { this.flashShop('魂晶不足'); return; }
    const pick = this.rollGearChoice();
    if (!pick.length) { this.flashShop('已無裝備可鍛'); return; }
    this.run.shards -= price; this.gearBuys = (this.gearBuys || 0) + 1;
    this.shopChoice = { kind: 'gear', opts: pick }; Sfx.play('buy');
  },
  shopSkipRect(L) {   // 4.18: the「跳過」button below the anvil 3-choice
    if (!L || !L.choiceCards || !L.choiceCards.length) return null;
    const S = uiScale(), c0 = L.choiceCards[0];
    return { x: view.W / 2 - 80 * S, y: c0.y + c0.h + 12 * S, w: 160 * S, h: 30 * S };
  },
  pickShop(opt) {
    if (this.shopChoice.kind === 'stat') {
      try { opt.apply(this.player.stats, this.player, opt.f ?? 1); } catch (e) { /* */ }
      if (!opt.flat) { const nMap = (this.run._anvN = this.run._anvN || {}); nMap[opt.name] = (nMap[opt.name] || 0) + 1; }   // R17 B15: count per-name buys for diminishing
      this.run.anvilCount = (this.run.anvilCount || 0) + 1; this.shopChoice = null; this.maybeBoon();
    }
    else { equipItem(this.player, this.run, opt); this.run.gearTaken = true; this.shopChoice = null; }
    Sfx.play('levelup');
  },
  // hidden path: buy lots of anvils and NEVER take gear -> a one-time random boon
  maybeBoon() {
    if (this.run.boonUsed || this.run.gearTaken) return;
    if ((this.run.anvilCount || 0) >= 4 && rng.chance(0.35)) this.triggerBoon();
  },
  triggerBoon() {
    this.run.boonUsed = true; this.run.purist = true;
    const boons = [
      { n: '傷害', f: (s, m) => { s.damageMult *= 1 + m; } },
      { n: '生命', f: (s, m, p) => { const a = Math.round(p.maxHp * m); s.maxHp += a; p.heal(a); } },
      { n: '射速', f: (s, m) => { s.fireRateMult *= 1 + m; } },
      { n: '移速', f: (s, m) => { s.speed *= 1 + m * 0.5; } },
      { n: '暴擊', f: (s, m) => { s.critChance += m * 0.5; } },
    ];
    const b = boons[rng.int(0, boons.length - 1)];
    const mag = 0.01 + rng.next() * 0.99;     // 1% .. 100%
    try { b.f(this.player.stats, mag, this.player); } catch (e) { /* */ }
    this.banner = `稜彩祝福！${b.n} +${Math.round(mag * 100)}%　自此踏上純能力值之道`;
    this.bannerT = 4.0; Sfx.play('levelup');
    this.world.particles.ring(this.player.x, this.player.y, P.purpleL, 30, 200);
  },
  flashShop(msg) { this.shopFlash = msg; this.shopFlashT = 1.2; },

  // ---- render --------------------------------------------------------------
  // ---- hidden rooms (隱藏房間) ---------------------------------------------
  openHidden(h) {
    const room = hiddenRoomById(h.id);
    h.used = true;
    META.stats.hiddenRoomsFound = (META.stats.hiddenRoomsFound || 0) + 1;
    const already = hiddenClaimed(room.id);
    if (this.coop) {   // co-op can't pause the shared world → resolve immediately
      const res = already ? '此密室已探索過' : (claimHidden(room.id) || '');
      const txt = typeof res === 'string' ? res : (res && res.text) || '';   // R17/6.5: claims return reveal objects now
      this.banner = '隱藏房間 · ' + (txt || room.name); this.bannerT = 2.8; Sfx.play('levelup');
      return;
    }
    this.hiddenPanel = { room, claimed: already, result: null, t: 0 }; Sfx.play('levelup');
  },
  updateHidden(dt) {
    const hp = this.hiddenPanel; hp.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (pressed('escape') || pressed('pause')) { this.hiddenPanel = null; return; }
    if (!(mouse.justDown || pressed('interact') || pressed('space') || pressed('slot1'))) return;
    if (hp.result == null) {
      hp.result = hp.claimed ? '此密室已被探索過 — 寶藏早已取走。' : (claimHidden(hp.room.id) || '此密室已被探索過。');
      const txt = typeof hp.result === 'string' ? hp.result : hp.result.text;   // R17/6.5
      this.banner = '隱藏房間 · ' + txt; this.bannerT = 3.2; Sfx.play('levelup');
      if (typeof hp.result === 'object') { try { this.world.particles.ring(this.player.x, this.player.y, P.goldL, 30, 170); } catch (e) { /* */ } }
    } else { this.hiddenPanel = null; }   // a second press closes
  },
  // R17/7.1: wake each planned guardian at its rolled time (skipped once the level is cleared)
  guardianTick() {
    if (!this.guardianPlan) return;
    for (const g of this.guardianPlan) {
      if (g.done || this.run.time < g.at) continue;
      g.done = true;
      if (this.cleared) continue;
      const def = Enemies.get('brute') || Enemies.get('slime');
      if (!def) continue;
      const e = this.world.spawnEnemy(def, g.fr.x, g.fr.y, { hpScale: BALANCE.GUARDIAN_HP_SCALE, dmgScale: BALANCE.GUARDIAN_DMG_SCALE, elite: true, quiet: true });
      if (e) { e.guardian = true; e.scale = (e.scale || 1) * 1.25; }
      this.banner = '⚔ 寶庫守護怪甦醒了——擊敗牠奪取鑰匙！'; this.bannerT = 3.0; Sfx.play('levelup');
      try { this.world.particles.ring(g.fr.x, g.fr.y, P.goldL, 26, 150); } catch (err) { /* */ }
    }
  },
  // R17/7.3: the vault no longer auto-eats a key on touch — E confirms, with fanfare
  openVault(pk) {
    if (!pk || pk.opened || (this.world.keys | 0) <= 0) return;
    this.world.keys -= 1;
    pk.opened = true; pk.dead = true;
    this.world.openChest(pk.x, pk.y - 4, pk.value || 1);
    this.world.vaultNear = null;
    this.banner = '🔑 寶庫開啟！'; this.bannerT = 2.4;
    try { this.world.particles.ring(pk.x, pk.y, P.goldL, 18, 120); this.world.particles.ring(pk.x, pk.y, P.goldL, 30, 170); } catch (e) { /* */ }
    Sfx.play('levelup');
  },
  drawVaultPrompt() {
    const pk = this.world.vaultNear; if (!pk || this.dead) return;
    const S = uiScale(); const ps = worldToScreen(pk.x, pk.y - 18);
    uiText('【E】使用鑰匙開啟寶庫', ps.x, ps.y, { size: 12 * S, align: 'center', color: withAlpha('#ffd479', 0.65 + Math.sin(this.t * 6) * 0.3), weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  drawHiddenRooms() {
    if (!this.hiddenRooms) return; const S = uiScale();
    for (const h of this.hiddenRooms) {
      if (h.used || !h.found) continue;   // invisible until discovered on approach
      const room = hiddenRoomById(h.id); const pulse = 0.5 + Math.sin(this.t * 3 + h.x * 0.1) * 0.5;
      glowWorld(h.x, h.y - 4, 16 + pulse * 6, room.color, 0.2 + pulse * 0.12);
      strokeCircleWorld(h.x, h.y - 4, 11 + pulse * 2, room.color, 2);
      strokeCircleWorld(h.x, h.y - 4, 6, withAlpha(room.color, 0.7), 1.5);
      fillCircleWorld(h.x, h.y - 4, 2.5, room.color);
      const ns = worldToScreen(h.x, h.y - 22); uiText('✦', ns.x, ns.y, { size: 14 * S, align: 'center', color: room.color, weight: '900', shadowColor: withAlpha('#000', 0.8) });
      if (this.nearHidden === h) { const ps = worldToScreen(h.x, h.y + 10); uiText('按 E 進入隱藏房間', ps.x, ps.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
  },
  drawHidden() {
    // 4.16: framed reveal panel (was free-floating centred text); the reward string
    // (hp.result, from claimHidden) already names the specific item.
    const S = uiScale(); const hp = this.hiddenPanel; const room = hp.room;
    uiRect(0, 0, view.W, view.H, withAlpha('#070912', 0.85));
    const w = Math.min(view.W * 0.82, 560 * S), h = Math.min(view.H * 0.62, 350 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    uiRect(x, y, w, h, withAlpha('#12152a', 0.98), { radius: 12 * S, stroke: room.color || P.goldL, lw: 2.5 });
    uiClipRound(x, y, w, h, 12 * S, () => uiRect(x, y, w, 6 * S, withAlpha(room.color || P.goldL, 0.7)));   // #7
    uiText('✦ 隱藏房間 ✦', view.W / 2, y + 26 * S, { size: 12 * S, align: 'center', color: withAlpha(room.color || P.goldL, 0.85), weight: '800' });
    uiText(room.name, view.W / 2, y + 56 * S, { size: 26 * S, align: 'center', color: room.color || P.goldL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
    this.wrapText(room.desc || '', view.W / 2, y + 86 * S, w - 60 * S, 13 * S, P.gray3);
    if (hp.result != null && typeof hp.result === 'object') {
      // R17/6.5: reveal card — the unlocked thing's icon + name, not just a sentence
      const rv = hp.result;
      const iconName = rv.icon || skinSpriteName(META.selectedCharacter || 'hunter', 'devkid');
      const sp = getSprite(iconOr(iconName, 'ability_power'));
      const isz = 44 * S, ix = view.W / 2 - isz / 2, iy = y + h * 0.40;
      const pulse = 0.5 + Math.sin(this.t * 4) * 0.5;
      uiRect(ix - 7 * S, iy - 7 * S, isz + 14 * S, isz + 14 * S, withAlpha('#10121f', 0.9), { radius: 9 * S, stroke: withAlpha(P.goldL, 0.6 + pulse * 0.4), lw: 2.5 });
      drawSpriteUI(sp.frames[0], ix, iy, isz / sp.w);
      uiText(rv.name || '', view.W / 2, iy + isz + 24 * S, { size: 17 * S, align: 'center', color: P.goldL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
      if (rv.kindLabel) uiText('— ' + rv.kindLabel + ' —', view.W / 2, iy + isz + 40 * S, { size: 10.5 * S, align: 'center', color: P.shardL, weight: '700' });
      this.wrapText(rv.text || '', view.W / 2, iy + isz + 58 * S, w - 56 * S, 12.5 * S, P.gray4);
    }
    else if (hp.result != null) this.wrapText(hp.result, view.W / 2, y + h * 0.55, w - 56 * S, 14.5 * S, P.goldL);
    else if (hp.claimed) uiText('（此密室你已探索過）', view.W / 2, y + h * 0.55, { size: 13 * S, align: 'center', color: P.gray3 });
    else uiText('一份未知的寶藏在此等候…', view.W / 2, y + h * 0.55, { size: 13 * S, align: 'center', color: withAlpha('#fff', 0.7), weight: '600' });
    uiText(hp.result != null ? '點擊 / 按 E 關閉' : '點擊 / 按 E 探索此密室', view.W / 2, y + h - 22 * S, { size: 12 * S, align: 'center', color: withAlpha('#ffd479', 0.6 + 0.3 * Math.sin(this.t * 5)), weight: '700' });
    settingsUI.draw();
  },
};
