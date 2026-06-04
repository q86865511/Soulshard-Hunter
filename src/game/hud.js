// In-run heads-up display (screen space).
import { uiText, uiBar, uiRect, uiScale, view, drawSpriteUI, textWidth } from '../engine/renderer.js';
import { getSprite, iconOr } from '../engine/sprites.js';
import { P, withAlpha } from '../engine/palette.js';
import { Items, Abilities } from './content/registry.js';

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
  const barW = Math.min(220 * S, W * 0.34);
  const barH = 15 * S;

  // HP bar
  const hpFrac = player.hp / player.maxHp;
  const hpCol = hpFrac > 0.5 ? P.red : hpFrac > 0.25 ? P.ember : P.redL;
  uiBar(pad, pad, barW, barH, hpFrac, { fg: hpCol, bg: '#2a0e14', border: P.ink, glow: true });
  uiText(`${Math.ceil(player.hp)} / ${player.maxHp}`, pad + barW / 2, pad + barH / 2 + 1 * S,
    { size: 11 * S, align: 'center', baseline: 'middle', weight: '800' });

  // XP bar + level
  uiBar(pad, pad + barH + 3 * S, barW, 6 * S, run.xp / run.xpNext, { fg: P.manaL, bg: '#16183a', border: P.ink });
  uiText('Lv.' + run.level, pad + barW + 9 * S, pad + barH - 1 * S, { size: 14 * S, color: P.manaL, weight: '800' });

  // dash cooldown pip
  const dashReady = (player.dashCd ?? 0) <= 0;
  uiText('衝刺', pad, pad + barH + 22 * S, { size: 10 * S, color: '#8a91b4' });
  uiBar(pad + 28 * S, pad + barH + 15 * S, 46 * S, 5 * S,
    dashReady ? 1 : 1 - player.dashCd / (player.stats.dashCd || 0.85),
    { fg: dashReady ? P.shardL : P.gray2, bg: '#16183a', border: P.ink });

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

  // inventory slots (bottom-center, used with 1-4)
  const slots = 4;
  const sw = 34 * S;
  const totalW = slots * sw + (slots - 1) * 5 * S;
  const bx0 = view.W / 2 - totalW / 2;
  const by = view.H - pad - sw;
  for (let i = 0; i < slots; i++) {
    const x = bx0 + i * (sw + 5 * S);
    uiRect(x, by, sw, sw, withAlpha('#10121f', 0.66), { radius: 4 * S, stroke: P.ink2, lw: 2 });
    uiText(String(i + 1), x + 4 * S, by + 12 * S, { size: 10 * S, color: withAlpha('#fff', 0.5), weight: '800' });
    const id = run.inventory && run.inventory[i];
    if (id) { const def = Items.get(id); if (def) { const sp = getSprite(def.icon); drawSpriteUI(sp.frames[0], x + 6 * S, by + 8 * S, (22 * S) / sp.w); hudIcons.push({ x, y: by, w: sw, h: sw, kind: 'item', def, slot: i + 1 }); } }
  }
}

// red flash + vignette when low on HP
export function drawLowHpWarning(player, time) {
  const frac = player.hp / player.maxHp;
  if (frac > 0.3 || player.dead) return;
  const pulse = (Math.sin(time * 6) * 0.5 + 0.5) * (1 - frac / 0.3);
  const g = `rgba(180,20,30,${0.18 * pulse})`;
  uiRect(0, 0, view.W, view.H, g);
}
