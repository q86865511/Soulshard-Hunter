import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// 任務告示板 — large quest notice board, busy with pinned bounties
defineSprite('town_board', 26, 26, (p) => {
  // two wooden posts
  p.rect(3, 5, 3, 20, P.woodD);
  p.vline(5, 24, 4, P.wood);
  p.rect(20, 5, 3, 20, P.woodD);
  p.vline(5, 24, 21, P.wood);
  p.rect(3, 23, 3, 2, darken(P.woodD, 0.25));
  p.rect(20, 23, 3, 2, darken(P.woodD, 0.25));
  // planked board backing
  p.rect(2, 2, 22, 16, P.wood);
  for (let x = 2; x < 24; x += 4) p.vline(2, 17, x, P.woodD);
  p.hline(2, 23, 2, P.woodL);
  p.hline(2, 23, 9, P.woodD);
  // top frame beam
  p.rect(1, 1, 24, 2, P.woodL);
  p.rect(1, 0, 24, 1, P.woodD);
  // pinned paper notes
  p.rect(4, 4, 6, 6, P.bone);
  p.hline(5, 8, 6, P.ink2); p.hline(5, 7, 8, P.ink2);
  p.px(4, 4, darken(P.bone, 0.2)); p.px(9, 9, darken(P.bone, 0.25));
  p.rect(12, 3, 7, 7, lighten(P.bone, 0.08));
  p.hline(13, 17, 5, P.ink2); p.hline(13, 16, 7, P.ink2); p.hline(13, 17, 9, P.ink2);
  p.px(15, 6, P.iron); // pin
  p.rect(5, 12, 6, 5, lighten(P.bone, 0.05));
  p.hline(6, 9, 14, P.ink2); p.hline(6, 8, 16, P.ink2);
  // bounty note with red wax seal
  p.rect(13, 11, 8, 6, P.bone);
  p.hline(14, 19, 12, P.ink2); p.hline(14, 18, 14, P.ink2);
  p.circle(17, 15, 1, P.redD);
  p.px(17, 15, P.redL); p.px(16, 14, lighten(P.redL, 0.2));
  p.shadeBottom(0.12);
  p.outline(P.ink);
}, { anchor: [13, 25] });

// 接待櫃檯 — reception counter/desk with ledger + service bell
defineSprite('town_desk', 24, 16, (p) => {
  // front panel
  p.rect(2, 6, 20, 9, P.woodD);
  p.vline(6, 14, 7, darken(P.woodD, 0.2));
  p.vline(6, 14, 16, darken(P.woodD, 0.2));
  p.rect(3, 9, 18, 3, darken(P.woodD, 0.15));
  // counter top overhang
  p.rect(0, 4, 24, 3, P.wood);
  p.hline(0, 23, 4, P.woodL);
  p.hline(0, 23, 6, darken(P.woodD, 0.2));
  // open ledger (two pages)
  p.rect(4, 1, 9, 4, P.bone);
  p.vline(1, 4, 8, darken(P.bone, 0.25));
  p.hline(5, 7, 2, P.ink2); p.hline(5, 7, 3, P.ink2);
  p.hline(9, 11, 2, P.ink2); p.hline(9, 11, 3, P.ink2);
  p.px(4, 1, darken(P.bone, 0.2)); p.px(12, 1, darken(P.bone, 0.2));
  // small gold service bell
  p.rect(16, 4, 4, 1, P.woodD);
  p.ellipse(18, 2, 2, 1.6, P.gold);
  p.rect(17, 1, 3, 2, P.gold);
  p.px(17, 1, P.goldL); p.px(18, 0, P.goldL);
  p.px(18, 3, P.goldD);
  p.shadeBottom(0.14);
  p.outline(P.ink);
}, { anchor: [12, 15] });

// 鍛造爐 — stone forge furnace with glowing coals + chimney wisp
defineAnim('town_furnace', 20, 24, 3, (p, f) => {
  const glow = [P.ember, P.emberL, P.red][f];
  const core = [P.emberL, P.white, P.ember][f];
  // warm light spill on the ground (drawn first so the body sits on it)
  p.ellipse(9, 22, 9, 2, withAlpha(P.ember, 0.4));
  // stone body
  p.rect(2, 8, 16, 15, P.gray1);
  p.rect(3, 9, 14, 13, P.gray2);
  // masonry lines + lit-stone highlights
  p.hline(3, 16, 13, P.gray1);
  p.hline(3, 16, 18, P.gray1);
  p.vline(9, 13, 8, P.gray1); p.vline(13, 18, 12, P.gray1);
  p.px(3, 9, P.gray3); p.px(16, 9, P.gray3); p.px(4, 14, P.gray3);
  // arched mouth of coals
  p.rect(5, 13, 10, 8, P.shadow);
  p.ellipse(10, 13, 5, 1.6, P.shadow);
  p.rect(6, 15, 8, 6, darken(glow, 0.35));
  p.ellipse(10, 18, 4, 3, glow);
  p.ellipse(10, 18, 2.4, 1.8, core);
  p.px(8, 19, P.white); p.px(12, 17, lighten(core, 0.2));
  // chimney (offset right, leaves headroom for the wisp)
  p.rect(12, 4, 6, 5, P.gray1);
  p.rect(13, 5, 4, 4, P.gray2);
  p.rect(11, 3, 8, 2, P.gray3); // cap / opening
  p.rect(13, 3, 4, 1, P.shadow); // dark flue mouth
  // rising wisp of smoke above the flue (stays within the box)
  const wy = [2, 1, 0][f];
  p.ellipse(15, wy + 1, 1.4, 1.2, withAlpha(P.gray3, 0.45));
  p.px(15, wy, withAlpha(P.gray4, 0.55));
  p.outline(P.ink);
}, { anchor: [10, 23], fps: 6 });

// 鐵砧 — iron anvil on a wooden stump with sparks
defineSprite('town_anvil', 16, 14, (p) => {
  // wooden stump base
  p.rect(4, 8, 8, 5, P.woodD);
  p.rect(4, 8, 8, 1, P.woodL);
  p.vline(9, 12, 6, darken(P.woodD, 0.2));
  p.vline(9, 12, 9, darken(P.woodD, 0.2));
  p.ellipse(8, 8, 4, 1.4, P.wood);
  // anvil waist + base (darker iron)
  p.rect(5, 6, 6, 2, P.steelD);
  p.rect(6, 6, 4, 3, P.iron);
  // anvil face (the broad top, lighter steel) + horn
  p.rect(2, 3, 11, 2, P.iron);
  p.hline(2, 12, 3, P.steel);
  p.hline(3, 11, 3, P.steelL); // lit top edge
  p.line(12, 3, 14, 4, P.iron); // tapering horn
  p.px(13, 3, P.steel);
  p.px(4, 3, P.steelL);
  // spark specks rising off the face
  p.px(6, 2, P.emberL);
  p.px(9, 1, P.emberL);
  p.px(8, 2, lighten(P.emberL, 0.2));
  p.outline(P.ink);
}, { anchor: [8, 13] });

// 武器架 — weapon rack holding a sword, axe and spear
defineSprite('town_weaponrack', 18, 22, (p) => {
  // wooden frame
  p.rect(1, 18, 16, 3, P.woodD);
  p.rect(1, 18, 16, 1, P.woodL);
  p.vline(2, 20, 2, P.wood);
  p.vline(2, 20, 15, P.wood);
  p.rect(1, 6, 16, 2, P.woodD);
  p.hline(1, 16, 6, P.woodL);
  // slot pegs
  p.px(4, 8, P.woodL); p.px(9, 8, P.woodL); p.px(13, 8, P.woodL);
  // sword (left slot) — blade up
  p.vline(2, 17, 4, P.steelL);
  p.px(3, 5, P.steel); // bevel
  p.px(4, 2, P.white); // point glint
  p.hline(3, 5, 16, P.steelD); // crossguard
  p.px(4, 18, P.goldD); // pommel
  // axe (middle slot) — bearded head, not a square
  p.vline(4, 19, 9, P.woodD); // haft
  p.px(9, 4, P.woodL);
  p.rect(8, 5, 3, 2, P.steel); // head top
  p.rect(7, 7, 4, 2, P.steel); // head belly (juts out)
  p.line(7, 6, 6, 9, P.steelL); // sweeping cutting edge
  p.px(10, 5, P.steelL); // top glint
  // spear (right slot) — diamond head on a long haft
  p.vline(2, 19, 13, P.wood);
  p.px(13, 5, P.woodL);
  p.px(13, 2, P.steelL); p.px(13, 3, P.steelL); p.px(13, 4, P.steel);
  p.px(12, 4, P.steelD); p.px(14, 4, P.steelD); // barbs
  p.px(13, 1, P.white);
  p.shadeBottom(0.12);
  p.outline(P.ink);
}, { anchor: [9, 21] });

// 磨刀石 — grindstone wheel on a wooden frame with hand crank
defineSprite('town_grindstone', 14, 16, (p) => {
  // wooden frame legs + cross-brace
  p.line(2, 15, 4, 9, P.woodD);
  p.line(11, 15, 9, 9, P.woodD);
  p.rect(2, 14, 9, 2, P.woodD);
  p.hline(3, 10, 14, P.wood);
  p.line(4, 12, 9, 12, darken(P.woodD, 0.15)); // brace
  // round stone wheel (3 tones + rim)
  p.circle(7, 8, 5, P.gray3);
  p.circle(7, 8, 4, P.gray2);
  p.ring(7, 8, 5, darken(P.gray2, 0.25));
  p.px(5, 6, P.gray4); p.px(6, 5, P.gray4); // worn highlight arc
  p.px(4, 8, P.gray4);
  // hub + spoke + axle
  p.line(7, 8, 9, 6, darken(P.gray3, 0.2)); // spoke hint
  p.circle(7, 8, 1, P.iron);
  p.px(7, 8, P.steelL);
  // hand crank
  p.line(7, 8, 11, 6, P.iron);
  p.rect(11, 5, 2, 2, P.woodL);
  p.px(11, 5, lighten(P.woodL, 0.2));
  // spark off the wheel edge
  p.px(2, 9, P.emberL);
  p.px(1, 10, lighten(P.emberL, 0.2));
  p.outline(P.ink);
}, { anchor: [7, 15] });