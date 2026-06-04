// Hub (camp) decoration sprites.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken } from '../engine/palette.js';

// 天賦祭壇 — a stone altar with a floating soul-shard
defineSprite('hub_altar', 22, 28, (p) => {
  p.rect(2, 22, 18, 5, P.gray1);
  p.rect(4, 19, 14, 4, P.gray2);
  p.hline(4, 17, 19, P.gray3);
  p.rect(8, 11, 6, 9, P.gray2);
  p.rect(8, 11, 6, 2, P.gray3);
  p.rect(6, 9, 10, 3, P.gray3);
  p.hline(6, 15, 9, P.gray4);
  // floating shard + aura
  p.ellipse(11, 5, 2.6, 4.4, P.shardD);
  p.ellipse(11, 5, 1.6, 3.2, P.shard);
  p.vline(1, 8, 11, P.shardL);
  p.px(10, 3, P.white);
  p.outline(P.ink);
}, { anchor: [11, 26] });

// 設施工坊 — an anvil + hammer with embers
defineSprite('hub_forge', 24, 24, (p) => {
  p.rect(3, 18, 19, 5, P.woodD);
  p.rect(3, 18, 19, 1, P.woodL);
  p.rect(7, 11, 11, 4, P.gray2);
  p.rect(6, 10, 13, 2, P.gray3);
  p.rect(9, 14, 7, 4, P.gray1);
  p.px(7, 10, P.steelL);
  p.ellipse(12, 10, 2, 1.5, P.ember);
  p.px(12, 9, P.emberL);
  p.line(19, 17, 21, 8, P.wood);
  p.rect(18, 5, 5, 3, P.steel);
  p.px(18, 5, P.steelL);
  p.outline(P.ink);
}, { anchor: [12, 22] });

// 營火 — animated campfire
defineAnim('campfire', 16, 16, 3, (p, f) => {
  p.line(3, 13, 12, 12, P.woodD);
  p.line(4, 12, 13, 13, P.wood);
  const fl = [0, 1, -1][f];
  p.ellipse(8, 9 + fl * 0.4, 3, 4, P.ember);
  p.ellipse(8, 8 + fl * 0.4, 2, 3, P.emberL);
  p.ellipse(8, 7 + fl * 0.4, 1, 1.6, P.white);
  p.outline(P.ink);
}, { anchor: [8, 14], fps: 8 });

// 小屋
defineSprite('hub_house', 28, 26, (p) => {
  p.rect(3, 12, 22, 13, P.woodD);
  p.rect(4, 13, 20, 11, P.wood);
  // roof
  for (let i = 0; i < 9; i++) { p.hline(2 + i, 26 - i, 12 - i, i < 2 ? P.red : P.redD); }
  p.hline(1, 27, 12, P.redD);
  // door + windows
  p.rect(12, 17, 5, 8, P.woodD); p.px(15, 21, P.gold);
  p.rect(6, 15, 4, 4, P.iceD); p.rect(19, 15, 4, 4, P.iceD);
  p.rectLine(6, 15, 4, 4, P.woodD); p.rectLine(19, 15, 4, 4, P.woodD);
  p.outline(P.ink);
}, { anchor: [14, 25] });

// 水井
defineSprite('hub_well', 18, 18, (p) => {
  p.ellipse(9, 14, 7, 3, P.gray1);
  p.rect(3, 9, 12, 6, P.gray2); p.rect(3, 9, 12, 1, P.gray3);
  p.rect(4, 10, 10, 4, P.ink2); p.ellipse(9, 11, 4, 1.6, P.blueD);
  p.vline(2, 9, 3, P.wood); p.vline(2, 9, 14, P.wood); p.hline(3, 14, 2, P.woodD);
  p.outline(P.ink);
}, { anchor: [9, 16] });

// 路燈（發光）
defineAnim('hub_lamp', 8, 22, 2, (p, f) => {
  p.vline(6, 21, 4, P.gray2); p.rect(3, 20, 4, 2, P.gray1);
  p.rect(3, 3, 4, 5, P.bronze);
  p.ellipse(5, 5, 1.6, 2, f ? P.emberL : P.ember);
  p.outline(P.ink);
}, { anchor: [5, 21], fps: 2 });

// 旗幟 — banner decoration
defineSprite('hub_banner', 12, 22, (p) => {
  p.vline(2, 21, 2, P.woodD);
  p.rect(3, 2, 8, 11, P.blueD);
  p.rect(3, 2, 8, 2, P.blueL);
  p.ellipse(7, 7, 1.6, 2.6, P.shardD);
  p.ellipse(7, 7, 1, 1.8, P.shardL);
  for (let i = 0; i < 3; i++) { p.px(4 + i * 2, 13, P.blueD); p.px(5 + i * 2, 12, P.blueD); }
  p.outline(P.ink);
}, { anchor: [2, 21] });
