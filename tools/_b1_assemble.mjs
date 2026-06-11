// One-off: assemble src/art/town_outdoor.js from the r18-townart workflow result.
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = process.argv[2];
const raw = readFileSync(SRC, 'utf8');
const root = JSON.parse(raw);
function findBlocks(o) {
  if (!o || typeof o !== 'object') return null;
  if (Array.isArray(o.blocks)) return o;
  for (const k of Object.keys(o)) { const r = findBlocks(o[k]); if (r) return r; }
  return null;
}
const obj = findBlocks(root);
if (!obj) { console.error('no blocks found'); process.exit(1); }

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const order = [
  'town_grass', 'town_grass2', 'town_flowergrass', 'town_dirt', 'town_dirt2', 'town_plaza', 'town_plaza2',
  'town_treeline', 'town_treeline_top',
  'town_fc_church', 'town_fc_guild', 'town_fc_smith', 'town_fc_wardrobe', 'town_fc_hall', 'town_fc_house',
  'town_water', 'town_bridge',
  'town_tree', 'town_tree2', 'town_bush',
  'town_fence_h', 'town_fence_v', 'town_bench', 'town_flowerbed', 'town_fc_stall',
];
const byName = {};
for (const b of obj.blocks) byName[b.name] = b;

let missing = [];
const parts = [];
for (const name of order) {
  const b = byName[name];
  if (!b) { missing.push(name); continue; }
  parts.push('// ' + name + (b.ok ? '' : '  [verify:NOT-ok]') + '\n' + decode(b.code).trim());
}
const extra = obj.blocks.filter((b) => !order.includes(b.name)).map((b) => b.name);

const header = `// R18/B1+B2 — OUTDOOR TOWN sprites. Hand-integrated from a Fable(draw)->Opus(verify)
// workflow (each block was Painter-API verified). Drop-in: makeCamp() points its tileset
// + decor here. Grass/dirt/plaza floor variants, a forest-treeline wall ring, six building
// facades (anchored at the base so VOID collision tiles sit behind them), a shimmering
// stream + bridge, and natural props (trees / bushes / fences / bench / flowerbed / stall).
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';
`;

writeFileSync('src/art/town_outdoor.js', header + '\n' + parts.join('\n\n') + '\n', 'utf8');
console.log('wrote src/art/town_outdoor.js with', parts.length, 'sprites');
if (missing.length) console.log('MISSING:', missing.join(', '));
if (extra.length) console.log('EXTRA (not placed):', extra.join(', '));
