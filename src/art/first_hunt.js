// R33: three coherent hero silhouettes + the ruined sanctuary's signature props.
// Separate sprite IDs preserve existing skins and the standard cast's art contract.
import { defineAnim, defineSprite } from '../engine/sprites.js';
import { P } from '../engine/palette.js';

const C = { ink: '#111522', shadow: '#26343e', stone: '#52606b', light: '#91a3ad',
  soul: '#80e5d8', soulD: '#255d60', bronze: '#aa8050', ember: '#e8a1e8' };
for (const id of ['hunter', 'pyro', 'guardian']) {
  defineAnim('fh_hero_' + id, 16, 18, 4, (p, f) => {
    const b = f % 2 ? -1 : 0, s = f === 1 ? 1 : f === 3 ? -1 : 0;
    p.rect(4, 15 + b, 3, 2 + (s > 0 ? 1 : 0), C.ink);
    p.rect(9, 15 + b, 3, 2 + (s < 0 ? 1 : 0), C.ink);
    if (id === 'hunter') {
      p.rect(3, 7 + b, 9, 9, C.soulD); p.rect(4, 7 + b, 6, 8, '#3e7774');
      p.line(3, 8 + b, 1, 15 + b, '#294b50'); p.line(11, 8 + b, 13, 15 + b, C.shadow);
      p.rect(5, 2 + b, 6, 7, C.soulD); p.rect(6, 1 + b, 4, 2, '#508b80');
      p.rect(6, 4 + b, 4, 4, C.ink); p.px(6, 5 + b, C.soul); p.px(9, 5 + b, '#d4b99d');
      p.line(4, 8 + b, 10, 13 + b, C.bronze); p.rect(7, 11 + b, 2, 2, C.soul);
      p.px(5, 3 + b, '#87aa9e'); p.px(6, 2 + b, '#9cc3ad');
      p.line(4, 10 + b, 3, 14 + b, '#62978b'); p.line(9, 13 + b, 11, 15 + b, '#193b42');
      p.hline(4, 9, 14 + b, '#887553'); p.px(7, 14 + b, '#d0b879');
      p.rect(3, 11 + b, 2, 2, '#ad9180'); p.px(3, 11 + b, '#d5b299');
      p.line(14, 7 + b, 14, 15 + b, C.light); p.px(14, 6 + b, C.soul);
    } else if (id === 'pyro') {
      p.rect(3, 8 + b, 9, 8, '#5c304f'); p.rect(4, 9 + b, 3, 6, '#a85167');
      p.rect(5, 4 + b, 6, 5, '#80505b'); p.rect(6, 5 + b, 4, 3, '#bc8d83');
      p.rect(5, 1 + b, 2, 4, '#cc787c'); p.rect(8, b, 2, 4, '#e4a987');
      p.rect(10, 2 + b, 2, 3, '#9d536e'); p.px(6, 5 + b, C.ember);
      p.line(3, 11 + b, 1, 6 + b, '#d3b383'); p.circle(1, 4 + b, 1.5, C.ember);
      p.rect(10, 11 + b, 3, 3, '#ba815a'); p.px(11, 11 + b, '#ffe4b7');
      p.line(4, 10 + b, 5, 15 + b, '#d18b8a'); p.line(8, 10 + b, 9, 15 + b, '#332341');
      p.hline(4, 10, 12 + b, '#b39565'); p.px(7, 12 + b, '#f4ddaa');
      p.px(6, 4 + b, '#f0b091'); p.px(8, 6 + b, '#41263c');
      p.px(8, b, '#f3d5a4'); p.px(11, 3 + b, '#b27491');
    } else {
      p.rect(3, 8 + b, 10, 8, C.shadow); p.rect(4, 8 + b, 8, 7, C.stone);
      p.rect(5, 9 + b, 4, 6, '#7a94a8'); p.rect(6, 11 + b, 2, 3, C.soul);
      p.rect(5, 2 + b, 6, 7, C.stone); p.rect(5, 2 + b, 3, 6, '#91aabd');
      p.rect(5, 5 + b, 6, 2, C.ink); p.rect(6, 5 + b, 4, 1, '#a9cffa');
      p.rect(1, 8 + b, 2, 7, C.shadow); p.rect(0, 9 + b, 3, 5, '#7693a8');
      p.line(14, 6 + b, 14, 16 + b, C.light); p.hline(12, 15, 12 + b, C.bronze);
      p.hline(4, 11, 9 + b, '#c0d2ce'); p.hline(4, 11, 14 + b, '#253949');
      p.vline(10 + b, 13 + b, 9, '#445f73'); p.px(6, 3 + b, '#d4e2db');
      p.line(0, 10 + b, 2, 13 + b, '#b8d5da'); p.px(1, 14 + b, '#243c50');
    }
    p.outline(P.ink);
  }, { anchor: [8, 17], fps: 8 });
}

defineAnim('fh_boss', 40, 40, 4, (p, f) => {
  const b = f % 2 ? -1 : 0;
  p.rect(10, 33, 7, 6, C.shadow); p.rect(24, 33, 7, 6, C.shadow);
  p.rect(9, 15 + b, 22, 21, '#374650'); p.rect(11, 16 + b, 16, 17, '#62717b');
  p.rect(13, 19 + b, 11, 12, '#233e47'); p.line(14, 20 + b, 23, 29 + b, C.soul);
  p.line(23, 20 + b, 14, 29 + b, C.soulD); p.circle(19, 24 + b, 3, C.soul);
  p.rect(12, 4 + b, 15, 12, C.shadow); p.rect(13, 4 + b, 12, 9, C.stone);
  p.rect(14, 8 + b, 11, 3, C.ink); p.rect(15, 9 + b, 8, 1, '#ffc28c');
  p.rect(14, 1 + b, 3, 4, C.bronze); p.rect(23, 0 + b, 3, 5, C.bronze);
  p.rect(2, 17 + b, 6, 17, '#536877'); p.rect(1, 18 + b, 5, 12, '#7893a2');
  p.line(35, 5 + b, 35, 37, C.bronze); p.rect(31, 4 + b, 8, 6, '#8596a0');
  p.rect(31, 4 + b, 7, 2, '#c2c7b4'); p.outline(P.ink);
}, { anchor: [20, 39], fps: 4 });

for (const lit of [false, true]) defineAnim('fh_brazier_' + (lit ? 'lit' : 'dark'), 24, 30, 4, (p, f) => {
  p.rect(4, 25, 16, 4, C.shadow); p.rect(7, 15, 10, 11, C.stone);
  p.rect(3, 12, 18, 5, C.bronze); p.rect(5, 11, 14, 3, C.ink);
  if (lit) { p.ellipse(12, 7, 5, 7, C.soulD); p.ellipse(12 + (f % 2), 6, 3, 6, C.soul); p.rect(11, 5, 2, 7, '#edfff0'); }
  else p.line(8, 17, 14, 25, C.ink);
  p.outline(P.ink);
}, { anchor: [12, 29], fps: 5 });

defineSprite('fh_altar', 54, 43, (p) => {
  p.ellipse(27, 36, 26, 6, C.shadow); p.ellipse(27, 33, 23, 6, C.stone);
  p.rect(7, 27, 40, 6, '#667481'); p.rect(11, 23, 32, 5, '#89949a');
  p.rect(18, 10, 18, 14, C.shadow); p.rect(19, 9, 15, 13, C.stone);
  p.line(20, 9, 28, 18, C.ink); p.line(28, 18, 24, 23, C.ink);
  p.line(25, 2, 31, 8, C.soul); p.line(31, 8, 27, 15, C.soulD);
  p.line(25, 2, 22, 10, '#c8fff1'); p.line(22, 10, 27, 15, C.soul);
  p.outline(P.ink);
}, { anchor: [27, 41] });
defineSprite('fh_sarcophagus', 28, 30, (p) => {
  p.rect(3, 5, 22, 24, C.shadow); p.rect(4, 3, 20, 24, C.stone);
  p.rect(7, 4, 14, 19, '#78848c'); p.rect(9, 8, 10, 13, '#465461');
  p.line(10, 8, 18, 16, C.bronze); p.rect(12, 5, 5, 4, C.light);
  p.line(5, 19, 11, 23, C.ink); p.outline(P.ink);
}, { anchor: [14, 29] });
defineAnim('fh_candles', 22, 18, 4, (p, f) => {
  p.ellipse(11, 15, 10, 2, C.shadow);
  for (const [x, y] of [[3, 8], [9, 4], [16, 7]]) {
    p.rect(x, y, 3, 15 - y, '#c3af86'); p.rect(x, y, 1, 14 - y, '#eadabd');
    p.px(x + 1, y - 1 - (f % 2), '#ffd19a');
  }
  p.outline(P.ink);
}, { anchor: [11, 17], fps: 4 });
defineAnim('fh_banner', 24, 38, 4, (p, f) => {
  p.rect(3, 3, 2, 34, C.bronze); p.rect(2, 35, 7, 2, C.stone);
  p.rect(5, 4, 16, 21, '#294d54'); p.rect(6, 5, 13, 17, '#3c6970');
  p.line(11, 8, 15, 13, C.soul); p.line(15, 13, 11, 19, C.soul);
  p.line(11, 8, 8, 13, '#dcf7ec'); p.line(8, 13, 11, 19, C.soulD);
  p.rect(18, 7 + f % 2, 3, 14, C.shadow); p.outline(P.ink);
}, { anchor: [12, 37], fps: 3 });
defineSprite('fh_trophy', 30, 34, (p) => {
  p.rect(3, 29, 24, 4, C.shadow); p.rect(6, 23, 18, 7, C.stone);
  p.rect(9, 8, 13, 15, '#6a7d88'); p.rect(10, 7, 11, 9, '#a6b5b8');
  p.rect(10, 12, 11, 3, C.ink); p.rect(12, 13, 7, 1, C.soul);
  p.rect(10, 3, 3, 5, C.bronze); p.rect(19, 2, 3, 6, C.bronze);
  p.line(10, 28, 20, 28, C.bronze); p.outline(P.ink);
}, { anchor: [15, 33] });
