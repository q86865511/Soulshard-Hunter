import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════
//  GUILD & FORGE — town fixtures for 魂晶獵手 / Soulshard Hunter
//  Upgraded: the forge runs HOT (ember glow, drifting sparks, glowing
//  metal & coals), the guild reads GRAND (banners, crest sheen, gilt
//  trim). Top-left light source, 3–4 tonal steps per material, rim
//  light + soft ground shadows, seeded sparkle VFX so bakes stay
//  deterministic. All names / dims / anchors preserved.
// ════════════════════════════════════════════════════════════════════

// 任務告示板 — grand quest notice board: gilt-framed planks, pinned
// bounties, a guild crest banner up top and a glowing rare bounty.
defineSprite('town_board', 26, 26, (p) => {
  // soft contact shadow on the ground
  p.softShadow(13, 25, 11, 2, 0.3);

  // two sturdy wooden posts (core + shadow + lit edge)
  p.rect(3, 5, 3, 20, P.woodD);
  p.vline(5, 24, 4, P.wood);
  p.vline(5, 22, 3, lighten(P.wood, 0.18)); // lit left edge
  p.rect(20, 5, 3, 20, P.woodD);
  p.vline(5, 24, 21, P.wood);
  p.vline(5, 22, 20, lighten(P.wood, 0.1));
  // post feet sunk in dirt
  p.rect(3, 23, 3, 2, darken(P.woodD, 0.25));
  p.rect(20, 23, 3, 2, darken(P.woodD, 0.25));

  // planked board backing — vertical gradient for depth
  p.gradV(2, 2, 22, 16, lighten(P.wood, 0.06), darken(P.wood, 0.08));
  for (let x = 2; x < 24; x += 4) p.vline(2, 17, x, P.woodD);
  p.hline(2, 23, 2, P.woodL);   // top lit lip
  p.hline(2, 23, 9, P.woodD);   // mid seam shadow
  p.speckle(2, 2, 22, 16, darken(P.woodD, 0.12), 10, 7); // grain specks

  // gilt top frame beam with crest banner
  p.rect(1, 1, 24, 2, P.gold);
  p.hline(1, 24, 1, P.goldL);   // gleaming top
  p.rect(1, 0, 24, 1, P.goldD);
  // small hanging guild crest banner (center top)
  p.rect(10, 2, 6, 5, P.redD);
  p.gradV(11, 3, 4, 3, P.red, P.redD);
  p.px(11, 3, P.redL);
  // gold diamond crest on the banner
  p.px(13, 3, P.goldL); p.px(12, 4, P.gold); p.px(14, 4, P.gold);
  p.px(13, 5, P.gold); p.px(13, 4, lighten(P.goldL, 0.2));
  p.px(11, 6, P.goldD); p.px(14, 6, P.goldD); // banner tassels

  // pinned paper notes (parchment with shadow + lit corner)
  p.rect(4, 4, 6, 6, P.bone);
  p.px(9, 5, darken(P.bone, 0.18)); p.px(9, 6, darken(P.bone, 0.18));
  p.px(4, 4, lighten(P.bone, 0.12)); // lit corner
  p.hline(5, 8, 6, P.ink2); p.hline(5, 7, 8, P.ink2);
  p.px(9, 9, darken(P.bone, 0.25));
  p.px(6, 4, P.iron); // pin

  p.rect(12, 3, 7, 7, lighten(P.bone, 0.08));
  p.px(18, 4, darken(P.bone, 0.16)); p.px(18, 5, darken(P.bone, 0.16));
  p.hline(13, 17, 5, P.ink2); p.hline(13, 16, 7, P.ink2); p.hline(13, 17, 9, P.ink2);
  p.px(15, 3, P.iron); // pin

  p.rect(5, 12, 6, 5, lighten(P.bone, 0.05));
  p.hline(6, 9, 14, P.ink2); p.hline(6, 8, 16, P.ink2);
  p.px(5, 12, lighten(P.bone, 0.1));

  // RARE bounty note — glowing wax seal, faint magic aura
  p.rect(13, 11, 8, 6, P.bone);
  p.px(20, 12, darken(P.bone, 0.18)); p.px(20, 16, darken(P.bone, 0.18));
  p.hline(14, 19, 12, P.ink2); p.hline(14, 18, 14, P.ink2);
  p.glow(17, 15, 3, withAlpha(P.red, 0.5), 0.6, 3); // seal glow
  p.circle(17, 15, 1, P.redD);
  p.px(17, 15, P.redL); p.px(16, 14, lighten(P.redL, 0.25));
  p.sparkle(20, 11, P.glint, 1); // kira on the corner

  p.shadeBottom(0.12);
  p.rimLight(P.rim, 0.4, 1, 1);
  p.outline(P.ink);
}, { anchor: [13, 25] });

// 接待櫃檯 — grand reception counter: gilt-edged top, open ledger,
// gleaming gold service bell, a glowing guild sigil on the front panel.
defineSprite('town_desk', 24, 16, (p) => {
  p.softShadow(12, 15, 11, 1.6, 0.28);

  // front panel — graded wood with carved recess
  p.gradV(2, 6, 20, 9, P.wood, darken(P.woodD, 0.06));
  p.vline(6, 14, 7, darken(P.woodD, 0.22));
  p.vline(6, 14, 16, darken(P.woodD, 0.22));
  p.rect(3, 9, 18, 3, darken(P.woodD, 0.15));
  p.speckle(3, 7, 18, 7, darken(P.woodD, 0.1), 8, 13);

  // glowing guild sigil engraved in the recess
  p.glow(11, 10, 3, withAlpha(P.astral, 0.4), 0.5, 3);
  p.px(11, 9, P.astralL); p.px(10, 10, P.astral); p.px(12, 10, P.astral);
  p.px(11, 11, P.astral); p.px(11, 10, lighten(P.astralL, 0.2));

  // counter top overhang — gilt front lip
  p.rect(0, 4, 24, 3, P.wood);
  p.hline(0, 23, 4, P.woodL);
  p.hline(0, 23, 6, P.gold);          // gleaming gilt edge
  p.hline(0, 23, 7, darken(P.woodD, 0.2));

  // open ledger (two pages, lit left page)
  p.rect(4, 1, 9, 4, P.bone);
  p.gradH(4, 1, 4, 4, lighten(P.bone, 0.1), P.bone); // left page lit
  p.vline(1, 4, 8, darken(P.bone, 0.28));            // spine
  p.hline(5, 7, 2, P.ink2); p.hline(5, 7, 3, P.ink2);
  p.hline(9, 11, 2, P.ink2); p.hline(9, 11, 3, P.ink2);
  p.px(4, 1, lighten(P.bone, 0.14)); p.px(12, 1, darken(P.bone, 0.2));

  // gold service bell — glow + specular
  p.rect(16, 4, 4, 1, P.woodD);
  p.glow(18, 2, 2, withAlpha(P.gold, 0.35), 0.5, 2);
  p.ellipse(18, 2, 2, 1.6, P.gold);
  p.rect(17, 1, 3, 2, P.gold);
  p.px(17, 1, P.goldL); p.px(18, 0, lighten(P.goldL, 0.2)); // specular cap
  p.px(19, 3, P.goldD); p.px(18, 3, P.goldD);
  p.sparkle(20, 0, P.glint, 1);

  p.shadeBottom(0.14);
  p.rimLight(P.rim, 0.4, 1, 1);
  p.outline(P.ink);
}, { anchor: [12, 15] });

// 鍛造爐 — stone forge furnace: roaring coals, glowing arch, leaping
// sparks, heat-shimmer light spill and a curling chimney wisp.
defineAnim('town_furnace', 20, 24, 3, (p, f) => {
  const phase = f / 3;
  const glow = [P.ember, P.emberL, P.red][f];
  const core = [P.emberL, P.white, P.ember][f];
  const lit  = [0.42, 0.5, 0.38][f]; // pulsing light intensity

  // warm light spill on the ground (drawn first so the body sits on it)
  p.glow(9, 22, 8, withAlpha(P.ember, lit * 0.6), 0.7, 3);
  p.ellipse(9, 22, 9, 2, withAlpha(P.ember, lit));

  // stone body — graded masonry (3 tones)
  p.gradV(2, 8, 16, 15, P.gray2, darken(P.gray1, 0.08));
  p.rect(3, 9, 14, 13, P.gray2);
  // masonry seams + lit-stone highlights (top-left light)
  p.hline(3, 16, 13, P.gray1);
  p.hline(3, 16, 18, P.gray1);
  p.vline(9, 13, 8, P.gray1); p.vline(13, 18, 12, P.gray1);
  p.hline(3, 8, 9, lighten(P.gray3, 0.1)); // lit top course
  p.px(3, 9, P.gray3); p.px(16, 9, P.gray3); p.px(4, 14, P.gray3);
  p.speckle(3, 9, 14, 13, darken(P.gray1, 0.1), 9, 21);
  // warm ember underglow bleeding into the lower stone
  p.hline(4, 15, 21, withAlpha(glow, 0.25));

  // arched mouth — deep shadow then a furnace of coals
  p.rect(5, 13, 10, 8, P.shadow);
  p.ellipse(10, 13, 5, 1.6, P.shadow);
  p.rect(6, 15, 8, 6, darken(glow, 0.35));
  // layered ember bed: radial glow -> ellipse -> hot core -> white heart
  p.glow(10, 18, 5, withAlpha(glow, 0.7), 0.8, 4);
  p.ellipse(10, 18, 4, 3, glow);
  p.ellipse(10, 18, 2.4, 1.8, core);
  p.px(10, 18, P.white);
  p.px(8, 19, lighten(core, 0.1)); p.px(12, 17, lighten(core, 0.25));
  p.dither(6, 19, 8, 2, glow, darken(glow, 0.3)); // glowing coal rubble

  // chimney (offset right, leaves headroom for the wisp)
  p.gradV(12, 4, 6, 5, P.gray2, P.gray1);
  p.rect(13, 5, 4, 4, darken(P.gray2, 0.05));
  p.rect(11, 3, 8, 2, P.gray3); // cap / opening
  p.hline(11, 18, 3, lighten(P.gray3, 0.12)); // lit cap edge
  p.rect(13, 3, 4, 1, P.shadow); // dark flue mouth

  // rising wisp of smoke above the flue (stays within the box)
  const wy = [2, 1, 0][f];
  p.ellipse(15, wy + 1, 1.4, 1.2, withAlpha(P.gray3, 0.45));
  p.px(15, wy, withAlpha(P.gray4, 0.55));

  // leaping sparks off the coal bed (animated drift, inside the box)
  const sx = [7, 11, 9][f];
  const sy = [12, 11, 10][f];
  p.px(sx, sy, P.emberL);
  p.px(sx + 2, sy + 1, lighten(P.emberL, 0.25));
  p.sparkle(sx, sy - 1, P.glint, 1);
  p.aura(10, 18, 5, withAlpha(P.emberL, 0.3), phase, 1); // heat pulse

  p.outline(P.ink);
}, { anchor: [10, 23], fps: 6 });

// 鐵砧 — iron anvil on a stump: glowing hot workpiece + spitting sparks.
defineSprite('town_anvil', 16, 14, (p) => {
  p.softShadow(8, 13, 6, 1.3, 0.3);

  // wooden stump base (graded, ringed grain)
  p.gradV(4, 8, 8, 5, P.wood, P.woodD);
  p.rect(4, 8, 8, 1, P.woodL);
  p.vline(9, 12, 6, darken(P.woodD, 0.2));
  p.vline(9, 12, 9, darken(P.woodD, 0.2));
  p.ellipse(8, 8, 4, 1.4, P.wood);
  p.px(7, 8, lighten(P.wood, 0.12)); // lit grain ring

  // anvil waist + base (darker iron, 3 tones)
  p.rect(5, 6, 6, 2, P.steelD);
  p.rect(6, 6, 4, 3, P.iron);
  p.px(6, 6, P.steel);

  // anvil face (broad top, lighter steel) + horn
  p.rect(2, 3, 11, 2, P.iron);
  p.hline(2, 12, 3, P.steel);
  p.hline(3, 11, 3, P.steelL); // lit top edge
  p.px(3, 3, lighten(P.steelL, 0.2)); // specular glint
  p.line(12, 3, 14, 4, P.iron); // tapering horn
  p.px(13, 3, P.steel);

  // glowing hot workpiece resting on the face
  p.glow(7, 3, 2, withAlpha(P.ember, 0.6), 0.7, 3);
  p.px(6, 3, P.emberL); p.px(7, 3, P.white); p.px(8, 3, P.ember);

  // spark specks + kira spitting up off the face
  p.px(6, 2, P.emberL);
  p.px(9, 1, lighten(P.emberL, 0.2));
  p.px(8, 2, P.white);
  p.sparkle(10, 1, P.glint, 1);

  p.rimLight(P.rim, 0.4, 1, 1);
  p.outline(P.ink);
}, { anchor: [8, 13] });

// 武器架 — weapon rack: sword, bearded axe and barbed spear, each with
// steel sheen, gilt fittings and a glinting edge highlight.
defineSprite('town_weaponrack', 18, 22, (p) => {
  p.softShadow(9, 21, 8, 1.5, 0.28);

  // wooden frame (graded posts + lit rails)
  p.rect(1, 18, 16, 3, P.woodD);
  p.rect(1, 18, 16, 1, P.woodL);
  p.vline(2, 20, 2, P.wood);  p.vline(2, 19, 2, lighten(P.wood, 0.15));
  p.vline(2, 20, 15, P.wood);
  p.rect(1, 6, 16, 2, P.woodD);
  p.hline(1, 16, 6, P.woodL);
  p.speckle(1, 6, 16, 15, darken(P.woodD, 0.1), 6, 31);
  // slot pegs (gilt-tipped)
  p.px(4, 8, P.gold); p.px(9, 8, P.gold); p.px(13, 8, P.gold);

  // sword (left slot) — blade up, lit bevel + point glint
  p.vline(2, 17, 4, P.steelL);
  p.px(4, 2, P.steel);
  p.px(3, 8, lighten(P.steelL, 0.15)); // sheen
  p.star4(4, 2, 2, P.glint, P.white); // kira point glint
  p.hline(3, 5, 16, P.gold); // gilt crossguard
  p.px(4, 18, P.goldL); p.px(5, 18, P.goldD); // pommel

  // axe (middle slot) — bearded head with swept edge
  p.vline(4, 19, 9, P.woodD); // haft
  p.px(9, 4, P.woodL);
  p.rect(8, 5, 3, 2, P.steel); // head top
  p.rect(7, 7, 4, 2, P.steel); // head belly (juts out)
  p.line(7, 6, 6, 9, P.steelL); // sweeping cutting edge
  p.px(6, 7, lighten(P.steelL, 0.2)); // edge glint
  p.px(10, 5, P.steelL); // top sheen

  // spear (right slot) — diamond head, barbs, point spark
  p.vline(2, 19, 13, P.wood);
  p.px(13, 5, P.woodL);
  p.px(13, 2, P.steelL); p.px(13, 3, P.steelL); p.px(13, 4, P.steel);
  p.px(12, 4, P.steelD); p.px(14, 4, P.steelD); // barbs
  p.sparkle(13, 1, P.glint, 1); // point spark

  p.shadeBottom(0.12);
  p.rimLight(P.rim, 0.4, 1, 1);
  p.outline(P.ink);
}, { anchor: [9, 21] });

// 磨刀石 — grindstone wheel on a frame: worn stone, hand crank and a
// bright shower of sparks where the edge bites.
defineSprite('town_grindstone', 14, 16, (p) => {
  p.softShadow(7, 15, 6, 1.2, 0.28);

  // wooden frame legs + cross-brace
  p.line(2, 15, 4, 9, P.woodD);
  p.line(11, 15, 9, 9, P.woodD);
  p.rect(2, 14, 9, 2, P.woodD);
  p.hline(2, 10, 14, lighten(P.woodD, 0.1)); // lit top of base
  p.hline(3, 10, 14, P.wood);
  p.line(4, 12, 9, 12, darken(P.woodD, 0.15)); // brace

  // round stone wheel (graded body + worn rim + lit arc)
  p.circle(7, 8, 5, P.gray3);
  p.circle(7, 8, 4, P.gray2);
  p.ring(7, 8, 5, darken(P.gray2, 0.25));
  p.px(5, 6, P.gray4); p.px(6, 5, P.gray4); // worn highlight arc
  p.px(4, 8, P.gray4); p.px(5, 5, lighten(P.gray4, 0.15));
  p.speckle(4, 5, 6, 6, darken(P.gray2, 0.12), 5, 41); // pitting

  // hub + spoke + axle
  p.line(7, 8, 9, 6, darken(P.gray3, 0.2)); // spoke hint
  p.circle(7, 8, 1, P.iron);
  p.px(7, 8, P.steelL);

  // hand crank (gilt handle knob)
  p.line(7, 8, 11, 6, P.iron);
  p.rect(11, 5, 2, 2, P.gold);
  p.px(11, 5, P.goldL);

  // bright spark shower off the wheel edge
  p.glow(1, 10, 2, withAlpha(P.ember, 0.5), 0.7, 2);
  p.px(2, 9, P.emberL);
  p.px(1, 10, P.white);
  p.px(0, 11, lighten(P.emberL, 0.2));
  p.sparkle(1, 8, P.glint, 1);

  p.rimLight(P.rim, 0.4, 1, 1);
  p.outline(P.ink);
}, { anchor: [7, 15] });
