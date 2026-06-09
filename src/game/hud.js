// In-run heads-up display (screen space).
import { uiText, uiBar, uiRect, uiScale, view, drawSpriteUI, textWidth, PIXEL_FONT, ctxRaw } from '../engine/renderer.js';
import { getSprite, iconOr } from '../engine/sprites.js';
import { P, withAlpha } from '../engine/palette.js';
import { Abilities } from './content/registry.js';
import { weaponMaxLevel } from './balance.js';
import { AchievementToasts } from './toasts.js';

// round16/4.9-B — global achievement-unlock banners (top-right, gold), drawn by both
// the hub and the run scene. Fades in 0.3s → holds → fades out 0.5s; max 3 stacked.
export function drawAchievementToasts(S = uiScale()) {
  const list = AchievementToasts.list();
  if (!list.length) return;
  const now = AchievementToasts.now();
  const w = 214 * S, h = 36 * S, x = view.W - w - 12 * S;
  list.forEach((t, i) => {
    const age = now - t.born, rem = t.until - now;
    const a = age < 0.3 ? age / 0.3 : (rem < 0.5 ? Math.max(0, rem / 0.5) : 1);
    const y = 70 * S + i * (h + 8 * S);
    uiRect(x, y, w, h, withAlpha('#2a1f00', 0.92 * a), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.9 * a), lw: 2 });
    uiText('🏆 成就解鎖', x + 10 * S, y + 13 * S, { size: 9 * S, color: withAlpha(P.goldL, a), weight: '800' });
    uiText(t.name, x + 10 * S, y + 27 * S, { size: 11 * S, color: withAlpha('#ffffff', a), weight: '700' });
  });
}

// hit-test rects for the on-screen weapon/ability/item icons, refreshed each
// frame by drawHud — the run scene reads these to show hover tooltips.
export const hudIcons = [];

function iconCounter(sprite, value, x, y, S, color) {
  const sp = getSprite(sprite);
  const sc = 1.6 * S;
  drawSpriteUI(sp.frames[0], x, y - sp.h * sc + 2 * S, sc);
  uiText(String(value), x + sp.w * sc + 4 * S, y - 3 * S, { size: 12 * S, color, weight: '800', baseline: 'alphabetic', font: PIXEL_FONT });   // 1.8 pixel digits
}

// round16/UI-fix #2 — bare twin-chevron "dash" glyph drawn directly (no panel box), so the
// dash row's icon matches the bare heart/xp sprites above it instead of the heavy boxed
// ability_dash icon (which read as misaligned). Centred on (cx,cy) like the other two icons.
function drawDashGlyph(cx, cy, h, col, S) {
  const c = ctxRaw();
  c.save();
  c.strokeStyle = col; c.lineWidth = Math.max(1.6, 2 * S); c.lineCap = 'round'; c.lineJoin = 'round';
  const a = h * 0.46, w = a * 0.52, step = h * 0.5;   // chevron half-height, half-width, centre-spacing
  for (let k = 0; k < 2; k++) {
    const x = cx - step / 2 + k * step;               // two chevrons centred symmetrically on cx
    c.beginPath();
    c.moveTo(x - w, cy - a); c.lineTo(x + w, cy); c.lineTo(x - w, cy + a);
    c.stroke();
  }
  c.restore();
}

export function drawHud(run, player) {
  const S = uiScale();
  hudIcons.length = 0;
  const W = view.W;
  const pad = 12 * S;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const pulse = Math.sin((player.t || 0) * 6) * 0.5 + 0.5;

  // ---- vitals panel (top-left): 生命 / 經驗 / 衝刺 in ONE frame, consistent icon
  // sizes + bar lengths (round16/4.1). The three left icons share `iconSz`; the
  // three bars share `vbarW`; everything sits inside one rounded panel.
  const iconSz = 14 * S;
  const ix = pad + 5 * S;                            // icon column (all three same size + x)
  const bx = ix + iconSz + 7 * S;                    // bar column (all three start here)
  const vbarW = Math.min(200 * S, W * 0.30);         // all three bars share this max length
  const hpBarH = 15 * S, subH = 8 * S, rgap = 5 * S;
  const r1y = pad + 5 * S, r2y = r1y + hpBarH + rgap, r3y = r2y + subH + rgap;
  const panelX = pad - 5 * S, panelY = pad - 5 * S;
  const panelW = (bx + vbarW + 9 * S) - panelX, panelH = (r3y + subH + 6 * S) - panelY;
  uiRect(panelX, panelY, panelW, panelH, withAlpha('#0b0d1a', 0.55), { radius: 9 * S, stroke: withAlpha(P.shardL, 0.32), lw: 1.5 });
  // fit each icon in an iconSz×iconSz cell and CENTER it (h+v) so the boxed dash icon
  // lines up with the bare heart/xp sprites (was left-aligned → looked misaligned).
  const vIcon = (name, cy) => { const sp = getSprite(name); const sc = iconSz / Math.max(sp.w, sp.h); drawSpriteUI(sp.frames[0], ix + (iconSz - sp.w * sc) / 2, cy - (sp.h * sc) / 2, sc); };

  // 生命 (HP)
  const hpFrac = clamp01(player.hp / player.maxHp);
  const hpCol = hpFrac > 0.5 ? P.red : hpFrac > 0.25 ? P.ember : P.redL;
  vIcon('heart', r1y + hpBarH / 2);
  uiBar(bx, r1y, vbarW, hpBarH, hpFrac, { fg: hpCol, bg: '#2a0e14', border: P.ink, glow: true });
  if (hpFrac > 0.02) uiRect(bx + 2 * S, r1y + 2 * S, (vbarW - 4 * S) * hpFrac, 3 * S, withAlpha('#ffffff', 0.26), { radius: 2 * S });
  const segs = Math.min(14, Math.floor((player.maxHp || 100) / 50));
  for (let i = 1; i <= segs; i++) { const sx = bx + vbarW * (i * 50 / player.maxHp); if (sx < bx + vbarW - 2 * S) uiRect(sx, r1y + 3 * S, Math.max(1, S), hpBarH - 6 * S, withAlpha('#000', 0.32)); }
  uiText(`${Math.ceil(player.hp)} / ${player.maxHp}`, bx + vbarW / 2, r1y + hpBarH / 2 + 1 * S,
    { size: 9 * S, align: 'center', baseline: 'middle', weight: '800', color: '#fff', shadowColor: withAlpha('#000', 0.75), font: PIXEL_FONT });   // 1.8

  // 經驗 (XP) + 等級（整合進經驗條右端）
  vIcon('xp', r2y + subH / 2);
  uiBar(bx, r2y, vbarW, subH, clamp01(run.xp / run.xpNext), { fg: P.manaL, bg: '#16183a', border: P.ink, glow: true });
  uiText('Lv ' + run.level, bx + vbarW - 5 * S, r2y + subH / 2 + 0.5 * S, { size: 7 * S, align: 'right', baseline: 'middle', color: '#fff', weight: '900', shadowColor: withAlpha('#000', 0.8), font: PIXEL_FONT });   // 1.8

  // 衝刺 (dash) — bare cyan chevron glyph (matches the heart/xp bare icons above), no text label
  const dashReady = (player.dashCd ?? 0) <= 0;
  const dFrac = dashReady ? 1 : 1 - player.dashCd / (player.stats.dashCd || 0.85);
  drawDashGlyph(ix + iconSz / 2, r3y + subH / 2, iconSz * 0.78, dashReady ? P.shardL : withAlpha(P.shardL, 0.4), S);
  uiBar(bx, r3y, vbarW, subH, dFrac, { fg: dashReady ? P.shardL : P.gray2, bg: '#16183a', border: P.ink });
  if (dashReady) uiRect(bx, r3y, vbarW, subH, withAlpha(P.shardL, 0.1 + 0.12 * pulse), { radius: 3 * S });   // 就緒時量條微微脈動（取代「衝刺就緒」文字）

  // player status chips (D6) — to the RIGHT of the vitals panel (below it would clash with the minimap)
  if (player.status) {
    const order = ['stun', 'knockup', 'slow', 'burn', 'poison', 'bleed'];
    const SC = { stun: ['暈', '#ffe066'], knockup: ['飛', '#ffe066'], slow: ['緩', P.ice], burn: ['燃', P.emberL], poison: ['毒', P.toxic], bleed: ['血', P.redL] };
    let sx = panelX + panelW + 6 * S; const sy = panelY + 6 * S;
    for (const k of order) {
      if (!player.status[k]) continue;
      const [lab, col] = SC[k];
      uiRect(sx, sy, 18 * S, 14 * S, withAlpha(col, 0.22), { radius: 4 * S, stroke: col, lw: 1 });
      uiText(lab, sx + 9 * S, sy + 8 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: col, weight: '800' });
      sx += 21 * S;
    }
  }

  // (stage / biome / timer are drawn by the run scene's drawStageHud)
  // top-right counters
  const rx = W - pad;
  iconCounter('coin', run.gold, rx - 70 * S, pad + 20 * S, S, P.goldL);
  iconCounter('shard', run.shards, rx - 70 * S, pad + 44 * S, S, P.shardL);
  iconCounter('skull_kill', run.kills || 0, rx - 70 * S, pad + 68 * S, S, P.redL);   // #5: 擊殺改用骷髏圖示，與金幣/魂晶同欄對齊

  // weapons row (bottom-left, primary) — shows level / ★ when evolved
  if (player.weapons && player.weapons.length) {
    const wsz = 32 * S, ax = pad, ay = view.H - pad - wsz;
    player.weapons.forEach((inst, i) => {
      const bx = ax + i * (wsz + 4 * S);
      // 4.6: subtle "ready to evolve" hint — maxed base weapon whose evolveReq passive is owned
      const ready = !inst.def.evolved && inst.def.evolveInto && inst.level >= weaponMaxLevel(inst.def) && (!inst.def.evolveReq || (run.abilityLevels && run.abilityLevels[inst.def.evolveReq] > 0));
      uiRect(bx, ay, wsz, wsz, withAlpha('#10121f', 0.74), { radius: 4 * S, stroke: inst.def.evolved || ready ? P.goldL : P.ink2, lw: 2 });
      const sp = getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt'));
      drawSpriteUI(sp.frames[0], bx + 3 * S, ay + 3 * S, (wsz - 6 * S) / sp.w);
      if (ready) { const pz = Math.sin((player.t || 0) * 6) * 0.5 + 0.5; uiRect(bx, ay, wsz, wsz, withAlpha(P.goldL, 0.1 + 0.16 * pz), { radius: 4 * S }); uiText('↑', bx + wsz / 2, ay + 9 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '900', shadow: false }); }
      uiText(inst.def.evolved ? '★' : 'L' + inst.level, bx + wsz - 3 * S, ay + wsz - 3 * S, { size: 10 * S, align: 'right', color: inst.def.evolved ? P.goldL : P.shardL, weight: '800' });
      hudIcons.push({ x: bx, y: ay, w: wsz, h: wsz, kind: 'weapon', def: inst.def, level: inst.level });
    });
  }
  // passive abilities (small icons, row above weapons)
  if (run.abilities && run.abilities.length) {
    const psz = 21 * S, ax = pad, ay = view.H - pad - 32 * S - 7 * S - psz;
    run.abilities.slice(0, 14).forEach((id, i) => {
      const bx = ax + i * (psz + 3 * S);
      const sp = getSprite(iconOr('ability_' + id, 'ability_power'));
      drawSpriteUI(sp.frames[0], bx, ay, psz / sp.w);
      const stk = run.abilityLevels?.[id] || 1;
      if (stk > 1) uiText(String(stk), bx + psz - 1 * S, ay + psz, { size: 9 * S, align: 'right', color: P.goldL, weight: '800' });
      hudIcons.push({ x: bx, y: ay, w: psz, h: psz, kind: 'ability', id, def: Abilities.get(id), level: stk });
    });
  }

  // (B2: the old 4 stored-item slots are gone — ground items auto-use on pickup)
}

// red flash + vignette when low on HP
export function drawLowHpWarning(player, time) {
  const frac = player.hp / player.maxHp;
  if (frac > 0.3 || player.dead) return;
  const pulse = (Math.sin(time * 6) * 0.5 + 0.5) * (1 - frac / 0.3);
  const g = `rgba(180,20,30,${0.18 * pulse})`;
  uiRect(0, 0, view.W, view.H, g);
}
