// tools/bot/driver.mjs — R2 頁內驅動層（純瀏覽器 ESM，由 tools/serve.mjs 以靜態檔供給）。
// 不得 import 任何 Node 內建模組：本檔在頁面裡跑，`import('/src/game/…')` 取到的是與
// index.html 同一個模組實例（同 URL ⇒ 同單例，META/refs 共用）。
//
// 對應 specs/bot-balance-sim：requirements.md R2/R3/R4/R7、design.md「頁內驅動 driver.mjs」
// 與「關鍵流程 · 單局」六步、tasks.md T7。
//
// 引擎 rAF 迴圈的停用由呼叫端（run.mjs／整合測試）以 context.addInitScript 置換
// requestAnimationFrame 完成——driver 不碰 src/。本檔是該頁唯一的模擬推進來源。

import { decideMove } from './strategy/move.mjs';
import { decideChoice } from './strategy/choice.mjs';
import { hashSeed } from './strategy/rng.mjs';
import { createGrowthDiagnostics } from './growth-diagnostics.mjs';

const DT = 1 / 120;                 // 正式步長（src/main.js 的 fixed: 1/120）
const HP_SAMPLE_TICKS = 3600;       // 每 30 模擬秒取一次血量
const REAPER_TIMEOUT = 60;          // 通關後死神窗口逾時（秒）→ 驅動層自行 finishRun(true)
const IDLE_BREAK_TICKS = 240;       // 策略連續 2 秒零向量 → 疊加環繞位移（防 anti-AFK 直寫 hp）
const IDLE_ORBIT_RATE = 0.02;       // 環繞角速度（rad/格）
const DEFAULT_MAX_SIM_SEC = 1200 + 30 + 120;

let M = null;            // 頁內遊戲模組把手（setup 後填）
let G = null;            // 當前局的驅動狀態
let VERSION = 'unknown'; // 頁內 GAME_VERSION（setup 後填；讓 collect() 保持同步函式）

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}

function errText(e) {
  if (!e) return 'unknown error';
  if (e.stack) return String(e.stack);
  if (e.message) return String(e.message);
  return String(e);
}

async function waitForDbg(timeoutMs = 30000) {
  const t0 = now();
  while (!window.__DBG) {
    if (now() - t0 > timeoutMs) throw new Error('window.__DBG 未就緒（頁面 boot 失敗？）');
    await new Promise((r) => setTimeout(r, 25));
  }
  return window.__DBG;
}

/** 等頁面就緒、關遙測、跳過 HUD 教學，並回報模組單例是否共用。 */
export async function setup() {
  const dbg = await waitForDbg();
  const [state, sceneMod, refsMod, prog, registry, balance, worldMod, patch, settings] = await Promise.all([
    import('/src/game/state.js'),
    import('/src/game/scene.js'),
    import('/src/game/scenes/refs.js'),
    import('/src/game/progression.js'),
    import('/src/game/content/registry.js'),
    import('/src/game/balance.js'),
    import('/src/game/world.js'),
    import('/src/game/content/patchnotes.js'),
    import('/src/game/ui/settings.js'),
  ]);
  M = { state, sceneMod, refs: refsMod.refs, prog, registry, balance, TS: worldMod.TS, settingsUI: settings.settingsUI };
  const META = state.META;
  META.settings = META.settings || {};
  META.settings.analytics = false;   // R7：不打遙測（context 用完即棄，故不呼叫 saveMeta）
  META.tutorialHUDDone = true;       // 6.3A 的 hudTut 會在第一場戰鬥 2 秒處凍結世界
  VERSION = patch.GAME_VERSION;
  return { gameVersion: VERSION, metaSingleton: state.META === dbg.meta() };
}

/** 內容登錄查詢器（decideChoice 的 reg 參數），每局建一次。 */
function makeReg() {
  const { Weapons, Equipment } = M.registry;
  const { weaponMaxLevel } = M.balance;
  return {
    weapon(id) {
      const d = Weapons.get(id);
      if (!d) return undefined;
      return { evolveReq: d.evolveReq, evolveInto: d.evolveInto, maxLevel: weaponMaxLevel(d) };
    },
    equip(id) {
      return Equipment.get(id) || undefined;
    },
  };
}

export async function startRun(cfg) {
  if (!M) await setup();
  if (G?.diagnostics) G.diagnostics.dispose();
  const c = cfg || {};
  if (c.diagnostics != null && c.diagnostics !== 'growth-v1') throw new Error('unknown diagnostics: ' + c.diagnostics);
  const strategy = c.strategy ?? 'A';
  if (!['A','B'].includes(strategy)) throw new Error('unknown strategy: ' + strategy);
  const run = M.state.newRun({
    biomeId: c.biomeId || null,
    characterId: c.characterId || 'hunter',
    difficulty: c.difficulty == null ? 1 : c.difficulty,
    mode: c.mode || 'normal',
  });
  M.sceneMod.setScene(M.refs.run, { run });
  M.sceneMod.applyPending();
  const scene = M.sceneMod.getScene();
  if (!scene || !scene.world || !scene.player) throw new Error('startRun：run scene 未就緒');

  const maxSimSec = (typeof c.maxSimSec === 'number' && c.maxSimSec > 0) ? c.maxSimSec : DEFAULT_MAX_SIM_SEC;
  G = {
    scene,
    run,
    reg: makeReg(),
    strategy,
    choiceAudit: { choices: 0, divergences: 0, selectedAbility: 0, selectedWeapon: 0 },
    seed: (typeof c.seed === 'number' && Number.isFinite(c.seed)) ? c.seed : 1,
    maxTicks: Math.max(1, Math.round(maxSimSec * 120)),
    ticks: 0,
    simMs: 0,
    done: false,
    endReason: null,
    error: null,
    input: { move: { x: 0, y: 0 }, dash: false },
    idleStreak: 0,
    hpTimeline: [],
  };
  // 既有的 co-op 注入點：回非 undefined 即代表「這個 avatar 由外部輸入驅動」。
  scene.world.inputFor = (p) => (p === scene.player ? G.input : undefined);
  G.diagnostics = c.diagnostics === 'growth-v1' ? createGrowthDiagnostics(scene) : null;
  sampleHp();
  window.__BOT = { scene, run, ticks: 0 };
  return { ok: true };
}

function sampleHp() {
  const p = G.scene.player;
  const max = p && p.maxHp ? p.maxHp : 0;
  const frac = max > 0 ? Math.max(0, Math.min(1, p.hp / max)) : 0;
  G.hpTimeline.push(Math.round(frac * 1000) / 1000);
}

/** 每一格都把所有「凍結世界」的面板關掉——機器人沒有鍵盤，開了就永遠關不掉。 */
function clearPauses(s) {
  if (M.settingsUI && M.settingsUI.open) M.settingsUI.open = false;
  s.paused = false;
  s.leaveConfirm = false;
  s.hudTut = false;
  s.showBuild = false;
  s.peekBuild = false;
  s.bigMap = false;
  s.shopOpen = false;
  s.shopChoice = null;
  s.anvilChoice = null;   // 現行 run/ 已無此欄位，防禦性保留
  s.hiddenPanel = null;
  s.story = null;         // R21.8 章節開場會凍結世界 6.5 秒
}

/** 機器人所見的局內狀態（decideChoice 的 state 參數）。 */
function choiceState(s, salt) {
  const { Equipment } = M.registry;
  const eq = s.run.equipment || {};
  const slotOf = (id) => {
    if (!id) return null;
    const d = Equipment.get(id);
    return d ? { id: d.id, tier: d.tier } : { id, tier: null };
  };
  return {
    weapons: (s.player.weapons || []).map((w) => ({
      id: w.def.id, level: w.level, evolved: !!w.def.evolved, equipped: !!w.def.equipped,
    })),
    passives: (s.run.abilities || []).slice(),
    passiveLevels: s.run.abilityLevels || {},
    equipment: { weapon: slotOf(eq.weapon), armor: slotOf(eq.armor), trinket: slotOf(eq.trinket) },
    MAX_WEAPONS: M.prog.MAX_WEAPONS,
    MAX_PASSIVES: M.prog.MAX_PASSIVES,
    seed: hashSeed(G.seed, G.ticks, salt),
  };
}

/**
 * 解掉這一格所有等待輸入的選擇面板。每類每格最多解一次：equip 的佇列刻意讓下一件
 * 在下一格才交給策略（與 resolveEquip 的原生節奏一致）。
 */
function resolveChoices(s) {
  if (s.choice && Array.isArray(s.choice.options) && s.choice.options.length) {
    const raw = s.choice.options;
    const opts = raw.map((o) => ({
      kind: o.kind, id: o.id, level: o.level, target: o.target, sacrifice: o.sacrifice,
    }));
    const state = choiceState(s, 'level');
    const a = decideChoice('level', opts, state, G.reg, 'A');
    const b = decideChoice('level', opts, state, G.reg, 'B');
    const idx = G.strategy === 'A' ? a : b;
    G.choiceAudit.choices++;
    if (a !== b) {
      G.choiceAudit.divergences++;
      if (opts[idx]?.kind === 'ability') G.choiceAudit.selectedAbility++;
      if (opts[idx]?.kind === 'weapon') G.choiceAudit.selectedWeapon++;
    }
    G.diagnostics?.choice(opts, idx, state);
    if (idx >= 0 && idx < raw.length) M.prog.applyChoice(s.run, s.player, s.world, raw[idx]);
    s.choice = null;
    s.peekBuild = false;
  }

  if (s.equipChoice && s.equipChoice.def) {
    const def = s.equipChoice.def;
    const idx = decideChoice('equip', [{ id: def.id, slot: def.slot, tier: def.tier }], choiceState(s, 'equip'), G.reg);
    s.resolveEquip(idx === 0);   // -1 必須走 resolveEquip(false)，否則 equipQueue 不會前進
  }

  if (Array.isArray(s.eventChoice) && s.eventChoice.length) {
    const idx = decideChoice('event', s.eventChoice, choiceState(s, 'event'), G.reg);
    s.applyEvent(s.eventChoice[idx >= 0 ? idx : 0]);
  }

  if (Array.isArray(s.curseChoice) && s.curseChoice.length) {
    const idx = decideChoice('curse', s.curseChoice, choiceState(s, 'curse'), G.reg);
    s.applyCurse(s.curseChoice[idx >= 0 ? idx : 0]);
  }
}

/** 機器人所見的世界（decideMove 的 view 參數）。 */
function buildView(s) {
  const p = s.player;
  const w = s.world;
  const enemies = [];
  for (const e of w.enemies) {
    if (!e || e.dead) continue;
    const dx = e.x - p.x;
    const dy = e.y - p.y;
    enemies.push({
      x: e.x, y: e.y,
      radius: e.radius || 0,
      boss: !!(e.def && e.def.boss),
      hpFrac: e.maxHp ? e.hp / e.maxHp : 1,
      dist: Math.hypot(dx, dy),
    });
  }
  const pickups = [];
  for (const k of w.pickups) {
    if (!k || k.dead) continue;
    pickups.push({ x: k.x, y: k.y, type: k.type });
  }
  return {
    x: p.x, y: p.y,
    hpFrac: p.maxHp ? p.hp / p.maxHp : 1,
    dashReady: (p.dashCd || 0) <= 0,
    ts: M.TS,
    enemies,
    pickups,
    blocked: (wx, wy) => w.solidAt(wx, wy),
    seed: hashSeed(G.seed, G.ticks),
  };
}

/** 策略回零向量太久 → 疊加緩慢環繞位移（策略層保持 R3 的零向量語義，不動它）。 */
function antiIdle(out) {
  const zero = out.move.x === 0 && out.move.y === 0;
  G.idleStreak = zero ? G.idleStreak + 1 : 0;
  if (!zero || G.idleStreak < IDLE_BREAK_TICKS) return out;
  const a = G.ticks * IDLE_ORBIT_RATE;
  return { move: { x: Math.cos(a), y: Math.sin(a) }, dash: out.dash };
}

function finish(reason) {
  G.endReason = reason;
  G.done = true;
}

function tick() {
  const s = G.scene;
  clearPauses(s);
  resolveChoices(s);
  const view = buildView(s);
  G.input = antiIdle(decideMove(view));
  G.diagnostics?.motion(view, G.input, G.ticks);

  s.update(DT);
  G.ticks++;
  G.diagnostics?.afterTick();
  if (G.ticks % HP_SAMPLE_TICKS === 0) sampleHp();

  if (s.dead) { finish(G.run.result === 'leave' ? 'abandon' : 'finishRun'); return; }
  if (G.run.cleared && s.reaperAt != null && G.run.time >= s.reaperAt + REAPER_TIMEOUT) {
    s.finishRun(true);   // 機器人不會按 E 離場：死神窗口逾時就以通關收斂
    finish('reaper_timeout');
    return;
  }
  if (G.ticks >= G.maxTicks) finish('sim_cap');
}

/**
 * 頁面級錯誤（index.html 的 error/unhandledrejection 陷阱寫入 window.__GAME_ERROR__）。
 * 非同步拋出的例外不會經過 tick() 的 try/catch，只能靠這個把手發現。
 */
function checkGameError() {
  if (G.done) return true;
  const ge = (typeof window !== 'undefined') ? window.__GAME_ERROR__ : null;
  if (!ge) return false;
  G.error = String(ge);
  finish('error');
  return true;
}

/** 跑 nTicks 格；達終止條件即停止該批剩餘格數。 */
export function step(nTicks) {
  if (!G) throw new Error('step()：尚未 startRun');
  const n = Math.max(1, nTicks | 0);
  const t0 = now();
  if (!checkGameError()) {
    try {
      for (let i = 0; i < n && !G.done; i++) tick();
    } catch (e) {
      G.error = errText(e);
      finish('error');
    }
    checkGameError();
  }
  G.simMs += now() - t0;
  if (window.__BOT) window.__BOT.ticks = G.ticks;
  return { time: G.run.time, ticks: G.ticks, done: G.done, endReason: G.endReason };
}

/** 收尾：回 raw（可直接餵 record.mjs 的 makeRecord）。 */
export function collect() {
  if (!G) throw new Error('collect()：尚未 startRun');
  const s = G.scene;
  const run = G.run;
  const raw = {
    cleared: !!run.cleared,
    endReason: G.endReason || 'sim_cap',
    runResult: run.result || null,
    time: run.time || 0,
    level: run.level || 0,
    kills: run.kills || 0,
    score: run.score || 0,
    stage: run.stage || 0,
    deathSrc: run.deathSrc || null,
    dmgTakenBySrc: run.dmgTakenBySrc || {},
    dmgBySource: run.dmgBySource || {},
    weapons: (s.player && s.player.weapons ? s.player.weapons : []).map((w) => w.def.id),
    abilities: (run.abilities || []).slice(),
    bossKills: run.bossKills || 0,
    reaperSlain: !!s.reaperSlain,
    hpTimeline: G.hpTimeline.slice(),
    simMs: Math.round(G.simMs),
    ticks: G.ticks,
    gameVersion: VERSION,
    strategy: G.strategy,
    choiceAudit: { ...G.choiceAudit },
  };
  if (G.diagnostics) raw.diagnostics = G.diagnostics.collect();
  if (G.error) raw.error = G.error;
  return raw;
}

export function lastError() {
  return G && G.error ? G.error : null;
}
