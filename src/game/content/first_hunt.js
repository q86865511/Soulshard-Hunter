// R33: data + pure progression rules. No state/DOM imports: usable by Node tests.
import { BALANCE } from '../balance.js';

export const FIRST_HUNT_MODE = 'first_hunt';
// Private encounter definition: never enters the standard/endless random boss pools.
export const FIRST_HUNT_BOSS = {
  id: 'first_hunt_keeper', name: '守火者・失落誓衛', sprite: 'fh_boss',
  boss: true, ai: 'chase', hp: BALANCE.FIRST_HUNT.BOSS_HP, speed: BALANCE.FIRST_HUNT.BOSS_SPEED,
  damage: BALANCE.FIRST_HUNT.BOSS_DAMAGE, radius: 12, scale: 1.6, xp: 0, gold: 0,
  bossMoves: [], knockbackResist: 0.9, bloodColor: '#80e5d8',
};
export const FIRST_HUNT_HEROES = [
  { id: 'hunter', name: '魂晶獵手', role: '收集・蓄能爆發', color: '#80e5d8',
    skill: '魂晶共鳴', verb: '拾取經驗魂晶蓄能，滿格自動向四周釋放魂爆。',
    tip: '繞回敵群留下的魂晶，讓收集成為下一波攻勢。' },
  { id: 'pyro', name: '烈焰術士', role: '擊殺・連鎖燃燒', color: '#e8a1e8',
    skill: '餘燼連鎖', verb: '擊殺四名敵人，在最後擊殺處引爆並點燃周圍敵人。',
    tip: '沿敵群邊緣走位，讓餘燼在密集處接續引爆。' },
  { id: 'guardian', name: '晶岩守衛', role: '近身・蓄力反擊', color: '#a9cffa',
    skill: '晶岩反震', verb: '靠近敵人或受傷蓄力，滿格震退敵群並短暫護身。',
    tip: '掌握護身與衝刺的空檔；蓄力不需要刻意受傷。' },
];
export const FIRST_HUNT_RESTORATIONS = [
  { name: '重燃魂火', sprite: 'fh_brazier_lit', desc: '廣場營火重燃；初獵拾取範圍永久 +12。' },
  { name: '升起獵旗', sprite: 'fh_banner', desc: '掛起獵旗；永久解鎖烈焰術士。', hero: 'pyro' },
  { name: '立起戰利品', sprite: 'fh_trophy', desc: '展示守火者頭盔；永久解鎖晶岩守衛。', hero: 'guardian' },
];
export const FIRST_HUNT_UPGRADES = [
  { id: 'resonance', name: '共鳴增幅', desc: '代表能力傷害與範圍增強；更快清出移動空間。' },
  { id: 'weapon', name: '淬鍊武器', desc: '起始武器升兩級；滿級部分轉為傷害，最高 +15%。' },
  { id: 'vigor', name: '獵手餘裕', desc: '生命上限 +25 並回復；拾取範圍 +12。' },
];
export const isFirstHunt = (run) => run?.mode === FIRST_HUNT_MODE;
export const firstHuntHero = (id) => FIRST_HUNT_HEROES.find((h) => h.id === id) || FIRST_HUNT_HEROES[0];
export function firstHuntProgress(meta) {
  const raw = meta?.firstHunt || {};
  const completed = FIRST_HUNT_HEROES.map((h) => h.id).filter((id) => Array.isArray(raw.completed) && raw.completed.includes(id));
  const restored = Number.isInteger(raw.restored) ? Math.max(0, Math.min(completed.length, raw.restored)) : 0;
  return { completed, restored, seals: completed.length - restored,
    attempts: Number.isSafeInteger(raw.attempts) ? Math.max(0, raw.attempts) : 0 };
}
export function settleFirstHunt(meta, run) {
  if (!isFirstHunt(run) || run.firstHuntBanked) return false;
  run.firstHuntBanked = true;
  const p = firstHuntProgress(meta);
  const validHero = FIRST_HUNT_HEROES.some((h) => h.id === run.characterId);
  const earned = validHero && run.result === 'clear' && run.firstHuntBossDefeated === true && !run.cheated && !p.completed.includes(run.characterId);
  if (earned) p.completed.push(run.characterId);
  meta.firstHunt = { completed: p.completed, restored: p.restored, attempts: p.attempts + 1 };
  run.firstHuntReceipt = { earned, repeated: !earned && p.completed.includes(run.characterId), cheated: !!run.cheated };
  return true;
}
export function restoreFirstHuntCamp(meta) {
  const p = firstHuntProgress(meta);
  if (p.seals < 1 || p.restored >= FIRST_HUNT_RESTORATIONS.length) return null;
  const project = FIRST_HUNT_RESTORATIONS[p.restored];
  meta.firstHunt = { completed: p.completed, restored: p.restored + 1, attempts: p.attempts };
  if (project.hero) {
    meta.unlocked ||= {};
    meta.unlocked.characters = Array.isArray(meta.unlocked.characters) ? meta.unlocked.characters : ['hunter'];
    if (!meta.unlocked.characters.includes(project.hero)) meta.unlocked.characters.push(project.hero);
  }
  return project;
}

// Authored sight lines and a clear central aisle; decoration is non-colliding.
// Geometry uses the existing crypt tiles; no gameplay RNG is consumed.
export function createFirstHuntMap(biome) {
  const { MAP_W: tw, MAP_H: th } = BALANCE.FIRST_HUNT;
  const tiles = new Uint8Array(tw * th), floorVar = new Uint8Array(tw * th);
  const patches = [[8, 8, 5, 3], [35, 9, 7, 4], [13, 27, 8, 4], [38, 28, 4, 5], [6, 19, 3, 5]];
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const i = y * tw + x;
    tiles[i] = x < 2 || y < 2 || x >= tw - 2 || y >= th - 2 ? 1 : 0;
    floorVar[i] = patches.some(([px, py, rx, ry]) => ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2 < 1) ? 1 : 0;
    // A single authored aisle, not a repeating per-tile motif.
    if (Math.abs(x - tw / 2) < 2 && y > 8 && y < th - 6) floorVar[i] = 2;
  }
  const center = { x: tw * 8, y: th * 8 };
  const decor = [
    { x: center.x, y: center.y - 82, sprite: 'fh_altar' },
    { x: center.x - 104, y: center.y - 54, sprite: 'fh_sarcophagus' },
    { x: center.x + 112, y: center.y - 37, sprite: 'fh_sarcophagus' },
    { x: center.x - 76, y: center.y + 78, sprite: 'fh_candles' },
    { x: center.x + 80, y: center.y + 92, sprite: 'fh_candles' },
    { x: center.x - 169, y: center.y + 8, sprite: 'fh_banner' },
    { x: center.x + 173, y: center.y - 9, sprite: 'fh_banner' },
  ];
  return { tw, th, tiles, floorVar, decor, decals: [], biome, center,
    entrance: { x: center.x, y: center.y + 30 },
    tileset: { floor: ['floor_crypt', 'floor2_crypt', 'floorx_crypt'], wall: 'wall_crypt', wallTop: 'walltop_crypt' },
    chests: [], hazards: [], npcs: [], hiddenRooms: [], featureRooms: [] };
}
