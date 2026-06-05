// Hub buildings for the quest + achievement stations (A1).
import { defineSprite } from '../engine/sprites.js';
import { P, withAlpha } from '../engine/palette.js';

const WOOD = '#6b4a2a', WOOD_D = '#4a3018', WOOD_L = '#8a6238', PAPER = '#e8e0c8';
const GOLD = '#e0a83a', GOLD_D = '#9a6a18';

// 任務公告板 — a wooden notice board with pinned quest papers
defineSprite('hub_quests', 24, 28, (p) => {
  p.rect(3, 10, 2, 17, WOOD_D); p.rect(19, 10, 2, 17, WOOD_D);     // posts
  p.rect(2, 4, 20, 14, WOOD); p.rect(2, 4, 20, 2, WOOD_L);          // board + top light edge
  for (let x = 5; x < 21; x += 3) p.vline(6, 16, x, withAlpha(WOOD_D, 0.5));   // plank seams
  p.rect(5, 7, 6, 7, PAPER); p.rect(13, 6, 6, 8, PAPER);            // pinned papers
  p.hline(6, 9, 9, P.ink2); p.hline(6, 10, 11, P.ink2);
  p.hline(14, 17, 8, P.ink2); p.hline(14, 18, 10, P.ink2); p.hline(14, 16, 12, P.ink2);
  p.ellipse(8, 12, 1.4, 1.4, P.redL);                              // a red wax seal
  p.outline(P.ink);
}, { anchor: [12, 27] });

// 成就殿堂 — a golden trophy on a stone pedestal
defineSprite('hub_trophy', 22, 28, (p) => {
  p.rect(5, 20, 12, 7, P.gray2); p.rect(5, 20, 12, 2, P.gray3); p.rect(4, 26, 14, 2, P.gray1);   // pedestal
  p.ellipse(11, 11, 5, 4, GOLD_D); p.ellipse(11, 10, 4, 3.2, GOLD); p.ellipse(11, 9, 2.6, 2, P.goldL);  // cup
  p.rect(10, 14, 2, 4, GOLD_D); p.rect(8, 17, 6, 2, GOLD);          // stem + base
  p.line(6, 9, 5, 12, GOLD); p.line(16, 9, 17, 12, GOLD);          // handles
  p.px(11, 8, '#ffffff');                                          // glint
  p.outline(P.ink);
}, { anchor: [11, 27] });
