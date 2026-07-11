// 內容圖鑑（P1）資料層：跨局永久記錄玩家曾發現的武器/被動/Boss/進化配方——未發現的
// 在圖鑑 UI 顯示剪影。純資料模組（不 import 任何 scene/renderer，避免循環依賴）；
// UI 面板讀 codexCounts()/isSeen()/allRecipes()/unlockHintFor()，寫入走 markSeen()。
import { META } from '../state.js';
import { Weapons, Abilities, Enemies } from './registry.js';
import { ACHIEVEMENTS } from './achievements.js';

const KINDS = ['w', 'a', 'boss', 'rec'];

// 防禦：META.codex 或其子 map 缺失時（理論上 state.js 的 loadMeta 已補齊）就地建立
function codexMap(kind) {
  if (!META.codex || typeof META.codex !== 'object') META.codex = { w: {}, a: {}, boss: {}, rec: {} };
  if (!META.codex[kind] || typeof META.codex[kind] !== 'object') META.codex[kind] = {};
  return META.codex[kind];
}

export function markSeen(kind, id) {
  if (!KINDS.includes(kind) || !id) return;
  codexMap(kind)[id] = true;
}

export function isSeen(kind, id) {
  if (!KINDS.includes(kind) || !id) return false;
  return !!codexMap(kind)[id];
}

// 靜態列舉全庫「基礎武器 -> 進化武器」配方（含所需被動）
export function allRecipes() {
  return Weapons.all().filter((d) => d.evolveInto).map((d) => ({ baseId: d.id, evoId: d.evolveInto, reqId: d.evolveReq || null }));
}

// {w:[seen,total], a:[...], boss:[...], rec:[...]} — total 由 registry 動態算，
// seen 只計仍存在於 registry 的 id（避免舊存檔殘留的失效 id 灌水）
export function codexCounts() {
  const recipeBaseIds = new Set(allRecipes().map((r) => r.baseId));
  const wSeen = Object.keys(codexMap('w')).filter((id) => Weapons.has(id)).length;
  const aSeen = Object.keys(codexMap('a')).filter((id) => Abilities.has(id)).length;
  const bossSeen = Object.keys(codexMap('boss')).filter((id) => { const d = Enemies.get(id); return d && d.boss; }).length;
  const recSeen = Object.keys(codexMap('rec')).filter((id) => recipeBaseIds.has(id)).length;
  return {
    w: [wSeen, Weapons.all().length],
    a: [aSeen, Abilities.all().length],
    boss: [bossSeen, Enemies.all().filter((d) => d.boss).length],
    rec: [recSeen, recipeBaseIds.size],
  };
}

// lazy 反查表：kind(weapons/abilities) + id -> 解鎖它的成就名稱（achievements.js 的
// U(kind,id) reward helper會把 kind/id 標記在回傳的函式上，見該檔）
const KIND_TO_UNLOCK_KEY = { w: 'weapons', a: 'abilities' };
let _achIndex = null;
function achIndex() {
  if (_achIndex) return _achIndex;
  _achIndex = new Map();
  for (const a of ACHIEVEMENTS) {
    const r = a.reward;
    if (r && r.kind && r.id) _achIndex.set(r.kind + ':' + r.id, a.name);
  }
  return _achIndex;
}

// 給圖鑑 UI 顯示「怎麼解鎖／怎麼取得」的一句提示
export function unlockHintFor(kind, id) {
  const key = KIND_TO_UNLOCK_KEY[kind];
  if (key) {
    const name = achIndex().get(key + ':' + id);
    if (name) return `成就『${name}』解鎖`;
  }
  if (kind === 'boss') return '擊敗後登錄';
  return '於出擊中取得後登錄';
}
