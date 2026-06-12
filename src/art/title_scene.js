// R20.1 — title-screen cover art: the enemy DARK TOWER the hero squad is assaulting.
// One big set piece (72×150, 3 frames — the crown eye pulses, rune shards orbit,
// ember windows flicker). Drawn in the same 末日遺跡 language as town_ruin_*:
// obsidian-violet masonry + ember seeps + soul-teal cracks, anime rim light.
// Anchor [0,0]; title.js positions/scales it manually against the horizon.
import { defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

const OBS  = darken(mix(P.ink2, P.void, 0.40), 0.10);   // obsidian body
const OBSL = lighten(OBS, 0.12);                        // lit course
const OBSD = darken(OBS, 0.22);                         // shadow course
const EMB  = P.ember, EMBL = P.emberL;
const CORE = mix(P.magenta, P.redL, 0.45);              // the crown eye

defineAnim('title_tower', 72, 150, 3, (p, f) => {
  const pulse = [0, 1, 2][f % 3];                       // 0 dim · 1 mid · 2 hot

  // ── rocky base mound (y 128-150) ──────────────────────────────────────────
  p.ellipse(36, 146, 34, 9, darken(OBS, 0.12));
  p.ellipse(36, 143, 28, 8, OBS);
  p.speckle(6, 136, 60, 12, OBSD, 18, 7);
  p.speckle(10, 138, 52, 10, mix(OBS, P.gray2, 0.25), 10, 19);
  // fallen slabs at the foot
  p.rect(10, 138, 9, 4, OBSL); p.rect(54, 140, 8, 3, OBSL);
  p.px(14, 137, mix(OBS, P.shard, 0.35)); p.px(58, 139, mix(OBS, P.shard, 0.3));

  // ── flanking ruined spires (silhouette interest) ──────────────────────────
  // left stump (broken)
  p.rect(8, 104, 12, 36, OBSD);
  p.rect(9, 104, 10, 34, OBS);
  p.px(9, 103, OBS); p.px(12, 102, OBS); p.px(16, 103, OBS);     // snapped crown teeth
  p.vline(106, 136, 13, darken(OBSD, 0.1));
  p.px(12, 116, EMB); p.px(15, 124, mix(EMB, OBS, 0.4));          // dying windows
  // right spike (leaning)
  p.rect(52, 96, 11, 44, OBSD);
  p.rect(53, 96, 9, 42, OBS);
  p.line(53, 96, 57, 88, OBS); p.line(57, 88, 60, 95, OBS);       // jagged tip
  p.px(56, 108, EMB); p.px(58, 120, mix(EMB, OBS, 0.45));
  p.vline(98, 136, 60, mix(OBS, EMBL, 0.18));                     // ember rim (right, horizon side)

  // ── main shaft (y 56-132, tapering 40→26) ─────────────────────────────────
  for (let y = 56; y < 132; y++) {
    const k = (y - 56) / 76;                                      // 0 top → 1 bottom
    const hw = 13 + Math.round(k * 7);                            // half-width 13→20
    p.hline(36 - hw, 36 + hw, y, OBS);
  }
  // masonry courses + damage
  for (let y = 62; y < 130; y += 7) {
    const k = (y - 56) / 76, hw = 13 + Math.round(k * 7);
    p.hline(36 - hw + 1, 36 + hw - 1, y, OBSD);
  }
  p.rect(24, 80, 5, 3, OBSD); p.rect(43, 102, 6, 3, OBSD);        // bitten-out bricks
  p.rect(30, 118, 4, 3, darken(OBSD, 0.08));
  // tall ember window slits (staggered; outer two flicker with the pulse)
  const win = (x, y, hot) => { p.vline(y, y + 5, x, hot ? EMBL : EMB); p.px(x, y + 2, hot ? '#ffd9a0' : EMBL); };
  win(30, 70, pulse === 2); win(42, 76, pulse === 1);
  win(27, 92, pulse === 1); win(45, 96, pulse === 2);
  win(32, 110, pulse === 0 ? false : true); win(41, 114, pulse === 2);
  // soul-teal crack veins climbing the shaft
  p.line(26, 126, 30, 104, mix(OBS, P.shard, 0.55));
  p.line(30, 104, 28, 88, mix(OBS, P.shard, 0.40));
  p.line(46, 122, 43, 100, mix(OBS, P.shard, 0.45));
  p.px(29, 96, P.shardL); p.px(45, 110, mix(P.shard, P.shardL, 0.5));
  // rim light: cold teal on the hero-facing left edge, ember on the right
  for (let y = 58; y < 130; y += 2) {
    const k = (y - 56) / 76, hw = 13 + Math.round(k * 7);
    p.px(36 - hw, y, mix(OBS, P.rimCool || P.shard, 0.30));
    p.px(36 + hw, y, mix(OBS, EMBL, 0.22));
  }

  // ── crown (y 30-58): flared battlements around the EYE ───────────────────
  p.rect(20, 50, 32, 8, OBS);
  p.hline(20, 51, 50, OBSL);
  // battlement teeth (some snapped)
  p.rect(20, 44, 4, 7, OBS); p.rect(27, 41, 4, 10, OBS);
  p.rect(41, 42, 4, 9, OBS); p.rect(48, 45, 4, 6, OBS);
  p.px(28, 40, OBSL); p.px(42, 41, OBSL);
  // the EYE — a soul-furnace core; the whole reason the squad is here
  const eyeR = pulse === 2 ? 7 : pulse === 1 ? 6.4 : 6;
  p.glow(36, 44, eyeR + 4, withAlpha(CORE, pulse === 2 ? 0.55 : 0.38));
  p.circle(36, 44, eyeR, darken(CORE, 0.25));
  p.circle(36, 44, eyeR - 1.4, CORE);
  p.ellipse(36, 44, 2.2, eyeR - 2.2, '#1a0a14');                  // slit pupil
  p.px(34, 41, '#ffffff'); p.px(33, 42, withAlpha('#ffffff', 0.7));   // hot glint
  if (pulse === 2) p.sparkle(40, 40, '#ffd9e8');

  // ── spire tips above the crown ────────────────────────────────────────────
  p.line(24, 40, 20, 22, OBS); p.line(20, 22, 23, 21, OBS);       // left horn
  p.line(48, 40, 53, 24, OBS); p.line(53, 24, 50, 22, OBS);       // right horn
  p.line(36, 36, 36, 10, OBSL);                                    // center needle
  p.line(35, 36, 35, 14, OBS);
  p.px(36, 9, CORE); p.px(36, 8, lighten(CORE, 0.3));             // needle beacon
  p.glow(36, 9, 3, withAlpha(CORE, 0.4));

  // ── orbiting rune shards (frame-shifted = slow orbit) ─────────────────────
  const orb = [[14, 34, 52, 30], [12, 30, 56, 36], [16, 38, 54, 26]][pulse];
  p.rect(orb[0], orb[1], 2, 4, mix(P.shard, P.shardL, 0.5));
  p.px(orb[0], orb[1] + 1, P.shardL);
  p.rect(orb[2], orb[3], 2, 4, mix(CORE, '#ffffff', 0.2));
  p.px(orb[2] + 1, orb[3] + 1, lighten(CORE, 0.35));
  p.sparkle(orb[0] + 4, orb[1] - 3, withAlpha('#bffff2', 0.8));

  p.outline(P.ink);
}, { anchor: [0, 0], fps: 3 });
