import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha } from '../engine/palette.js';

// 1. Serene cleric — tall mitre, pale-blue & white robe, glowing-shard staff.
defineAnim('npc_priest', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0; // subtle breathe (lift upper body)
  const robeB = darken(P.blueL, 0.28);
  const robe = mix(P.white, P.blueL, 0.45);
  const robeH = lighten(P.white, 0.04);

  // long robe (flares toward the feet), vertical holy silhouette
  p.rect(5, 9 + b, 6, 8 - b, robeB);
  p.rect(4, 14, 8, 4, robeB);
  p.rect(6, 9 + b, 4, 9 - b, robe);
  p.rect(5, 14, 6, 4, robe);
  p.vline(11 + b, 17, 8, robeH);     // lit centre fold
  p.hline(5, 10, 17, darken(robeB, 0.2)); // hem shadow
  // robe trim band
  p.hline(5, 10, 13 + b, lighten(P.blueL, 0.15));

  // tall pointed mitre / hood with gold band
  p.rect(6, 2 + b, 4, 4, mix(P.white, P.blueL, 0.3));
  p.px(7, 1 + b, mix(P.white, P.blueL, 0.3));
  p.px(8, 1 + b, mix(P.white, P.blueL, 0.3));
  p.px(7, 0, lighten(P.white, 0.05)); // peak tip (anchored — keep mitre readable on breathe)
  p.rect(7, 2 + b, 2, 4, lighten(P.white, 0.05)); // lit front of mitre
  p.hline(6, 9, 6 + b, P.gold);      // gold band
  p.px(6, 6 + b, P.goldL);

  // calm shadowed face
  p.rect(6, 6 + b, 4, 3, P.skin);
  p.rect(7, 6 + b, 2, 3, P.skinD); // shadowed under the mitre
  p.px(7, 7 + b, P.ink2);          // serene closed eyes
  p.px(8, 7 + b, P.ink2);

  // slender staff held in both hands, topped with a glowing shard
  p.vline(2 + b, 16, 12, P.woodD);
  p.px(12, 11 + b, lighten(P.wood, 0.1));
  // hands clasped on the staff
  p.px(11, 11 + b, P.skin);
  p.px(11, 13 + b, P.skin);
  // glowing shard head
  p.px(12, 2 + b, P.shardL);
  p.rect(11, 3 + b, 3, 3, P.shard);
  p.px(12, 4 + b, P.shardL);
  p.px(12, 1 + b, withAlpha(P.shardL, 0.5)); // soft glow (no outline tint here)

  p.outline(P.ink);
  // re-glow halo over the outline for the shard
  p.px(12, 1 + b, withAlpha(P.shardL, 0.55));
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 2. Burly guild leader — broad shoulders, big beard, fur-trimmed coat, arms crossed.
defineAnim('npc_guildmaster', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const coatB = darken(P.leather, 0.3);
  const coat = P.leather;
  const coatH = lighten(P.leather, 0.18);

  // wide imposing legs / boots
  p.rect(4, 14, 3, 4, darken(P.woodD, 0.1));
  p.rect(9, 14, 3, 4, darken(P.woodD, 0.1));
  p.px(5, 14, lighten(P.woodD, 0.1));
  p.px(10, 14, lighten(P.woodD, 0.1));

  // heavy coat body, broad
  p.rect(3, 7 + b, 10, 8 - b, coatB);
  p.rect(4, 7 + b, 8, 8 - b, coat);
  p.vline(8 + b, 14, 7, darken(coatB, 0.15)); // centre seam
  p.px(4, 8 + b, coatH);
  p.px(11, 8 + b, coatH);

  // broad shoulders with fur trim collar (bone)
  p.rect(2, 6 + b, 12, 2, coatB);
  p.hline(3, 12, 6 + b, P.bone);
  p.px(3, 7 + b, darken(P.bone, 0.15));
  p.px(12, 7 + b, darken(P.bone, 0.15));
  p.px(5, 6 + b, lighten(P.bone, 0.1));
  p.px(10, 6 + b, lighten(P.bone, 0.1));

  // arms crossed over the chest
  p.rect(4, 10 + b, 8, 2, darken(coat, 0.08));
  p.px(5, 10 + b, P.skin2); // forearm/hand peeking
  p.px(10, 11 + b, P.skin2);
  p.px(6, 11 + b, lighten(coat, 0.06));

  // gold medallion on the chest (centred — only the body breathes vertically)
  p.px(8, 9 + b, P.gold);
  p.px(8, 8 + b, P.goldL);

  // head + big brown beard
  p.rect(6, 3 + b, 4, 4, P.skin);
  p.px(6, 3 + b, P.skinD);
  // big beard (wood / woodD)
  p.rect(5, 6 + b, 6, 2, P.wood);
  p.rect(6, 5 + b, 4, 2, P.wood);
  p.hline(5, 10, 7 + b, P.woodD);
  p.px(7, 6 + b, lighten(P.wood, 0.12));
  // brow / eyes (stern)
  p.px(7, 4 + b, P.ink2);
  p.px(8, 4 + b, P.ink2);
  // hair on top
  p.hline(6, 9, 2 + b, P.woodD);
  p.px(6, 3 + b, P.woodD);
  p.px(9, 3 + b, P.woodD);

  p.outline(P.ink);
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 3. Slim clerk / receptionist — vest over white shirt, ponytail, open ledger + quill.
defineAnim('npc_receptionist', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const vest = P.blueD;
  const vestH = lighten(P.blueD, 0.2);
  const shirt = mix(P.white, P.gray4, 0.15);

  // slim skirt / lower body
  p.rect(6, 13 + b, 4, 5 - b, darken(P.blueD, 0.18));
  p.rect(7, 13 + b, 2, 5 - b, P.blueD);
  p.px(7, 14, P.gray3); // leg/shoe hint
  p.px(8, 17, darken(P.gray1, 0.1));
  p.px(7, 17, darken(P.gray1, 0.1));

  // white shirt torso (narrow frame)
  p.rect(6, 8 + b, 4, 6 - b, shirt);
  p.vline(8 + b, 13, 8, P.white); // lit centre

  // neat vest over the shirt
  p.rect(6, 8 + b, 4, 4, vest);
  p.vline(9 + b, 12, 8, shirt); // open-front gap shows shirt
  p.px(6, 8 + b, vestH);
  p.px(9, 8 + b, vestH);
  // collar
  p.px(7, 8 + b, P.white);
  p.px(8, 8 + b, P.white);

  // arms (holding ledger)
  p.rect(5, 10 + b, 1, 3, shirt);
  p.rect(10, 10 + b, 1, 3, shirt);
  p.px(5, 12 + b, P.skin); // hand
  p.px(10, 12 + b, P.skin);

  // head + high ponytail (wood)
  p.rect(6, 4 + b, 4, 4, P.skin);
  p.px(6, 4 + b, P.skinD);
  // hair cap + ponytail rising behind
  p.hline(6, 9, 3 + b, P.wood);
  p.px(6, 4 + b, P.wood);
  p.px(9, 4 + b, P.wood);
  p.px(10, 2 + b, P.woodL); // high ponytail tail
  p.px(10, 3 + b, P.wood);
  p.px(11, 3 + b, P.wood);
  p.px(11, 2 + b, P.wood);
  // friendly face
  p.px(7, 5 + b, P.ink2);
  p.px(8, 5 + b, P.ink2);
  p.px(8, 6 + b, withAlpha(P.red, 0.4)); // small smile blush

  // open ledger/book with a quill, held out front
  p.rect(9, 12 + b, 4, 3, P.bone);
  p.vline(12, 14 + b, 11, darken(P.bone, 0.2)); // spine/centre
  p.hline(9, 12, 13 + b, P.gray3);   // ruled line
  p.px(12, 12 + b, P.white);
  // quill
  p.line(12, 11 + b, 13, 9 + b, P.white);
  p.px(13, 9 + b, P.gray4);

  p.outline(P.ink);
  p.shadeBottom(0.16);
}, { anchor: [8, 17], fps: 2 });

// 4. Muscular smith — bare arms, soot leather apron, red bandana, hammer on shoulder.
defineAnim('npc_blacksmith', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const apronB = P.woodD;
  const apron = P.leather;
  const apronH = lighten(P.leather, 0.15);

  // sturdy legs / boots
  p.rect(5, 14, 3, 4, darken(P.woodD, 0.15));
  p.rect(8, 14, 3, 4, darken(P.woodD, 0.15));
  p.px(6, 14, lighten(P.woodD, 0.1));
  p.px(9, 14, lighten(P.woodD, 0.1));

  // broad torso under apron
  p.rect(4, 7 + b, 8, 8 - b, P.skin2);
  // soot-stained leather apron over the front
  p.rect(5, 8 + b, 6, 7 - b, apronB);
  p.rect(5, 8 + b, 6, 6 - b, apron);
  p.vline(8 + b, 14, 8, apronH); // lit centre
  p.px(6, 12 + b, darken(apron, 0.25)); // soot smudge
  p.px(9, 10 + b, darken(apron, 0.25));
  p.hline(5, 10, 8 + b, P.bone); // apron strap/top hem
  // apron neck strap
  p.px(7, 7 + b, apronB);
  p.px(9, 7 + b, apronB);

  // bare muscular arms (skin2)
  p.rect(3, 8 + b, 2, 4, P.skin2);
  p.rect(11, 8 + b, 2, 4, P.skin2);
  p.px(3, 8 + b, lighten(P.skin2, 0.12)); // bicep highlight
  p.px(11, 8 + b, lighten(P.skin2, 0.12));
  p.px(3, 11 + b, P.skinD);
  p.px(12, 11 + b, P.skin); // right hand grips hammer haft

  // head
  p.rect(6, 4 + b, 4, 4, P.skin);
  p.px(6, 4 + b, P.skinD);
  p.px(7, 5 + b, P.ink2); // eyes
  p.px(8, 5 + b, P.ink2);
  p.hline(6, 9, 7 + b, P.skinD); // jaw/stubble shade
  // red bandana across the head
  p.hline(6, 9, 4 + b, P.red);
  p.px(6, 4 + b, P.redD);
  p.px(9, 4 + b, P.redL);
  p.px(5, 4 + b, P.redD); // knot tail
  p.px(5, 5 + b, P.red);

  // steel hammer resting on the shoulder (head up by the head, haft to hand)
  p.vline(8 + b, 12, 12, P.wood);     // haft down to right hand
  p.rect(11, 5 + b, 4, 3, P.steel);   // hammer head
  p.rect(11, 5 + b, 4, 1, P.steelL);  // top highlight
  p.px(14, 7 + b, P.steelD);
  p.px(11, 7 + b, P.steelD);

  p.outline(P.ink);
  p.shadeBottom(0.18);
}, { anchor: [8, 17], fps: 2 });

// 5. Elegant seamstress — fitted dress, hair bun, measuring-tape, scissors at hip.
defineAnim('npc_tailor', 16, 18, 2, (p, f) => {
  const b = f === 1 ? -1 : 0;
  const dressB = P.purpleD;
  const dress = P.purple;
  const dressH = P.purpleL;

  // fitted dress flaring to the floor (slender silhouette)
  p.rect(6, 9 + b, 4, 6 - b, dressB);
  p.rect(5, 14, 6, 4, dressB);
  p.rect(7, 9 + b, 2, 6 - b, dress);
  p.rect(6, 14, 4, 4, dress);
  p.vline(13, 17, 8, dressH); // lit centre fold of skirt
  p.hline(5, 10, 17, darken(dressB, 0.2)); // hem shade
  // waist cinch
  p.hline(6, 9, 11 + b, dressH);

  // fitted bodice / shoulders
  p.rect(6, 7 + b, 4, 2, dress);
  p.px(6, 7 + b, dressH);
  p.px(9, 7 + b, dressB);

  // slender arms
  p.vline(8 + b, 11, 5, dress);
  p.vline(8 + b, 11, 10, dress);
  p.px(5, 11 + b, P.skin); // hands
  p.px(10, 11 + b, P.skin);

  // head + neat bun (woodD)
  p.rect(6, 3 + b, 4, 4, P.skin);
  p.px(6, 3 + b, P.skinD);
  // hair framing + top bun
  p.hline(6, 9, 2 + b, P.woodD);
  p.px(5, 4 + b, P.woodD);
  p.px(10, 4 + b, P.woodD);
  p.px(7, 1 + b, P.woodD); // bun on top
  p.px(8, 1 + b, lighten(P.woodD, 0.15));
  p.px(7, 0, P.woodD); // bun crown (anchored — keep silhouette on breathe)
  // elegant face
  p.px(7, 4 + b, P.ink2);
  p.px(8, 4 + b, P.ink2);
  p.px(8, 5 + b, withAlpha(P.red, 0.45)); // lip/blush

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

  p.outline(P.ink);
  p.shadeBottom(0.16);
}, { anchor: [8, 17], fps: 2 });
