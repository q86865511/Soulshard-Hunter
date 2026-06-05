// 死神 Reaper — the hidden, killable superboss (E2 / 原#13). A floating hooded
// skeleton trailing a tattered black shroud, burning eyes, scythe in one hand.
import { defineAnim } from '../engine/sprites.js';
import { P, withAlpha } from '../engine/palette.js';
import { defineIcon } from './icons.js';

const CLOAK_D = '#090a12', CLOAK = '#161a2e', CLOAK_L = '#2a2f4c';
const BONE = '#d9d3bd', STEEL = '#c6cedb', SHAFT = '#3a2a18';

defineAnim('reaper', 34, 46, 4, (p, f) => {
  const bob = (f === 1 || f === 3) ? 1 : 0;
  const oy = -bob;
  // tattered shroud hem (floats — no legs)
  for (let i = 0; i < 7; i++) {
    const tx = 6 + i * 4;
    const tlen = 40 + ((i + f) % 2) * 2 + oy;
    p.vline(33 + oy, tlen, tx, CLOAK_D);
  }
  p.ellipse(17, 41 + oy, 13, 3, withAlpha('#000', 0.55));     // shadow pool
  // robe body (broad trapezoid)
  const top = 16 + oy, bot = 38 + oy;
  for (let y = top; y <= bot; y++) { const t = (y - top) / (bot - top); const hw = Math.round(4 + t * 10); p.hline(17 - hw, 17 + hw, y, CLOAK_D); }
  for (let y = top + 1; y <= bot - 2; y++) { const t = (y - top) / (bot - top); const hw = Math.round(2 + t * 6); p.hline(17 - hw, 17 + hw, y, CLOAK); }
  p.hline(7, 27, bot - 1, CLOAK_L);                            // hem trim
  // sleeves / bony hands
  p.rect(4, 20 + oy, 3, 9, CLOAK_D); p.rect(27, 20 + oy, 3, 9, CLOAK_D);
  p.ellipse(5, 29 + oy, 1.7, 1.7, BONE);
  p.ellipse(29, 29 + oy, 1.7, 1.7, BONE);
  // hooded skull
  p.ellipse(17, 11 + oy, 7, 8, CLOAK_D);
  p.ellipse(17, 10 + oy, 5.2, 6, CLOAK);
  p.rect(13, 9 + oy, 9, 7, '#000');                            // hood void
  p.ellipse(17, 12 + oy, 3.4, 3.6, BONE);                      // skull
  p.rect(15, 11 + oy, 2, 2, P.redL); p.rect(19, 11 + oy, 2, 2, P.redL);   // burning eyes
  p.px(15, 11 + oy, '#fff'); p.px(20, 11 + oy, '#fff');
  p.px(17, 14 + oy, P.ink);                                    // nasal void
  // scythe — long shaft up the left, blade arcing across the top
  p.line(5, 7 + oy, 7, 40 + oy, SHAFT);
  p.line(5, 7 + oy, 14, 4 + oy, STEEL);
  p.line(14, 4 + oy, 19, 9 + oy, STEEL);
  p.px(5, 7 + oy, P.shardL);                                   // glint
  p.outline(P.ink);
}, { anchor: [17, 40], fps: 3 });

defineIcon('reaper_icon', '#090a12', (p) => {
  p.ellipse(9, 8, 4.5, 5, '#161a2e');
  p.rect(6, 7, 6, 4, '#000');
  p.px(7, 8, P.redL); p.px(10, 8, P.redL);
  p.line(2, 2, 3, 14, '#3a2a18'); p.line(2, 2, 8, 1, '#c6cedb');
});
