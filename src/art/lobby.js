// Hub buildings for the quest + achievement stations (A1).
// ENHANCED EDITION (art_v2): same names / dims / anchors and the same local
// WOOD/GOLD consts, but markedly prettier — the trophy now gleams with a gold
// gradient + a "kira" star4 glint and warm halo, and the notice board has real
// character: a soft contact shadow, wood-grain plank seams, several pinned
// papers at jaunty angles, brass pins, a glossy red wax seal, and a top-left
// light source carried through with rim light. Top-left light source throughout.
import { defineSprite } from '../engine/sprites.js';
import { P, withAlpha, tint } from '../engine/palette.js';

const WOOD = '#6b4a2a', WOOD_D = '#4a3018', WOOD_L = '#8a6238', PAPER = '#e8e0c8';
const GOLD = '#e0a83a', GOLD_D = '#9a6a18';

// 任務公告板 — a wooden notice board with pinned quest papers
defineSprite('hub_quests', 24, 28, (p) => {
  // ground contact shadow so the board sits in the world
  p.softShadow(12, 27, 9, 2.2, 0.34);

  // ── support posts (rounded, with a lit left edge) ─────────────────────────
  p.rect(3, 10, 2, 17, WOOD_D); p.rect(19, 10, 2, 17, WOOD_D);
  p.vline(10, 26, 3, WOOD);                 // lit face of the left post
  p.vline(10, 26, 19, tint(WOOD_D, P.ink, 0.25)); // shaded face of the right post
  p.px(3, 26, P.ink2); p.px(20, 26, P.ink2);

  // ── board body: warm vertical wood gradient + lit top rail ────────────────
  p.gradV(2, 4, 20, 14, WOOD_L, WOOD_D);
  p.rect(2, 4, 20, 2, tint(WOOD_L, P.rim, 0.4));   // sun-warmed top edge
  p.rect(2, 16, 20, 2, WOOD_D);                    // shaded lower lip
  p.hline(2, 21, 4, withAlpha(P.rim, 0.6));        // crisp highlight on the rail

  // wood grain: alternating plank seams + a few grain flecks
  for (let x = 5; x < 21; x += 4) {
    p.vline(6, 16, x, withAlpha(WOOD_D, 0.55));
    p.vline(6, 16, x + 1, withAlpha(P.rim, 0.12));   // tiny lit side of each seam
  }
  p.speckle(3, 6, 18, 10, withAlpha(WOOD_D, 0.5), 10, 7);
  p.speckle(3, 6, 18, 10, withAlpha(P.rim, 0.18), 5, 13);

  // ── pinned papers (slightly jaunty, drop shadow under each) ───────────────
  // paper A (left) — leaning a touch left
  p.rect(5, 8, 6, 7, withAlpha(P.ink, 0.35));       // soft cast shadow
  p.rect(4, 7, 6, 7, PAPER);
  p.rect(4, 7, 6, 1, tint(PAPER, P.rim, 0.6));      // lit top edge
  p.hline(5, 8, 9, P.ink2); p.hline(5, 9, 10, P.ink2); p.hline(5, 7, 11, P.ink2); // text lines
  p.px(4, 7, P.gray3); // brass pin head shadow
  p.px(7, 7, P.gold); p.px(7, 6, P.goldL);          // brass pin (top)

  // paper B (right) — taller posting
  p.rect(14, 7, 6, 8, withAlpha(P.ink, 0.35));      // cast shadow
  p.rect(13, 6, 6, 8, PAPER);
  p.rect(13, 6, 6, 1, tint(PAPER, P.rim, 0.6));
  p.hline(14, 17, 8, P.ink2); p.hline(14, 18, 9, P.ink2);
  p.hline(14, 16, 11, P.ink2); p.hline(14, 17, 12, P.ink2);
  p.px(16, 6, P.gold); p.px(16, 5, P.goldL);        // brass pin

  // ── glossy red wax seal on paper A ────────────────────────────────────────
  p.glow(7, 12, 2.2, P.red, 0.3, 3);                // faint warm halo
  p.ellipse(7, 12, 1.6, 1.6, P.redD);
  p.ellipse(7, 12, 1.3, 1.3, P.redL);
  p.px(6, 11, P.rim);                               // specular dot on the wax

  // little hanging quest charm/ribbon for flavour
  p.vline(17, 19, 18, P.redD); p.px(18, 19, P.red);

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
}, { anchor: [12, 27] });

// 成就殿堂 — a golden trophy on a stone pedestal
defineSprite('hub_trophy', 22, 28, (p) => {
  // warm achievement halo + contact shadow
  p.softShadow(11, 27, 8, 2, 0.34);
  p.glow(11, 11, 7, P.holy, 0.22, 4);

  // ── stone pedestal: cool gradient, lit top, beveled foot ──────────────────
  p.gradV(5, 20, 12, 7, P.gray3, P.gray1);
  p.rect(5, 20, 12, 2, P.gray4);                    // lit cap
  p.rect(4, 26, 14, 2, P.gray1); p.rect(4, 26, 14, 1, P.gray2); // base ledge
  p.hline(5, 16, 20, withAlpha(P.white, 0.5));      // crisp top highlight
  // little engraved plaque
  p.rect(8, 23, 6, 2, P.gray1); p.hline(9, 12, 23, P.gold);

  // ── golden cup: vertical gold gradient bowl with rim + deep shade ─────────
  p.ellipse(11, 11, 5, 4, GOLD_D);                  // outer shaded body
  p.ellipse(11, 10, 4.2, 3.4, GOLD);
  p.gradV(7, 7, 8, 6, P.goldL, GOLD);               // top-lit gradient over the bowl face
  p.ellipse(11, 9, 2.8, 2, tint(P.goldL, P.holyL, 0.4)); // bright inner gleam
  p.hline(7, 15, 7, withAlpha(P.goldL, 0.85));      // lit top rim of the cup
  p.hline(8, 14, 13, GOLD_D);                       // shaded underside of the bowl

  // ── stem + base ───────────────────────────────────────────────────────────
  p.rect(10, 14, 2, 4, GOLD_D); p.vline(14, 17, 10, GOLD); // lit side of stem
  p.rect(8, 17, 6, 2, GOLD); p.rect(8, 17, 6, 1, P.goldL); // foot + lit edge
  p.rect(8, 18, 6, 1, GOLD_D);

  // ── flowing handles (curved) ──────────────────────────────────────────────
  p.line(6, 9, 5, 12, GOLD); p.line(5, 12, 7, 13, GOLD_D);
  p.line(16, 9, 17, 12, GOLD); p.line(17, 12, 15, 13, GOLD_D);
  p.px(6, 9, P.goldL); p.px(16, 9, P.goldL);        // handle hi-lights

  // a small engraved star on the cup face
  p.px(11, 11, GOLD_D); p.px(10, 11, GOLD_D); p.px(12, 11, GOLD_D);
  p.px(11, 10, GOLD_D); p.px(11, 12, GOLD_D);

  p.rimLight(P.rim, 0.55);
  p.outline(P.ink);

  // ── "kira" sparkles on top of everything (post-outline so they pop) ───────
  p.star4(11, 6, 3, P.holyL, P.white);              // crown glint
  p.sparkle(15, 8, P.glint, 1);                     // side twinkle
  p.sparkle(7, 13, withAlpha(P.holyL, 0.9), 1);
  p.px(9, 8, P.white);                              // tiny specular catch-light
}, { anchor: [11, 27] });
