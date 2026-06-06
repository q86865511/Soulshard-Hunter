import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';

// ════════════════════════════════════════════════════════════════════════
//  TOWN NPCs (set A) — Soulshard Hunter / 魂晶獵手
//  Anime-flavoured townsfolk: priest, guildmaster, receptionist,
//  blacksmith, tailor. Each gets a top-left light source (3–4 tonal steps
//  per material), glowing expressive eyes with white catch-lights, blush,
//  hair sheen, p.rimLight() before outline, and a soft ground shadow for a
//  gentle idle pose. Distinct silhouette + palette per character.
//  Drop-in: every define* name / size / anchor / fps preserved.
// ════════════════════════════════════════════════════════════════════════

// Shared little helper: glowing anime eye = dark base + bright iris glow +
// pure-white catch-light. Drawn at (x,y) for the iris pixel.
function animeEye(p, x, y, iris, dim) {
  p.px(x, y, dim);                       // socket shadow
  p.glow(x, y, 1, iris, 0.5, 2);         // soft iris glow
  p.px(x, y, iris);                      // iris core
  p.px(x, y - 1, P.glint);               // top catch-light (top-left light)
}

// 1. Serene cleric — tall mitre, pale-blue & white robe, glowing-shard staff.
//    Anime: holy aura, sheened robe folds, gentle closed-eye smile, halo kira.
defineAnim('npc_priest', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0; // subtle breathe (lift upper body)
  const robeB = darken(P.blueL, 0.30);
  const robe = mix(P.white, P.blueL, 0.45);
  const robeH = lighten(P.white, 0.05);
  const phase = f === 1 ? 0.5 : 0.0;

  // soft ground contact shadow (gentle idle stance)
  p.softShadow(8, 17, 5, 2, 0.34);

  // faint holy aura behind the cleric
  p.glow(8, 8 + b, 6, withAlpha(P.holy, 0.10), 0.4, 3);

  // long robe (flares toward the feet), vertical holy silhouette
  p.rect(5, 9 + b, 6, 8 - b, robeB);
  p.rect(4, 14, 8, 4, robeB);
  p.gradV(6, 9 + b, 4, 9 - b, robe, mix(robe, robeB, 0.5)); // shaded toward hem
  p.rect(5, 14, 6, 4, robe);
  p.vline(11 + b, 17, 8, robeH);          // lit centre fold
  p.vline(6, 17, 11 + b, lighten(robe, 0.06)); // secondary light fold
  p.hline(5, 10, 17, darken(robeB, 0.22)); // hem shadow
  // robe trim band (cool holy accent)
  p.hline(5, 10, 13 + b, lighten(P.hiSky, 0.02));
  p.px(5, 13 + b, P.rimCool);

  // tall pointed mitre / hood with gold band
  p.rect(6, 2 + b, 4, 4, mix(P.white, P.blueL, 0.32));
  p.px(7, 1 + b, mix(P.white, P.blueL, 0.32));
  p.px(8, 1 + b, mix(P.white, P.blueL, 0.32));
  p.px(7, 0, lighten(P.white, 0.06));     // peak tip (anchored)
  p.rect(7, 2 + b, 2, 4, lighten(P.white, 0.06)); // lit front of mitre
  p.px(6, 2 + b, P.rimCool);              // cool rim on the mitre edge
  p.hline(6, 9, 6 + b, P.gold);           // gold band
  p.px(6, 6 + b, P.goldL);
  p.px(8, 6 + b, P.goldL);
  p.px(7, 5 + b, withAlpha(P.holyL, 0.6)); // tiny gem on the mitre band

  // calm shadowed face with gentle blush + serene closed eyes
  p.rect(6, 6 + b, 4, 3, P.skin);
  p.rect(7, 6 + b, 2, 3, P.skinD);        // shadowed under the mitre
  p.line(7, 7 + b, 7, 7 + b, P.ink2);     // serene closed eyes (soft lashes)
  p.px(7, 7 + b, P.ink2);
  p.px(8, 7 + b, P.ink2);
  p.px(6, 8 + b, withAlpha(P.sakura, 0.45)); // blush
  p.px(9, 8 + b, withAlpha(P.sakura, 0.45));

  // slender staff held in both hands, topped with a glowing shard
  p.vline(2 + b, 16, 12, P.woodD);
  p.px(2 + b, 13, lighten(P.wood, 0.12)); // haft sheen
  p.px(12, 11 + b, lighten(P.wood, 0.10));
  // hands clasped on the staff
  p.px(11, 11 + b, P.skin);
  p.px(11, 13 + b, P.skin);
  // glowing shard head with bright halo
  p.glow(12, 3 + b, 3, withAlpha(P.shardL, 0.7), 0.55, 3);
  p.px(12, 2 + b, P.shardL);
  p.rect(11, 3 + b, 3, 3, P.shard);
  p.px(12, 4 + b, P.shardL);
  p.px(11, 3 + b, lighten(P.shardL, 0.05));
  p.px(12, 1 + b, withAlpha(P.shardL, 0.5));

  p.rimLight(P.rimCool, 0.5);
  p.outline(P.ink);
  // re-glow halo over the outline + kira sparkle for the shard
  p.glow(12, 3 + b, 3, withAlpha(P.shardL, 0.45), 0.4, 2);
  p.star4(12, 2 + b, 2, P.glint, P.shardL);
  if (f === 1) p.sparkle(7, 4 + b, P.holyL, 1); // soft holy twinkle
  p.aura(8, 8 + b, 5, withAlpha(P.holy, 0.18), phase, 1);
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 2. Burly guild leader — broad shoulders, big beard, fur-trimmed coat, arms crossed.
//    Anime: commanding silhouette, glowing amber eyes, gold medallion glint, beard sheen.
defineAnim('npc_guildmaster', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const coatB = darken(P.leather, 0.32);
  const coat = P.leather;
  const coatH = lighten(P.leather, 0.20);

  // soft ground contact shadow
  p.softShadow(8, 17, 6, 2, 0.36);

  // wide imposing legs / boots
  p.rect(4, 14, 3, 4, darken(P.woodD, 0.12));
  p.rect(9, 14, 3, 4, darken(P.woodD, 0.12));
  p.px(5, 14, lighten(P.woodD, 0.12));
  p.px(10, 14, lighten(P.woodD, 0.12));
  p.hline(4, 6, 17, darken(P.woodD, 0.25)); // boot sole shade
  p.hline(9, 11, 17, darken(P.woodD, 0.25));

  // heavy coat body, broad (gradient for volume)
  p.rect(3, 7 + b, 10, 8 - b, coatB);
  p.gradV(4, 7 + b, 8, 8 - b, coat, darken(coat, 0.14));
  p.vline(8 + b, 14, 7, darken(coatB, 0.18)); // centre seam
  p.px(4, 8 + b, coatH);
  p.px(11, 8 + b, darken(coat, 0.06));
  p.px(4, 9 + b, lighten(coat, 0.08));        // lit left lapel

  // broad shoulders with fur trim collar (bone)
  p.rect(2, 6 + b, 12, 2, coatB);
  p.hline(3, 12, 6 + b, P.bone);
  p.px(3, 7 + b, darken(P.bone, 0.16));
  p.px(12, 7 + b, darken(P.bone, 0.16));
  p.px(5, 6 + b, lighten(P.bone, 0.10));
  p.px(10, 6 + b, lighten(P.bone, 0.10));
  p.px(4, 6 + b, lighten(P.bone, 0.12));      // fur catch-light (top-left)

  // arms crossed over the chest
  p.rect(4, 10 + b, 8, 2, darken(coat, 0.10));
  p.px(5, 10 + b, P.skin2); // forearm/hand peeking
  p.px(10, 11 + b, P.skin2);
  p.px(6, 11 + b, lighten(coat, 0.07));
  p.px(4, 10 + b, lighten(coat, 0.10));       // lit arm fold

  // gold medallion on the chest, glowing
  p.glow(8, 9 + b, 1, withAlpha(P.goldL, 0.7), 0.5, 2);
  p.px(8, 9 + b, P.gold);
  p.px(8, 8 + b, P.goldL);

  // head + big brown beard
  p.rect(6, 3 + b, 4, 4, P.skin);
  p.px(6, 3 + b, P.skinD);
  // big beard (wood / woodD) with sheen
  p.rect(5, 6 + b, 6, 2, P.wood);
  p.rect(6, 5 + b, 4, 2, P.wood);
  p.hline(5, 10, 7 + b, P.woodD);
  p.px(7, 6 + b, lighten(P.wood, 0.14));      // beard sheen
  p.px(6, 5 + b, lighten(P.wood, 0.10));
  // glowing amber stern eyes + heavy brow
  p.px(7, 3 + b, P.woodD);                     // brow line
  p.px(8, 3 + b, P.woodD);
  animeEye(p, 7, 4 + b, P.goldL, P.skinD);
  animeEye(p, 8, 4 + b, P.goldL, P.skinD);
  // hair on top with highlight
  p.hline(6, 9, 2 + b, P.woodD);
  p.px(6, 3 + b, P.woodD);
  p.px(9, 3 + b, P.woodD);
  p.px(7, 2 + b, lighten(P.wood, 0.10));       // hair sheen

  p.rimLight(P.rim, 0.55);
  p.outline(P.ink);
  p.glow(8, 9 + b, 1, withAlpha(P.goldL, 0.4), 0.4, 2); // medallion re-glow
  if (f === 0) p.sparkle(8, 8 + b, P.glint, 1);          // medallion glint
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 3. Slim clerk / receptionist — vest over white shirt, ponytail, open ledger + quill.
//    Anime: big sparkly eyes, cheerful blush, ribbon-tied ponytail with sheen, kira.
defineAnim('npc_receptionist', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const vest = P.blueD;
  const vestH = lighten(P.blueD, 0.22);
  const shirt = mix(P.white, P.gray4, 0.15);

  // soft ground contact shadow
  p.softShadow(8, 17, 4, 2, 0.32);

  // slim skirt / lower body
  p.rect(6, 13 + b, 4, 5 - b, darken(P.blueD, 0.20));
  p.gradV(7, 13 + b, 2, 5 - b, P.blueD, darken(P.blueD, 0.12));
  p.px(7, 14, P.gray3); // leg/shoe hint
  p.px(8, 17, darken(P.gray1, 0.12));
  p.px(7, 17, darken(P.gray1, 0.12));

  // white shirt torso (narrow frame)
  p.rect(6, 8 + b, 4, 6 - b, shirt);
  p.vline(8 + b, 13, 8, P.white); // lit centre

  // neat vest over the shirt
  p.rect(6, 8 + b, 4, 4, vest);
  p.vline(9 + b, 12, 8, shirt); // open-front gap shows shirt
  p.px(6, 8 + b, vestH);
  p.px(9, 8 + b, vestH);
  p.px(6, 9 + b, lighten(vest, 0.10)); // lit lapel edge
  // collar
  p.px(7, 8 + b, P.white);
  p.px(8, 8 + b, P.white);
  p.px(7, 9 + b, P.neonL); // dainty neon brooch

  // arms (holding ledger)
  p.rect(5, 10 + b, 1, 3, shirt);
  p.rect(10, 10 + b, 1, 3, shirt);
  p.px(5, 12 + b, P.skin); // hand
  p.px(10, 12 + b, P.skin);

  // head + high ponytail (wood) with ribbon
  p.rect(6, 4 + b, 4, 4, P.skin);
  p.px(6, 4 + b, P.skinD);
  // hair cap + ponytail rising behind, with sheen
  p.hline(6, 9, 3 + b, P.wood);
  p.px(6, 4 + b, P.wood);
  p.px(9, 4 + b, P.wood);
  p.px(7, 3 + b, P.woodL); // top-left hair sheen
  p.px(10, 2 + b, P.woodL); // high ponytail tail
  p.px(10, 3 + b, P.wood);
  p.px(11, 3 + b, P.wood);
  p.px(11, 2 + b, P.wood);
  p.px(10, 4 + b, P.sakura); // sakura ribbon tie
  p.px(11, 1 + b, P.woodL);  // ponytail flick highlight
  // big friendly anime eyes + blush smile
  animeEye(p, 7, 5 + b, P.blueL, P.skinD);
  animeEye(p, 8, 5 + b, P.blueL, P.skinD);
  p.px(6, 6 + b, withAlpha(P.sakura, 0.55)); // blush
  p.px(9, 6 + b, withAlpha(P.sakura, 0.55));
  p.px(8, 6 + b, withAlpha(P.red, 0.45));    // small smile

  // open ledger/book with a quill, held out front
  p.rect(9, 12 + b, 4, 3, P.bone);
  p.vline(12, 14 + b, 11, darken(P.bone, 0.22)); // spine/centre
  p.hline(9, 12, 13 + b, P.gray3);   // ruled line
  p.px(12, 12 + b, P.white);
  p.px(9, 12 + b, lighten(P.bone, 0.08)); // lit page corner
  // quill
  p.line(12, 11 + b, 13, 9 + b, P.white);
  p.px(13, 9 + b, P.sakuraL);

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  if (f === 1) p.star4(11, 1 + b, 1, P.glint, P.sakuraL); // cheerful kira
  p.shadeBottom(0.16);
}, { anchor: [8, 17], fps: 2 });

// 4. Muscular smith — bare arms, soot leather apron, red bandana, hammer on shoulder.
//    Anime: confident grin, fiery glowing eyes, ember spark, steel specular hammer.
defineAnim('npc_blacksmith', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const apronB = P.woodD;
  const apron = P.leather;
  const apronH = lighten(P.leather, 0.18);

  // soft ground contact shadow
  p.softShadow(8, 17, 5, 2, 0.36);

  // sturdy legs / boots
  p.rect(5, 14, 3, 4, darken(P.woodD, 0.16));
  p.rect(8, 14, 3, 4, darken(P.woodD, 0.16));
  p.px(6, 14, lighten(P.woodD, 0.12));
  p.px(9, 14, lighten(P.woodD, 0.12));

  // broad torso under apron (with bicep volume)
  p.rect(4, 7 + b, 8, 8 - b, P.skin2);
  p.gradV(4, 7 + b, 8, 3, lighten(P.skin2, 0.06), P.skin2);
  // soot-stained leather apron over the front
  p.rect(5, 8 + b, 6, 7 - b, apronB);
  p.gradV(5, 8 + b, 6, 6 - b, apron, darken(apron, 0.12));
  p.vline(8 + b, 14, 8, apronH); // lit centre
  p.px(6, 12 + b, darken(apron, 0.28)); // soot smudge
  p.px(9, 10 + b, darken(apron, 0.28));
  p.speckle(5, 9 + b, 6, 5, darken(apron, 0.22), 4, 7); // soot specks (seeded)
  p.hline(5, 10, 8 + b, P.bone); // apron strap/top hem
  // apron neck strap
  p.px(7, 7 + b, apronB);
  p.px(9, 7 + b, apronB);

  // bare muscular arms (skin2)
  p.rect(3, 8 + b, 2, 4, P.skin2);
  p.rect(11, 8 + b, 2, 4, P.skin2);
  p.px(3, 8 + b, lighten(P.skin2, 0.14)); // bicep highlight
  p.px(11, 8 + b, lighten(P.skin2, 0.14));
  p.px(3, 11 + b, P.skinD);
  p.px(12, 11 + b, P.skin); // right hand grips hammer haft

  // head + confident grin
  p.rect(6, 4 + b, 4, 4, P.skin);
  p.px(6, 4 + b, P.skinD);
  animeEye(p, 7, 5 + b, P.redL, P.skinD); // fiery glowing eyes
  animeEye(p, 8, 5 + b, P.redL, P.skinD);
  p.px(7, 6 + b, P.skinD);   // grin line
  p.px(8, 6 + b, withAlpha(P.white, 0.5)); // toothy grin glint
  p.hline(6, 9, 7 + b, P.skinD); // jaw/stubble shade
  // red bandana across the head
  p.hline(6, 9, 4 + b, P.red);
  p.px(6, 4 + b, P.redD);
  p.px(9, 4 + b, P.redL);
  p.px(7, 4 + b, lighten(P.red, 0.10)); // bandana sheen
  p.px(5, 4 + b, P.redD); // knot tail
  p.px(5, 5 + b, P.red);

  // steel hammer resting on the shoulder
  p.vline(8 + b, 12, 12, P.wood);     // haft down to right hand
  p.px(8 + b, 9, lighten(P.wood, 0.12)); // haft sheen
  p.rect(11, 5 + b, 4, 3, P.steel);   // hammer head
  p.rect(11, 5 + b, 4, 1, P.steelL);  // top highlight
  p.px(14, 7 + b, P.steelD);
  p.px(11, 7 + b, P.steelD);
  p.px(11, 5 + b, P.glint);           // bright specular spark on the steel

  p.rimLight(P.rim, 0.55);
  p.outline(P.ink);
  // ember spark drifting from the forge-warm smith
  if (f === 1) {
    p.glow(13, 4 + b, 1, withAlpha(P.redL, 0.6), 0.5, 2);
    p.sparkle(13, 3 + b, P.goldL, 1);
  } else {
    p.sparkle(14, 4 + b, P.redL, 1);
  }
  p.star4(13, 5 + b, 1, P.glint, P.steelL); // hammer kira
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 5. Elegant seamstress — fitted dress, hair bun, measuring-tape, scissors at hip.
//    Anime: graceful pose, large violet eyes, glossy lips/blush, flowing dress sheen, sakura.
defineAnim('npc_tailor', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const dressB = P.purpleD;
  const dress = P.purple;
  const dressH = P.purpleL;
  const phase = f === 1 ? 0.5 : 0.0;

  // soft ground contact shadow
  p.softShadow(8, 17, 5, 2, 0.32);

  // fitted dress flaring to the floor (slender silhouette)
  p.rect(6, 9 + b, 4, 6 - b, dressB);
  p.rect(5, 14, 6, 4, dressB);
  p.gradV(7, 9 + b, 2, 6 - b, dress, darken(dress, 0.10));
  p.rect(6, 14, 4, 4, dress);
  p.vline(13, 17, 8, dressH); // lit centre fold of skirt
  p.vline(6, 17, 14, lighten(dress, 0.06)); // secondary fold light
  p.hline(5, 10, 17, darken(dressB, 0.22)); // hem shade
  // waist cinch with sakura accent
  p.hline(6, 9, 11 + b, dressH);
  p.px(8, 11 + b, P.sakuraL);

  // fitted bodice / shoulders
  p.rect(6, 7 + b, 4, 2, dress);
  p.px(6, 7 + b, dressH);
  p.px(9, 7 + b, dressB);
  p.px(7, 7 + b, lighten(dress, 0.08)); // bodice sheen

  // slender arms
  p.vline(8 + b, 11, 5, dress);
  p.vline(8 + b, 11, 10, dress);
  p.px(5, 11 + b, P.skin); // hands
  p.px(10, 11 + b, P.skin);

  // head + neat bun (woodD) with sheen
  p.rect(6, 3 + b, 4, 4, P.skin);
  p.px(6, 3 + b, P.skinD);
  // hair framing + top bun
  p.hline(6, 9, 2 + b, P.woodD);
  p.px(5, 4 + b, P.woodD);
  p.px(10, 4 + b, P.woodD);
  p.px(7, 1 + b, P.woodD); // bun on top
  p.px(8, 1 + b, lighten(P.woodD, 0.16));
  p.px(7, 0, P.woodD); // bun crown (anchored)
  p.px(7, 2 + b, lighten(P.wood, 0.10)); // hair sheen
  p.px(9, 1 + b, P.sakura);              // sakura hairpin
  // large violet anime eyes + glossy lip & blush
  animeEye(p, 7, 4 + b, P.purpleL, P.skinD);
  animeEye(p, 8, 4 + b, P.purpleL, P.skinD);
  p.px(6, 5 + b, withAlpha(P.sakura, 0.5)); // blush
  p.px(9, 5 + b, withAlpha(P.sakura, 0.5));
  p.px(8, 5 + b, withAlpha(P.red, 0.5));    // glossy lip

  // yellow measuring-tape draped around the neck (down both sides of chest)
  p.px(6, 7 + b, P.gold);
  p.px(6, 8 + b, P.goldL);
  p.px(6, 9 + b, P.gold);
  p.px(9, 7 + b, P.gold);
  p.px(9, 8 + b, P.goldL);
  p.px(9, 9 + b, P.gold);
  p.px(7, 7 + b, P.goldD); // tape behind neck

  // small scissors at the hip
  p.px(10, 12 + b, P.steelL);
  p.px(11, 12 + b, P.steel);
  p.px(11, 13, P.steelD);
  p.px(10, 13, P.steel);
  p.px(10, 12 + b, P.glint); // scissor glint

  p.rimLight(P.rim, 0.5);
  p.outline(P.ink);
  // drifting sakura petal for a graceful idle accent
  if (f === 1) {
    p.px(3, 6 + b, withAlpha(P.sakura, 0.8));
    p.px(2, 7 + b, withAlpha(P.sakuraL, 0.7));
  } else {
    p.px(3, 9 + b, withAlpha(P.sakura, 0.7));
  }
  p.star4(9, 1 + b, 1, P.glint, P.sakuraL); // hairpin kira
  p.aura(8, 9 + b, 4, withAlpha(P.sakura, 0.10), phase, 1);
  p.shadeBottom(0.16);
}, { anchor: [8, 17], fps: 2 });
