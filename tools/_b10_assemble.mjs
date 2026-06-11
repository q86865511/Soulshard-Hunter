// One-off: assemble src/art/town_pets_decor.js from the r18-decorpets workflow result.
import { readFileSync, writeFileSync } from 'node:fs';
const raw = readFileSync(process.argv[2], 'utf8');
const root = JSON.parse(raw);
function findBlocks(o) { if (!o || typeof o !== 'object') return null; if (Array.isArray(o.blocks)) return o; for (const k of Object.keys(o)) { const r = findBlocks(o[k]); if (r) return r; } return null; }
const obj = findBlocks(root);
if (!obj) { console.error('no blocks'); process.exit(1); }
const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const order = ['rd_planter', 'rd_rug', 'rd_painting', 'rd_fireplace', 'rd_bookwall', 'rd_trophycase', 'rd_chandelier', 'rd_aquarium', 'rd_impdoll', 'rd_throne', 'pet_slime', 'pet_ghostcat', 'pet_imp'];
const byName = {}; for (const b of obj.blocks) byName[b.name] = b;
const missing = [], parts = [];
for (const n of order) { const b = byName[n]; if (!b) { missing.push(n); continue; } parts.push('// ' + n + (b.ok ? '' : '  [verify:NOT-ok]') + '\n' + decode(b.code).trim()); }
const header = `// R18/B10 — personal-room decorations (10) + mini-pet followers (3). Hand-integrated from a
// Fable(draw)->Opus(verify) workflow. Purely cosmetic; placement/equip logic lives in
// content/room_decor.js + content/pets.js.
import { defineSprite, defineAnim } from '../engine/sprites.js';
import { P, lighten, darken, mix, withAlpha, tint } from '../engine/palette.js';
`;
writeFileSync('src/art/town_pets_decor.js', header + '\n' + parts.join('\n\n') + '\n', 'utf8');
console.log('wrote src/art/town_pets_decor.js with', parts.length, 'sprites');
if (missing.length) console.log('MISSING:', missing.join(', '));
const extra = obj.blocks.filter((b) => !order.includes(b.name)).map((b) => b.name);
if (extra.length) console.log('EXTRA:', extra.join(', '));
