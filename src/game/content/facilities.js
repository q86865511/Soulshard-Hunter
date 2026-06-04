// Core hub facilities (meta). Built/upgraded with gold; grant passive run
// bonuses or unlock features. Workflow adds more.
//
// Schema:
//   { id, name, desc, maxLevel, icon:'facility_<id>',
//     cost(level) -> gold for NEXT level,
//     applyRun(run, level) -> mutate run/run.stats at run start (optional),
//     onPurchase(meta, level) -> persistent side effects e.g. unlocks (optional) }
import { Facilities } from './registry.js';

const F = (o) => Facilities.register(o);
const cost = (base, growth = 1.95) => (lvl) => Math.round(base * Math.pow(growth, lvl));

F({
  id: 'f_shrine', name: '生命神龕', desc: '每次出擊 生命上限 +7/級', maxLevel: 4, icon: 'facility_f_shrine',
  cost: cost(140), applyRun: (run, l) => { run.stats.maxHp += 7 * l; },
});
F({
  id: 'f_bank', name: '金庫', desc: '金幣獲取 +5%/級', maxLevel: 5, icon: 'facility_f_bank',
  cost: cost(160), applyRun: (run, l) => { run.stats.goldMult *= 1 + 0.05 * l; },
});
F({
  id: 'f_forge', name: '鍛造爐', desc: '提升裝備掉落品質/級', maxLevel: 4, icon: 'facility_f_forge',
  cost: cost(160), applyRun: (run, l) => { run.dropQuality = (run.dropQuality || 0) + l; },
});
F({
  id: 'f_dojo', name: '修練場', desc: '每次出擊 額外 +1 升級選擇/級', maxLevel: 2, icon: 'facility_f_dojo',
  cost: cost(260), applyRun: (run, l) => { run.startBonusLevels = (run.startBonusLevels || 0) + l; },
});
F({
  id: 'f_altar', name: '魂晶祭壇', desc: '每次出擊 起始魂晶 +6/級', maxLevel: 5, icon: 'facility_f_altar',
  cost: cost(150), applyRun: (run, l) => { run.shards += 6 * l; },
});
F({
  id: 'f_arsenal', name: '武器庫', desc: '解鎖更多起始武器', maxLevel: 3, icon: 'facility_f_arsenal',
  cost: cost(200), onPurchase: (meta, level) => {
    const order = ['rapid_rod', 'shotgun_wand', 'cannon_staff'];
    const w = order[level - 1];
    if (w && !meta.unlocked.weapons.includes(w)) meta.unlocked.weapons.push(w);
  },
});
