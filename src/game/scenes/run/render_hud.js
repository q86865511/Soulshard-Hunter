// run/render_hud.js — render_hud methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { clamp } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { camera, ctxRaw, drawSpriteUI, fillCircleWorld, strokeCircleWorld, textWidth, uiBar, uiClipRound, uiRect, uiScale, uiText, view, worldToScreen } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { BONDS, bondProgress } from '../../content/bonds.js';
import { fmtQuestVal, trackedQuestStates } from '../../content/quests.js';
import { hudIcons } from '../../hud.js';
import { META, saveMeta } from '../../state.js';
import { Tele } from '../../../net/telemetry.js';
import { TS } from '../../world.js';
import { BATTLE_HINTS } from './shared.js';

export const renderHudMixin = {

  buildMinimap() {
    const m = this.map; const c = document.createElement('canvas'); c.width = m.tw; c.height = m.th;
    const x = c.getContext('2d');
    for (let ty = 0; ty < m.th; ty++) for (let tx = 0; tx < m.tw; tx++) { x.fillStyle = m.tiles[ty * m.tw + tx] !== 0 ? '#2e3450' : '#171a2c'; x.fillRect(tx, ty, 1, 1); }
    this.minimap = c;
  },
  // shared marker set so the small map and the big (M) map always match (#4)
  plotMinimap(dot, sc) {
    const en = this.world.enemies;
    for (let i = 0; i < en.length && i < 220; i++) {   // 4.22: 守護怪 distinct (gold) so the key source is findable
      const e = en[i], col = e.guardian ? P.goldL : (e.boss ? P.redL : (e.surround ? P.purpleL : P.red));
      dot(e.x, e.y, withAlpha(col, e.guardian ? 1 : 0.85), (e.guardian ? 4 : e.boss ? 5 : e.surround ? 3 : 2.5) * sc);
    }
    for (const pk of this.world.pickups) if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) dot(pk.x, pk.y, pk.locked ? P.redL : P.goldL, 3 * sc);   // 4.22: locked vault = red
    if (this.shrinePos) dot(this.shrinePos.x, this.shrinePos.y, P.shardL, 3.5 * sc);
    for (const n of (this.npcs || [])) if (!n.used) dot(n.x, n.y, n.kind === 'well' ? P.shardL : P.manaL, 3.5 * sc);
    if (this.bossRef && !this.bossRef.dead) dot(this.bossRef.x, this.bossRef.y, P.redL, 5 * sc);
    dot(this.player.x, this.player.y, '#ffffff', 4 * sc);
  },
  // #4: minimap sits at the top-LEFT, below the HP / XP / dash UI, slightly enlarged.
  drawMinimap() {
    if (!this.minimap) return;
    const S = uiScale(); const m = this.map;
    const mw = 144 * S, mh = mw * m.th / m.tw;
    const mx = 12 * S, my = 72 * S;   // below the (taller) vitals panel — was 66, which overlapped it
    uiRect(mx - 4, my - 4, mw + 8, mh + 8, withAlpha('#0b0d1a', 0.72), { radius: 6 * S, stroke: P.shardL, lw: 2 });
    uiClipRound(mx - 4, my - 4, mw + 8, mh + 8, 6 * S, () => uiRect(mx - 4, my - 4, mw + 8, 3 * S, withAlpha(P.shardL, 0.5)));   // #7
    drawSpriteUI(this.minimap, mx, my, mw / m.tw);
    const pxW = m.tw * TS, pxH = m.th * TS;
    const dot = (wx, wy, col, sz) => { const dx = mx + (wx / pxW) * mw, dy = my + (wy / pxH) * mh; uiRect(dx - sz / 2, dy - sz / 2, sz, sz, col, { radius: sz / 2 }); };
    this.plotMinimap(dot, S);
  },
  // #2: persistent tracked-quest panel on the left, below the minimap
  drawQuestTracker() {
    if (this.dead || this.choice || this.equipChoice || this.eventChoice || this.shopOpen || this.paused) return;
    const S = uiScale(); const list = trackedQuestStates(META); if (!list.length) return;   // 5.2: one row per tracked quest
    const x = 12 * S, w = 158 * S, h = 46 * S, gap = 6 * S; let y = 196 * S;
    for (const q of list) {
      uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.6), { radius: 5 * S, stroke: withAlpha(P.goldL, q.done ? 0.85 : 0.6), lw: 1.5 });
      uiText('任務 · ' + q.title, x + 8 * S, y + 15 * S, { size: 10.5 * S, color: q.done ? P.greenL : P.goldL, weight: '800' });
      if (q.sub) uiText(q.sub, x + 8 * S, y + 28 * S, { size: 9 * S, color: P.gray3 });
      uiBar(x + 8 * S, y + 34 * S, w - 16 * S, 5 * S, q.frac || 0, { fg: q.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
      if (q.goal) uiText(fmtQuestVal(q.prog, q.fmt) + '/' + fmtQuestVal(q.goal, q.fmt), x + w - 8 * S, y + 31 * S, { size: 9 * S, align: 'right', color: P.gray3 });
      y += h + gap;
    }
  },

  // 6.2: tick + show the first-battle combat hints (fade in 0.5s · hold 3s · fade out 0.5s).
  tickBattleHints(dt) {
    if (META.tutorialBattleDone || this.coop) return;
    if (this._bhIdx < BATTLE_HINTS.length && this.run.time >= BATTLE_HINTS[this._bhIdx].t) { const bh = BATTLE_HINTS[this._bhIdx]; this._bhActive = { text: typeof bh.text === 'function' ? bh.text() : bh.text, t: 0 }; this._bhIdx++; }
    if (this._bhActive) { this._bhActive.t += dt; if (this._bhActive.t > 4) { this._bhActive = null; if (this._bhIdx >= BATTLE_HINTS.length) { META.tutorialBattleDone = true; saveMeta(); } } }
  },
  drawBattleHint() {
    const e = this._bhActive;
    if (!e || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.hudTut || this.shopOpen) return;
    const S = uiScale();
    const a = e.t < 0.5 ? e.t / 0.5 : (e.t > 3.5 ? Math.max(0, (4 - e.t) / 0.5) : 1);
    const w = Math.min(view.W * 0.7, 520 * S), h = 38 * S, x = (view.W - w) / 2, y = view.H - 124 * S;
    uiRect(x, y, w, h, withAlpha('#0d1430', 0.86 * a), { radius: 8 * S, stroke: withAlpha(P.shardL, 0.7 * a), lw: 1.5 });
    uiText('💡 ' + e.text, x + w / 2, y + h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: withAlpha('#fff', a), weight: '700' });
  },
  // 6.3A: first-run HUD walkthrough — paused overlay with callouts pointing at the live HUD regions.
  updateHudTut() {
    if (pressed('interact') || pressed('enter') || pressed('space') || pressed('escape') || pressed('pause') || mouse.justDown) {
      this.hudTut = false; META.tutorialHUDDone = true; saveMeta(); Sfx.play('uiClick'); Tele.ev('tutorial_step', { step: 'hud_done' });   // P1-3
    }
  },
  drawHudTut() {
    const S = uiScale(); const W = view.W, H = view.H, pad = 12 * S;
    uiRect(0, 0, W, H, withAlpha('#070912', 0.78));
    uiText('新 手 指 南 · 介 面 一 覽', W / 2, 56 * S, { size: 24 * S, align: 'center', color: P.shardL, weight: '900' });
    uiText('熟悉一下畫面上的資訊（每個帳號只出現一次）', W / 2, 80 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '600' });
    const ctx = ctxRaw();
    const callout = (tx, ty, bx, by, label) => {
      const tw = textWidth(label, 12 * S, '700') + 18 * S, bh = 26 * S;
      const rx = bx - tw / 2, ry = by - bh / 2;
      ctx.save(); ctx.strokeStyle = withAlpha('#fff', 0.7); ctx.lineWidth = 1.5 * S;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = withAlpha(P.shardL, 0.9); ctx.beginPath(); ctx.arc(tx, ty, 3.5 * S, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      uiRect(rx, ry, tw, bh, withAlpha('#10142c', 0.97), { radius: 6 * S, stroke: P.shardL, lw: 1.5 });
      uiText(label, bx, by + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700' });
    };
    // anchors mirror hud.js layout (vitals top-left, counters top-right, weapons bottom-left, quest tracker left)
    callout(pad + 90 * S, pad + 18 * S, pad + 250 * S, pad + 24 * S, '生命 · 經驗 · 衝刺');
    callout(W - pad - 56 * S, pad + 30 * S, W - pad - 150 * S, pad + 96 * S, '金幣 · 魂晶 · 擊殺');
    callout(pad + 40 * S, H - pad - 16 * S, pad + 150 * S, H - pad - 70 * S, '武器（自動開火 / 升級進化）');
    callout(pad + 70 * S, 210 * S, pad + 230 * S, 210 * S, '任務追蹤 · 羈絆');
    uiText('按任意鍵（或點擊）開始狩獵', W / 2, H - 40 * S, { size: 15 * S, align: 'center', color: withAlpha(P.goldL, 0.7 + 0.3 * Math.sin(this.t * 5)), weight: '800' });
  },

  // 8.2: live 羈絆 panel on the left, BELOW the quest tracker — shows the bonds
  // currently active this run (icon badge + name + reached tier).
  // 4.20: hold V to see the current pickup radius (world-space ring + label).
  drawPickupRange() {
    if (!pressed('range') || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.shopOpen || this.bigMap || this.showBuild) return;
    const r = this.player.stats.pickupRange || 26, pz = Math.sin(this.t * 5) * 0.5 + 0.5;
    fillCircleWorld(this.player.x, this.player.y, r, withAlpha(P.shardL, 0.06));
    strokeCircleWorld(this.player.x, this.player.y, r, withAlpha(P.shardL, 0.5 + 0.3 * pz), 2);
    const ns = worldToScreen(this.player.x, this.player.y - r - 8);
    uiText('拾取範圍 ' + Math.round(r), ns.x, ns.y, { size: 11 * uiScale(), align: 'center', color: P.shardL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  // 4.2 + R16 #6: persistent recent-pickup log (bottom-right) shown as ICON chips (latest at the
  // bottom, brightest). Hover a chip → tooltip with its effect; a chip whose timed buff is still
  // active shows the remaining seconds + a draining progress bar. Hit-rects go to hudIcons so the
  // generic hover loop (drawInfo) picks them up.
  drawPickupLog() {
    const log = this.run.pickupLog;
    if (!log || !log.length || this.dead || this.choice || this.equipChoice || this.shopOpen || this.bigMap || this.showBuild || this.paused) return;
    const S = uiScale(), shown = log.slice(-6);
    const sz = 26 * S, gap = 5 * S, x = view.W - 12 * S - sz, y0 = view.H - 70 * S;
    uiText('近期拾取', x + sz, y0 - shown.length * (sz + gap) - 4 * S, { size: 9 * S, align: 'right', color: P.gray3, weight: '700', shadowColor: withAlpha('#000', 0.8) });
    shown.forEach((e, i) => {
      const idx = shown.length - 1 - i;                 // 0 = latest (sits at the bottom)
      const y = y0 - idx * (sz + gap);
      const a = 0.5 + 0.5 * ((i + 1) / shown.length);
      const active = !!(e.buff && this.player.timedBuffs.includes(e.buff) && e.buff.t > 0);
      const accent = active ? (e.buff.color || P.shardL) : (e.color || P.shardL);
      uiRect(x, y, sz, sz, withAlpha('#10121f', active ? 0.94 : 0.55 + 0.3 * a), { radius: 5 * S, stroke: withAlpha(accent, active ? 1 : 0.55 * a + 0.2), lw: active ? 2 : 1.5 });
      if (e.icon) { const sp = getSprite(iconOr(e.icon, 'shard')); drawSpriteUI(sp.frames[0], x + 3 * S, y + 3 * S, (sz - 6 * S) / sp.w, { alpha: active ? 1 : a }); }
      else uiText(e.emoji || '·', x + sz / 2, y + sz / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: withAlpha(accent, a) });
      if (active) {                                     // remaining-seconds badge + draining bar
        const frac = Math.max(0, Math.min(1, e.buff.t / (e.buff.dur || e.buff.t)));
        uiRect(x + 2 * S, y + sz - 4 * S, (sz - 4 * S) * frac, 2.5 * S, withAlpha(accent, 0.9), { radius: 1.2 * S });
        uiText(Math.ceil(e.buff.t) + 's', x + sz - 2 * S, y + 10 * S, { size: 9 * S, align: 'right', baseline: 'middle', color: accent, weight: '900', shadowColor: withAlpha('#000', 0.85) });
      }
      hudIcons.push({ x, y, w: sz, h: sz, kind: 'pickup', entry: e, active, rem: active ? Math.ceil(e.buff.t) : 0 });
    });
  },
  // R16 #6: hover tooltip for a recent-pickup chip — name + effect text (+ remaining seconds).
  drawPickupTooltip(ic, mx, my, S) {
    const e = ic.entry; const W = 198 * S;
    const lines = []; let line = '';
    for (const ch of (e.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (28 + lines.length * 13 + (ic.active ? 14 : 0)) * S;
    let x = mx + 14 * S, y = my - H - 8 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y < 6 * S) y = my + 16 * S;
    const accent = (ic.active && e.buff) ? (e.buff.color || P.shardL) : (e.color || P.shardL);
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: accent, lw: 2 });
    uiText((e.emoji ? e.emoji + ' ' : '') + (e.name || e.text || '拾取'), x + 8 * S, y + 17 * S, { size: 12 * S, color: '#fff', weight: '800' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 31 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
    if (ic.active) uiText('剩餘 ' + ic.rem + ' 秒', x + 8 * S, y + 31 * S + lines.length * 13 * S, { size: 10.5 * S, color: accent, weight: '800' });
  },
  // 4.22: held vault keys (dropped by 守護怪, spent on locked vault chests).
  drawKeyHud() {
    const keys = (this.world && this.world.keys) | 0;
    if (keys <= 0 || this.dead) return;
    const S = uiScale();
    uiText('🔑 × ' + keys, view.W - 12 * S, 96 * S, { size: 13 * S, align: 'right', color: P.goldL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
  },
  // 4.14: persistent patron-buff strip (top-centre, under the stage line). Hover a patron icon → its effect.
  drawPatronHud() {
    const list = this.run.patrons;
    if (!list || !list.length || this.dead || this.choice || this.equipChoice || this.eventChoice || this.paused || this.hudTut) return;
    const S = uiScale(), sz = 22 * S, gap = 5 * S, total = list.length * (sz + gap) - gap;
    let x = view.W / 2 - total / 2; const y = 80 * S;
    for (const pt of list) {
      const sp = getSprite(iconOr(pt.icon, 'patron_gambler'));
      uiRect(x, y, sz, sz, withAlpha('#10121f', 0.72), { radius: 5 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1.5 });
      drawSpriteUI(sp.frames[0], x + 2 * S, y + 2 * S, (sz - 4 * S) / sp.w);
      hudIcons.push({ x, y, w: sz, h: sz, kind: 'patron', patron: pt });
      x += sz + gap;
    }
  },
  drawPatronTooltip(ic, mx, my, S) {
    const p = ic.patron; const W = 204 * S; const lines = []; let line = '';
    for (const ch of (p.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (44 + lines.length * 13) * S;
    let x = mx + 14 * S, y = my + 8 * S; if (x + W > view.W) x = view.W - W - 6 * S; if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: P.goldL, lw: 2 });
    uiText('✦ ' + p.name, x + 8 * S, y + 17 * S, { size: 12 * S, color: P.goldL, weight: '800' });
    uiText((p.role ? p.role + ' · ' : '') + '「' + (p.title || '') + '」', x + 8 * S, y + 32 * S, { size: 10 * S, color: P.shardL, weight: '700' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 46 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
  },
  // TFT 式羈絆側欄：六角徽章（依階級銅/銀/金配色）＋名稱＋階數；已達成＋快達成。
  drawBondTracker() {
    if (this.dead || this.choice || this.equipChoice || this.eventChoice || this.shopOpen || this.paused || this.bigMap) return;
    const S = uiScale();
    const list = [];
    for (const b of BONDS) {
      const pg = bondProgress(b, this.run, this.player);
      if (pg.level >= 1) list.push({ b, pg, near: false });
      else if (pg.count >= 1 && pg.nextTier && pg.nextTier.at - pg.count <= 1) list.push({ b, pg, near: true });
    }
    if (!list.length) return;
    list.sort((a, x2) => x2.pg.level - a.pg.level);   // achieved first, higher tier first
    const achievedN = list.filter((o) => !o.near).length;
    const x = 12 * S, w = 170 * S;
    const tq = trackedQuestStates(META).length;   // 5.2: sit below however many quest rows are tracked (each row h=46, inter-row gap=6)
    // last row bottom = 196 + (tq-1)*52 + 46; bond box sits +4 below it (the SAME 4px margin the
    // original single-quest layout used: tq=1 → 246, matching pre-5.2). NOT 196+tq*52 (that'd be a 6px gap).
    const y = (tq ? 196 + tq * 46 + (tq - 1) * 6 + 4 : 196) * S;
    const rows = list.slice(0, 7), extra = list.length - rows.length;
    const headH = 22 * S, rowH = 22 * S;
    const h = headH + rows.length * rowH + (extra > 0 ? 12 * S : 0) + 6 * S;
    uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.62), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.45), lw: 1.5 });
    uiText('羈絆 · ' + achievedN, x + 10 * S, y + 15 * S, { size: 10 * S, color: P.goldL, weight: '800' });
    // tier → TFT 銅/銀/金 配色
    const tierStyle = (lvl) => lvl <= 0 ? { fill: '#262c40', stroke: '#566089', txt: '#aeb6d8' }
      : lvl === 1 ? { fill: '#6e4322', stroke: '#c8843e', txt: '#ffe6c8' }
        : lvl === 2 ? { fill: '#515b6b', stroke: '#cdd8e6', txt: '#ffffff' }
          : { fill: '#7a5c16', stroke: '#f2c14e', txt: '#fff3c8' };
    const ctx = ctxRaw(), hr = 9 * S;
    rows.forEach((o, i) => {
      const cy = y + headH + i * rowH + rowH / 2 - 2 * S, hx = x + 11 * S + hr;
      const st = tierStyle(o.near ? 0 : o.pg.level);
      ctx.save();
      ctx.beginPath();
      for (let k = 0; k < 6; k++) { const a = Math.PI / 180 * (60 * k - 90), px = hx + hr * Math.cos(a), py = cy + hr * Math.sin(a); k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath();
      ctx.fillStyle = st.fill; ctx.fill();
      ctx.lineWidth = 1.6 * S; ctx.strokeStyle = st.stroke; ctx.stroke();
      ctx.restore();
      uiText(o.b.tag, hx, cy + 0.5 * S, { size: 9 * S, align: 'center', baseline: 'middle', color: st.txt, weight: '900', shadow: false });
      const nameX = hx + hr + 7 * S;
      let nm = o.b.name;
      while (nm.length > 1 && textWidth(nm, 10 * S, '800') > w - (nameX - x) - 42 * S) nm = nm.slice(0, -1);
      uiText(nm, nameX, cy + 0.5 * S, { size: 10 * S, baseline: 'middle', color: o.near ? '#aeb6d8' : '#f0e4c0', weight: '800' });
      // near = how many requirement pieces collected (e.g. 1/2); achieved = current tier / max tier
      uiText(o.near ? (o.pg.count + '/' + o.pg.tiers[0].at) : (o.pg.level + '/' + o.pg.max), x + w - 10 * S, cy + 0.5 * S, { size: 9.5 * S, align: 'right', baseline: 'middle', color: o.near ? P.shardL : st.stroke, weight: '900' });
      hudIcons.push({ x, y: cy - rowH / 2 + 2 * S, w, h: rowH, kind: 'bond', bond: o.b, prog: o.pg });   // hover → effect tooltip (drawBondTooltip)
    });
    if (extra > 0) uiText('＋' + extra + ' 個…', x + w - 10 * S, y + h - 6 * S, { size: 8 * S, align: 'right', color: P.gray3, weight: '600' });
  },

  // M: a big semi-transparent minimap floating in the centre of the screen
  drawBigMinimap() {
    if (!this.bigMap || !this.minimap || this.showBuild || this.choice || this.shopOpen || this.dead) return;
    const S = uiScale(); const m = this.map;
    const mw = Math.min(view.W * 0.6, view.H * 0.6 * m.tw / m.th), mh = mw * m.th / m.tw;
    const mx = (view.W - mw) / 2, my = (view.H - mh) / 2;
    uiRect(mx - 4, my - 4, mw + 8, mh + 8, withAlpha('#0b0d1a', 0.42), { radius: 6 * S, stroke: P.shardL, lw: 2 });
    drawSpriteUI(this.minimap, mx, my, mw / m.tw, { alpha: 0.5 });
    const pxW = m.tw * TS, pxH = m.th * TS;
    const dot = (wx, wy, col, sz) => { const dx = mx + (wx / pxW) * mw, dy = my + (wy / pxH) * mh; uiRect(dx - sz / 2, dy - sz / 2, sz, sz, col, { radius: sz / 2 }); };
    this.plotMinimap(dot, S * 1.6);   // same markers as the small map, larger
    // 4.13: player marker = character avatar (頭貼) — pulsing gold ring so it stands out
    const psp = getSprite(this.run.characterSprite || 'player');
    const pdx = mx + (this.player.x / pxW) * mw, pdy = my + (this.player.y / pxH) * mh;
    const asz = 24 * S, asc = (asz - 4 * S) / psp.w, pz = Math.sin(this.t * 5) * 0.5 + 0.5;
    uiRect(pdx - asz / 2, pdy - asz / 2, asz, asz, withAlpha('#10121f', 0.9), { radius: asz / 2, stroke: withAlpha(P.goldL, 0.6 + 0.4 * pz), lw: 2 });
    drawSpriteUI(psp.frames[0], pdx - psp.w * asc / 2, pdy - psp.h * asc / 2, asc);
    uiText('放大地圖　·　M 關閉', view.W / 2, my - 12 * S, { size: 12 * S, align: 'center', color: withAlpha(P.shardL, 0.85), weight: '700' });
  },

  aimCamera() {
    const halfW = view.W / 2 / camera.zoom, halfH = view.H / 2 / camera.zoom;
    const pxW = this.map.tw * TS, pxH = this.map.th * TS;
    camera.targetX = pxW > halfW * 2 ? clamp(this.player.x, halfW, pxW - halfW) : pxW / 2;
    camera.targetY = pxH > halfH * 2 ? clamp(this.player.y, halfH, pxH - halfH) : pxH / 2;
  },
};
