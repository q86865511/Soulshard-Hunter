// In-run heads-up display (screen space).
import { uiText, uiBar, uiRect, uiScale, view, drawSpriteUI, textWidth } from '../engine/renderer.js';
import { getSprite, iconOr } from '../engine/sprites.js';
import { P, withAlpha } from '../engine/palette.js';
import { Abilities } from './content/registry.js';

// hit-test rects for the on-screen weapon/ability/item icons, refreshed each
// frame by drawHud — the run scene reads these to show hover tooltips.
export const hudIcons = [];

function iconCounter(sprite, value, x, y, S, color) {
  const sp = getSprite(sprite);
  const sc = 1.6 * S;
  drawSpriteUI(sp.frames[0], x, y - sp.h * sc + 2 * S, sc);
  uiText(String(value), x + sp.w * sc + 4 * S, y - 3 * S, { size: 15 * S, color, weight: '800', baseline: 'alphabetic' });
}

export function drawHud(run, player) {
  const S = uiScale();
  hudIcons.length = 0;
  const W = view.W;
  const pad = 12 * S;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const barW = Math.min(232 * S, W * 0.36);
  const barH = 16 * S;

  // HP bar (with a glossy top highlight over the filled portion)
  const hpFrac = clamp01(player.hp / player.maxHp);
  const hpCol = hpFrac > 0.5 ? P.red : hpFrac > 0.25 ? P.ember : P.redL;
  uiBar(pad, pad, barW, barH, hpFrac, { fg: hpCol, bg: '#2a0e14', border: P.ink, glow: true });
  if (hpFrac > 0.02) uiRect(pad + 2 * S, pad + 2 * S, (barW - 4 * S) * hpFrac, 3 * S, withAlpha('#ffffff', 0.22), { radius: 2 * S });
  uiText(`${Math.ceil(player.hp)} / ${player.maxHp}`, pad + barW / 2, pad + barH / 2 + 1 * S,
    { size: 11 * S, align: 'center', baseline: 'middle', weight: '800', color: '#fff' });

  // level badge (character level is uncapped per design — shown plainly)
  const lvX = pad + barW + 8 * S;
  uiRect(lvX, pad, 48 * S, barH, withAlpha('#1a2348', 0.95), { radius: 5 * S, stroke: P.manaL, lw: 1.5 });
  uiText('Lv ' + run.level, lvX + 24 * S, pad + barH / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: P.manaL, weight: '900' });

  // XP bar
  uiBar(pad, pad + barH + 3 * S, barW, 6 * S, clamp01(run.xp / run.xpNext), { fg: P.manaL, bg: '#16183a', border: P.ink });

  // dash cooldown
  const dashReady = (player.dashCd ?? 0) <= 0;
  uiText('衝刺', pad, pad + barH + 24 * S, { size: 10 * S, color: dashReady ? P.shardL : '#8a91b4', weight: '700' });
  uiBar(pad + 30 * S, pad + barH + 16 * S, 48 * S, 6 * S,
    dashReady ? 1 : 1 - player.dashCd / (player.stats.dashCd || 0.85),
    { fg: dashReady ? P.shardL : P.gray2, bg: '#16183a', border: P.ink });

  // player status chips (D6 feedback)
  if (player.status) {
    const order = ['stun', 'knockup', 'slow', 'burn', 'poison', 'bleed'];
    const SC = { stun: ['暈', '#ffe066'], knockup: ['飛', '#ffe066'], slow: ['緩', P.ice], burn: ['燃', P.emberL], poison: ['毒', P.toxic], bleed: ['血', P.redL] };
    let sx = pad + 88 * S; const sy = pad + barH + 14 * S;
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
  uiText('擊殺 ' + (run.kills || 0), rx, pad + 64 * S, { size: 12 * S, align: 'right', color: P.gray3 });

  // weapons row (bottom-left, primary) — shows level / ★ when evolved
  if (player.weapons && player.weapons.length) {
    const wsz = 32 * S, ax = pad, ay = view.H - pad - wsz;
    player.weapons.forEach((inst, i) => {
      const bx = ax + i * (wsz + 4 * S);
      uiRect(bx, ay, wsz, wsz, withAlpha('#10121f', 0.74), { radius: 4 * S, stroke: inst.def.evolved ? P.goldL : P.ink2, lw: 2 });
      const sp = getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt'));
      drawSpriteUI(sp.frames[0], bx + 3 * S, ay + 3 * S, (wsz - 6 * S) / sp.w);
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
