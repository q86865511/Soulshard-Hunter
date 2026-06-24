// run/combat.js — combat methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Music, Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { rng } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { drawSpriteUI, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { RT } from '../../../net/rt.js';
import { BALANCE } from '../../balance.js';
import { equipItem } from '../../content/equipment.js';
import { Enemies, Equipment } from '../../content/registry.js';
import { RARITY, applyChoice, getRunChoices, rarityOf } from '../../progression.js';
import { setScene } from '../../scene.js';
import { bankRun } from '../../state.js';
import { settingsUI } from '../../ui/settings.js';
import { refs } from '../refs.js';
import { STAT_LABELS, fmtStat, inside } from './shared.js';

export const combatMixin = {

  // continuous spawning from the current 1-3 active enemy types
  spawnTick(dt) {
    if (this.boss || this.finalBoss || this.cleared) return;   // pause the swarm during a boss / the finale / the post-clear Reaper window
    this.typeRotT -= dt;
    if (this.typeRotT <= 0) this.rotateTypes();
    this.spawnTimer -= dt;
    const t = this.run.time;
    // gentler early cap that ramps with threat + time, so a fresh build has room to
    // level up before the swarm overwhelms it (the late game still gets dense).
    // 原#3 + sim easing: soften the opening so a fresh build can get going
    const grace = t < BALANCE.EARLY_GRACE ? 0.45 + 0.55 * (t / BALANCE.EARLY_GRACE) : 1;
    // R18/B7: c_legion lifts the on-screen cap (still clamped to SPAWN_CAP_MAX headroom).
    const cap = Math.round(Math.min(BALANCE.SPAWN_CAP_MAX * (1 + this.curseCapAdd), (BALANCE.SPAWN_CAP_BASE + this.threat * BALANCE.SPAWN_CAP_PER_THREAT + Math.floor(t * 0.11)) * grace * (1 + this.curseCapAdd)));
    if (this.spawnTimer <= 0 && this.world.enemies.length < cap && this.activeTypes.length) {
      const group = 2 + Math.floor((this.threat / 1.5) * grace);   // task-11: bigger spawn groups → swarm pressure
      // enemy hp/dmg grow with threat + time but the growth is CAPPED (no infinite pile-up);
      // difficulty multiplies on top of the capped growth. R18/B7 curses stack on top.
      const tc = Math.min(t, 1200);
      const dmgGrace = t < BALANCE.EARLY_GRACE ? BALANCE.EARLY_DMG_GRACE + (1 - BALANCE.EARLY_DMG_GRACE) * (t / BALANCE.EARLY_GRACE) : 1;
      const hpScale = (1 + Math.min(4.4, (this.threat - 1) * 0.15 + tc * 0.0028)) * this.diffMul * this.curseHpMul;
      const dmgScale = (1 + Math.min(3.0, (this.threat - 1) * 0.10 + tc * 0.0022)) * this.diffMul * dmgGrace * this.curseDmgMul;  // bal: late trash keeps scaling (was min 2.2 / 0.08 / 0.0018)
      for (let i = 0; i < group; i++) {
        const def = this.pickSpawnType();
        const elite = this.threat >= 3 && rng.chance((0.03 + t * 0.0003) * this.dailyEliteMul);   // R18/B9 m_elite
        this.world.spawnRing(def, { hpScale, dmgScale, elite, speedScale: this.curseSpdMul, volatile: this.dailyVolatile });   // R18/B9 m_volatile
      }
      this.spawnTimer = Math.max(BALANCE.SPAWN_INTERVAL_MIN, (BALANCE.SPAWN_INTERVAL_BASE - this.threat * 0.06 - t * 0.004) / grace);
    }
  },
  // mostly the active roster, but occasionally inject a "special" (s_*) monster (D3)
  pickSpawnType() {
    if (rng.chance(0.12)) {
      const sp = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && /^s_/.test(d.id));
      if (sp.length) return sp[rng.int(0, sp.length - 1)];
    }
    return this.activeTypes[rng.int(0, this.activeTypes.length - 1)];
  },

  // ---- choices -------------------------------------------------------------
  onLevelUp() { this.levelQueue++; },
  openChoice() {
    const options = getRunChoices(this.run, this.player);
    this.levelQueue--;
    if (!options.length) {   // fully capped — don't waste the level-up, grant a heal
      this.player.heal(this.player.maxHp * 0.15);
      this.world.particles.text(this.player.x, this.player.y - 16, '已達上限 · 回復生命', { color: P.redL, size: 12 });
      return;
    }
    this.choice = { options, hover: -1, bondHints: options.map((c) => this.bondHintsFor(c)) };   // 8.2: cache hints once (world is paused while choosing → build is frozen)
    this.peekBuild = false;   // 4.19: start showing the cards, not the build peek
  },
  cardRects() {
    const S = uiScale(); const n = this.choice ? this.choice.options.length : 3;
    const cw = Math.min(190 * S, (view.W - 40 * S) / n - 18 * S); const ch = cw * 1.45; const gap = 18 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = (view.H - ch) / 2 + 8 * S;
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateChoice() {
    if (pressed('build')) { this.peekBuild = !this.peekBuild; Sfx.play('uiClick'); return; }   // 4.19: TAB peeks the build
    if (this.peekBuild) return;   // viewing the build panel — ignore card input until TAB back
    const rects = this.cardRects(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.choice.hover = -1;
    rects.forEach((r, i) => { if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) this.choice.hover = i; });
    let pick = -1;
    if (mouse.justDown && this.choice.hover >= 0) pick = this.choice.hover;
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick >= 0 && pick < this.choice.options.length) {
      const c = this.choice.options[pick];
      applyChoice(this.run, this.player, this.world, c);
      this.world.particles.ring(this.player.x, this.player.y, P.manaL, 18, 100);
      this.banner = c.def.name; this.bannerT = 1.4; Sfx.play('levelup');
      this.choice = null; this.peekBuild = false;
    }
  },

  // ---- equipment before/after diff (原#1) ----------------------------------
  // Rows of [label, before, after, fmt] showing how swapping in `def` changes stats.
  equipDiffRows(def) {
    if (!def) return [];
    const cur = this.player.stats;
    if (def.slot === 'weapon') {   // signature weapon: compare the weapon stat block
      const curId = this.run.equipment && this.run.equipment.weapon;
      const cw = (curId && Equipment.get(curId) && Equipment.get(curId).weapon) || null;
      const nw = def.weapon || {};
      const rows = [
        ['傷害', cw ? cw.damage || 0 : 0, nw.damage || 0, 'int'],
        ['射速', cw ? cw.fireRate || 0 : 0, nw.fireRate || 0, 'f1'],
        ['投射物', cw ? cw.projCount || 1 : 0, nw.projCount || 1, 'int'],
        ['穿透', cw ? cw.pierce || 0 : 0, nw.pierce || 0, 'int'],
      ];
      return rows.filter((r) => Math.abs(r[2] - r[1]) > 1e-9);
    }
    // armor / trinket: trial = current stats, undo current slot item, apply candidate
    const slot = def.slot;
    const curDelta = (this.run.equipDelta && this.run.equipDelta[slot]) || {};
    const trial = { ...cur };
    for (const f in curDelta) trial[f] = (trial[f] || 0) - curDelta[f];
    const fakeP = { stats: trial, hp: this.player.hp, heal() {} };
    try { def.apply?.(fakeP); } catch (e) { /* */ }
    const rows = [];
    for (const [f, lab, fmt] of STAT_LABELS) { const b = cur[f] || 0, a = trial[f] || 0; if (Math.abs(a - b) > 1e-9) rows.push([lab, b, a, fmt]); }
    return rows;
  },
  // Draw a compact before→after table. Returns the height consumed.
  drawEquipDiff(x, y, w, def, S, opts = {}) {
    const rows = this.equipDiffRows(def);
    const title = opts.title !== undefined ? opts.title : '替換後變化';
    if (title) uiText(title, x, y, { size: 11 * S, color: P.gray3, weight: '700' });
    let yy = y + (title ? 15 * S : 0);
    if (!rows.length) { uiText('（無屬性變化）', x, yy, { size: 10 * S, color: P.gray2 }); return yy + 12 * S - y; }
    for (const [lab, b, a, fmt] of rows.slice(0, opts.max || 8)) {
      const up = a > b; const col = up ? P.greenL : P.redL;
      uiText(lab, x, yy, { size: 10.5 * S, color: P.gray4 });
      uiText(fmtStat(b, fmt), x + (opts.lw || 92 * S), yy, { size: 10.5 * S, align: 'right', color: P.gray3 });
      uiText('→', x + (opts.lw || 92 * S) + 8 * S, yy, { size: 10 * S, color: P.gray3 });
      uiText(fmtStat(a, fmt), x + (opts.lw || 92 * S) + 56 * S, yy, { size: 10.5 * S, align: 'right', color: col, weight: '800' });
      yy += 13.5 * S;
    }
    return yy - y;
  },

  // ---- equip-pickup menu (B1): paused; equip (replace its slot) or discard ----
  openEquipChoice(def) {
    if (!def) return;
    if (this.equipChoice) { this.equipQueue.push(def); return; }
    this.equipChoice = { def }; Sfx.play('uiClick');
  },
  equipChoiceLayout() {
    const S = uiScale();
    const w = Math.min(view.W * 0.82, 470 * S), h = 396 * S;   // 原#1: taller to fit the before/after diff
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const bw = (w - 60 * S) / 2, by = y + h - 54 * S;
    return { S, x, y, w, h, equip: { x: x + 20 * S, y: by, w: bw, h: 40 * S }, discard: { x: x + w - 20 * S - bw, y: by, w: bw, h: 40 * S } };
  },
  updateEquipChoice() {
    const L = this.equipChoiceLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('space') || pressed('enter')) { this.resolveEquip(true); return; }
    if (pressed('escape')) { this.resolveEquip(false); return; }
    if (mouse.justDown) {
      if (inside(mx, my, L.equip)) this.resolveEquip(true);
      else if (inside(mx, my, L.discard)) this.resolveEquip(false);
    }
  },
  resolveEquip(take) {
    const def = this.equipChoice && this.equipChoice.def;
    if (take && def) { equipItem(this.player, this.run, def); Sfx.play('equip'); this.banner = '已裝備：' + def.name; this.bannerT = 1.6; }
    else Sfx.play('uiClick');
    this.equipChoice = this.equipQueue.length ? { def: this.equipQueue.shift() } : null;
  },
  drawEquipChoice() {
    const L = this.equipChoiceLayout(); const S = L.S; const def = this.equipChoice.def;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.78));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.99), { radius: 10 * S, stroke: P.goldL, lw: 2 });
    uiText('撿到裝備', L.x + L.w / 2, L.y + 26 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    const sp = getSprite(iconOr(def.icon, 'equip_leather_armor'));
    drawSpriteUI(sp.frames[0], L.x + L.w / 2 - 16 * S, L.y + 38 * S, (32 * S) / sp.w);
    const slotName = def.slot === 'weapon' ? '專武' : def.slot === 'armor' ? '護甲' : '飾品';
    uiText(def.name + '　·　' + slotName, L.x + L.w / 2, L.y + 88 * S, { size: 14 * S, align: 'center', color: RARITY[rarityOf(def)].accent, weight: '800' });   // R17/5.1
    this.wrapText(def.desc || '', L.x + L.w / 2, L.y + 106 * S, L.w - 44 * S, 11 * S, P.gray4);
    // current equipment by category (依類別分區)
    const eq = this.run.equipment || {};
    const slots = [['weapon', '專武'], ['armor', '護甲'], ['trinket', '飾品']];
    const cellW = (L.w - 60 * S) / 3, sy = L.y + 150 * S;
    slots.forEach(([slot, label], i) => {
      const cx = L.x + 24 * S + i * (cellW + 6 * S); const cur = eq[slot] && Equipment.get(eq[slot]); const isTarget = def.slot === slot;
      uiRect(cx, sy, cellW, 52 * S, withAlpha('#10121f', 0.85), { radius: 6 * S, stroke: isTarget ? P.goldL : P.ink2, lw: isTarget ? 2 : 1 });
      uiText(label + (isTarget ? ' ◀' : ''), cx + cellW / 2, sy + 13 * S, { size: 10 * S, align: 'center', color: isTarget ? P.goldL : P.gray3, weight: '700' });
      if (cur) { const csp = getSprite(iconOr(cur.icon, 'equip_leather_armor')); drawSpriteUI(csp.frames[0], cx + cellW / 2 - 11 * S, sy + 20 * S, (22 * S) / csp.w); }
      else uiText('（空）', cx + cellW / 2, sy + 36 * S, { size: 10 * S, align: 'center', color: P.gray2 });
    });
    // 原#1: before/after stat comparison vs the item currently in this slot
    this.drawEquipDiff(L.x + 24 * S, sy + 66 * S, L.w - 48 * S, def, S, { lw: 150 * S });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? col : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.equip, eq[def.slot] ? '替換並裝備' : '裝備到空格', P.goldL);
    btn(L.discard, '放棄', P.redL);
    uiText('空白鍵裝備　·　Esc 放棄', L.x + L.w / 2, L.y + L.h - 8 * S, { size: 10 * S, align: 'center', color: P.gray3 });
  },

  // ---- death --------------------------------------------------------------
  // If the level was already cleared, dying still shows the victory (banked once).
  onDeath() { this.finishRun(this.cleared); },

  // ---- pause ---------------------------------------------------------------
  pauseLayout() {
    const S = uiScale();
    const w = 240 * S, h = 46 * S, gap = 14 * S;
    const x = view.W / 2 - w / 2, y0 = view.H / 2 - (h * 4 + gap * 3) / 2;   // R17/10.1: 4 buttons
    return { S, resume: { x, y: y0, w, h }, settings: { x, y: y0 + (h + gap), w, h }, guide: { x, y: y0 + (h + gap) * 2, w, h }, quit: { x, y: y0 + (h + gap) * 3, w, h } };
  },
  updatePause() {
    const L = this.pauseLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('pause') || pressed('escape')) { if (this.confirmQuit) { this.confirmQuit = false; return; } this.paused = false; return; }
    if (!mouse.justDown) return;
    if (this.confirmQuit) {   // 4.8: confirm before abandoning the run
      if (inside(mx, my, L.resume)) { this.abandon(); }                                   // 確定放棄
      else if (inside(mx, my, L.quit)) { this.confirmQuit = false; Sfx.play('uiClick'); }  // 取消
      return;
    }
    if (inside(mx, my, L.resume)) { this.paused = false; Sfx.play('uiClick'); }
    else if (inside(mx, my, L.settings)) settingsUI.show(null, { returnHub: () => this.abandon() });   // settings menu also offers 返回大廳 in-run
    else if (inside(mx, my, L.guide)) { this.paused = false; this.hudTut = true; this._hudTutShown = true; Sfx.play('uiClick'); }   // R17/10.1: replay介面一覽
    else if (inside(mx, my, L.quit)) { this.confirmQuit = true; Sfx.play('uiClick'); }   // 4.8: ask first
  },
  abandon() {
    this.run.score = Math.floor(this.run.kills * 12 + this.run.stage * 400 + this.run.time);
    Music.stop(); Sfx.play('portal');
    if (this.coop) { try { this.coop.dispose(); } catch (e) { /* */ } RT.leaveRoom(); this.coop = null; }   // host leaving closes the room for guests
    if (!this.dead && !this.banked) { this.banked = true; bankRun(this.run); }   // bank at most once (bankRun already applies bestStage/bestScore)
    setScene(refs.hub, {});
  },
  // ---- R17/1.7: post-clear leave confirm ------------------------------------
  // After the final boss dies, E anywhere used to finishRun(true) instantly — players trying to
  // reach the shrine (or fight the Reaper) got yanked to the results screen. Single-player only.
  leaveConfirmLayout() {
    const S = uiScale(); const w = 190 * S, h = 44 * S, gap = 18 * S;
    const y = view.H / 2 + 12 * S;
    return { S, yes: { x: view.W / 2 - w - gap / 2, y, w, h }, no: { x: view.W / 2 + gap / 2, y, w, h } };
  },
  updateLeaveConfirm() {
    const L = this.leaveConfirmLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (pressed('escape') || pressed('pause')) { this.leaveConfirm = false; Sfx.play('uiClick'); return; }
    if (pressed('interact') || pressed('enter')) { this.leaveConfirm = false; this.finishRun(true); return; }   // a fresh E confirms (E,E = quick leave)
    if (!mouse.justDown) return;
    if (inside(mx, my, L.yes)) { this.leaveConfirm = false; this.finishRun(true); }
    else if (inside(mx, my, L.no)) { this.leaveConfirm = false; Sfx.play('uiClick'); }
    else { this.leaveConfirm = false; Sfx.play('uiClick'); }   // click outside = cancel
  },
  drawLeaveConfirm() {
    const S = uiScale(); const L = this.leaveConfirmLayout();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.7));
    uiText('離開戰場並結算勝利？', view.W / 2, view.H / 2 - 54 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('死神仍會降臨——留下迎戰可得傳說獎勵', view.W / 2, view.H / 2 - 26 * S, { size: 13 * S, align: 'center', color: P.gray3 });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? col : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.yes, '確定離場', P.greenL);
    btn(L.no, '繼續戰鬥', P.goldL);
    uiText('E / Enter 確定　·　Esc / 點擊外部 取消', view.W / 2, L.yes.y + L.yes.h + 24 * S, { size: 10.5 * S, align: 'center', color: P.gray3 });
  },

  drawPause() {
    const S = uiScale(); const L = this.pauseLayout();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.7));
    const btn = (r, label, col) => {
      const hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 });
      uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
    };
    if (this.confirmQuit) {   // 4.8: abandon confirmation
      uiText('確定放棄本局？', view.W / 2, L.resume.y - 40 * S, { size: 24 * S, align: 'center', color: '#fff', weight: '900' });
      uiText('本局進度將結算後返回城鎮', view.W / 2, L.resume.y - 14 * S, { size: 12 * S, align: 'center', color: P.gray3 });
      btn(L.resume, '確定放棄', P.redL);
      btn(L.quit, '取消');
      return;
    }
    uiText('暫 停', view.W / 2, L.resume.y - 36 * S, { size: 30 * S, align: 'center', color: '#fff', weight: '900' });
    btn(L.resume, '繼 續');
    btn(L.settings, '設 定');
    btn(L.guide, '📖 介面一覽');   // R17/10.1: re-show the HUD walkthrough any time
    btn(L.quit, '放棄並返回城鎮', P.redL);
  },
};
