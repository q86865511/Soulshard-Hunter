// tools/bot/strategy/move.mjs
// 純 ESM、零 Node API — 可在瀏覽器 import('/tools/bot/strategy/move.mjs')，也可被 Node 測試載入。
// 對應 specs/bot-balance-sim/requirements.md R3（走位策略）、R9（策略層可重現）、
// design.md「介面與資料模型」strategy/move.mjs 與「測試策略」R3 六列。
//
// decideMove(view) → { move:{x,y}, dash:boolean }
//   view = { x, y, hpFrac, dashReady, ts, enemies:[{x,y,radius,boss,hpFrac,dist}],
//            pickups:[{x,y,type}], blocked(wx,wy)→bool, seed }
//
// 演算法：16 個候選方向（22.5° 一格）＋零向量，各自評分後取最高分；
//   ・威脅斥力：每個敵人以「遠離該敵」為佳，權重隨距離反比、boss 與大半徑更重。
//   ・pickup 引力：僅在最近敵人距離 > PICKUP_GATE_TS*ts 時生效（安全才去撿），
//     且拾取物方向與最近敵人方向夾角 ≥ 60° 才算（同向的 pickup＝往敵人身上走）。
//   ・牆面取樣：沿候選方向每 0.5*ts 取樣到 3*ts，每點連同體寬左右各一點；近端被擋＝淘汰，
//     遠端被擋＝罰分。
//   ・同分 tie-break：makeRng(view.seed)，故同 seed 同 view 必得同結果（R9）。
// 純函式：不讀 Date/Math.random、不改動傳入物件。

import { makeRng } from './rng.mjs';

/** 候選方向數（22.5° 一格）。 */
const DIR_COUNT = 16;

/** 預先算好的單位候選方向（模組載入期算一次，內容不可變）。 */
const DIRS = Array.from({ length: DIR_COUNT }, (_, i) => {
  const a = (i * 2 * Math.PI) / DIR_COUNT;
  return { x: Math.cos(a), y: Math.sin(a) };
});

const BOSS_WEIGHT = 2.2;        // boss 的額外威脅倍率
const THREAT_GAIN = 1;          // 斥力總增益
const PICKUP_GAIN = 0.6;        // 引力總增益（永遠小於斥力，且另有安全閘）
const PICKUP_GATE_TS = 1.5;     // 最近敵人須 > 1.5*ts（24px）才會去撿：撿拾磁吸只有 26px，
                                // 閘門開太遠等於在敵人臉上繞路
const LURE_MAX_COS = 0.5;       // pickup 方向與最近敵人方向的 cos 上限（>0.5＝夾角 <60°，同向不撿）
const PROBE_STEP_TS = 0.5;      // 牆面取樣間距（tile 倍數）
const PROBE_MAX_TS = 3;         // 牆面取樣最遠距離（tile 倍數）
const PROBE_NEAR_TS = 1.5;      // 近端範圍：此距離內被擋一律淘汰
const PROBE_HALF_TS = 0.4;      // 取樣走廊半寬（玩家半徑 5，src/game/player.js:33，取 0.4*ts 留餘裕）
const WALL_PENALTY_FAR = 2;     // 遠端被擋的罰分（每個被擋的取樣距離各罰一次）
const WALL_BLEED = 0.5;         // 牆罰擴散到左右相鄰方向的比例：擦著牆角切過去的候選，
                                // 取樣線剛好閃過牆但實際會被卡住，要一併壓低
const IDLE_PENALTY = 0.02;      // 四面皆牆時「原地不動」的微罰
const DASH_HP = 0.35;           // 低血閾值
const DASH_RANGE = 24;          // 近敵閾值（絕對像素，不隨 ts 縮放：衝刺距離是固定的）
const TIE_EPS = 1e-9;           // 同分判定容差

/** 安全取數字，非有限值時退回 fallback。 */
function num(v, fallback) {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/**
 * 沿候選方向取樣牆面。每個取樣距離檢查「中心＋垂直左右各一點」三點——
 * 單點射線會從一格厚的牆旁擦過（玩家有體積，實際會被卡住）。
 * @returns {number|null} null＝近端撞牆（該方向必須淘汰）；否則為遠端罰分總額（≥0）。
 */
function probeWalls(blocked, px, py, dx, dy, ts) {
  const half = PROBE_HALF_TS * ts;
  const ox = -dy * half; // 與行進方向垂直的體寬偏移
  const oy = dx * half;
  const near = PROBE_NEAR_TS * ts;
  const steps = Math.round(PROBE_MAX_TS / PROBE_STEP_TS);
  let penalty = 0;
  for (let k = 1; k <= steps; k++) {
    const d = k * PROBE_STEP_TS * ts;
    const cx = px + dx * d;
    const cy = py + dy * d;
    if (!blocked(cx, cy) && !blocked(cx + ox, cy + oy) && !blocked(cx - ox, cy - oy)) continue;
    // 近端被擋必須淘汰：固定罰分會被 dist→0 的敵人斥力壓過，結果是直直撞牆。
    if (d <= near) return null;
    penalty += WALL_PENALTY_FAR;
  }
  return penalty;
}

/**
 * 決定這一格的移動輸入。
 * @param {object} view 見檔頭 view 結構。
 * @returns {{move:{x:number,y:number}, dash:boolean}} move 長度 ≤ 1（零向量允許）。
 */
export function decideMove(view) {
  const v = view || {};
  const px = num(v.x, 0);
  const py = num(v.y, 0);
  const ts = Math.max(1, num(v.ts, 16));
  const hpFrac = num(v.hpFrac, 1);
  const enemies = Array.isArray(v.enemies) ? v.enemies : [];
  const pickups = Array.isArray(v.pickups) ? v.pickups : [];
  const blocked = typeof v.blocked === 'function' ? v.blocked : () => false;

  // 場上既無敵人也無拾取物 → 零向量、不衝刺（R3 空場條款）。
  if (enemies.length === 0 && pickups.length === 0) {
    return { move: { x: 0, y: 0 }, dash: false };
  }

  // --- 預處理：敵人斥力項與最近敵距 ---
  const threats = [];
  let nearestEnemy = Infinity;
  let nearFoeX = 0; // 指向最近敵人的單位向量（pickup 同向判定用）
  let nearFoeY = 0;
  let hasNearFoe = false;
  for (const e of enemies) {
    if (!e) continue;
    const ex = num(e.x, px);
    const ey = num(e.y, py);
    const dx = px - ex; // 由敵人指向玩家＝逃離方向
    const dy = py - ey;
    const raw = num(e.dist, Math.hypot(dx, dy));
    const dist = Math.max(0, raw);
    const len = Math.hypot(dx, dy);
    if (dist < nearestEnemy) {
      nearestEnemy = dist;
      hasNearFoe = len > 1e-6;
      nearFoeX = hasNearFoe ? -dx / len : 0;
      nearFoeY = hasNearFoe ? -dy / len : 0;
    }
    if (len <= 1e-6) continue; // 完全重疊：無方向可言，交給其他敵人/牆面決定
    const radius = Math.max(0, num(e.radius, 0));
    const weight = (e.boss ? BOSS_WEIGHT : 1) * (1 + radius / ts);
    // 距離反比（以 ts 正規化，讓分數與 tile 尺度無關）
    const infl = (weight * ts) / Math.max(dist, 1);
    threats.push({ ax: dx / len, ay: dy / len, infl });
  }

  // --- 預處理：pickup 引力項（僅在夠安全時開啟）---
  const lures = [];
  if (nearestEnemy > PICKUP_GATE_TS * ts) {
    for (const p of pickups) {
      if (!p) continue;
      const dx = num(p.x, px) - px;
      const dy = num(p.y, py) - py;
      const len = Math.hypot(dx, dy);
      if (len <= 1e-6) continue; // 已經站在上面
      const tx = dx / len;
      const ty = dy / len;
      // 與最近敵人同向（夾角 <60°）的 pickup 不算引力：去撿它等於往敵人身上走。
      if (hasNearFoe && tx * nearFoeX + ty * nearFoeY > LURE_MAX_COS) continue;
      lures.push({ tx, ty, infl: 1 / (1 + len / (6 * ts)) });
    }
  }

  // --- 候選評分 ---
  const walls = new Array(DIR_COUNT); // 每個方向的遠端罰分；null＝近端撞牆（淘汰）
  let anyOpen = false;
  for (let i = 0; i < DIR_COUNT; i++) {
    walls[i] = probeWalls(blocked, px, py, DIRS[i].x, DIRS[i].y, ts);
    if (walls[i] !== null) anyOpen = true;
  }

  const scores = new Array(DIR_COUNT + 1);
  for (let i = 0; i < DIR_COUNT; i++) {
    if (walls[i] === null) {
      scores[i] = -Infinity;
      continue;
    }
    const prev = walls[(i + DIR_COUNT - 1) % DIR_COUNT];
    const next = walls[(i + 1) % DIR_COUNT];
    // 被淘汰的鄰居不再擴散（它本身已不可選），只擴散有限的遠端罰分。
    const bleed = WALL_BLEED * ((prev || 0) + (next || 0));
    const d = DIRS[i];
    let s = -(walls[i] + bleed);
    for (const t of threats) s += THREAT_GAIN * t.infl * (d.x * t.ax + d.y * t.ay);
    for (const l of lures) s += PICKUP_GAIN * l.infl * (d.x * l.tx + d.y * l.ty);
    scores[i] = s;
  }
  // 最後一格＝零向量：只有在 16 個方向全被牆淘汰時才可選——場上有敵人時，
  // 任何一條活路都優於原地挨打（微罰擋不住被斥力壓成負分的候選）。
  scores[DIR_COUNT] = anyOpen ? -Infinity : -IDLE_PENALTY;

  let best = -Infinity;
  for (let i = 0; i <= DIR_COUNT; i++) if (scores[i] > best) best = scores[i];
  const tied = [];
  for (let i = 0; i <= DIR_COUNT; i++) if (scores[i] >= best - TIE_EPS) tied.push(i);

  let pick = tied[0];
  if (tied.length > 1) {
    const rng = makeRng(num(v.seed, 0) >>> 0);
    const k = Math.min(tied.length - 1, Math.floor(rng() * tied.length));
    pick = tied[k];
  }

  const move = pick === DIR_COUNT ? { x: 0, y: 0 } : { x: DIRS[pick].x, y: DIRS[pick].y };

  // --- dash：低血＋近敵＋冷卻好了 ---
  const dash = hpFrac <= DASH_HP && nearestEnemy <= DASH_RANGE && v.dashReady === true;

  return { move, dash };
}

export default decideMove;
