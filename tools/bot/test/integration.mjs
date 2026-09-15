// tools/bot/test/integration.mjs — T7 驅動層／CLI 整合測試（Playwright + node:test）
//
// 執行：`node tools/bot/test/integration.mjs`（於 repo 根；刻意不叫 *.test.mjs，
// 避免被 `npm run test:bot` 的 `node --test ../tools/bot/test/*.test.mjs` glob 帶到）。
// Playwright 由 `test/node_modules` 以 createRequire 取得（範式同 test/frontend-smoke.mjs）。
//
// 對應 specs/bot-balance-sim：requirements.md R1/R2/R5/R7/R8、design.md 測試策略表中
// 層級為「整合」的全部列、tasks.md T7。
//
// ────────────────────────────────────────────────────────────────────────────
// 實作契約（本檔為 TDD 鎖定測試，實作代理照此做）
// ────────────────────────────────────────────────────────────────────────────
// 1) 頁內驅動 `tools/bot/driver.mjs`（純瀏覽器 ESM，由 tools/serve.mjs 以靜態檔供給，
//    頁內以 `import('/tools/bot/driver.mjs')` 載入，可再 import('/src/game/…')）：
//    - `export async function setup()` → `{ gameVersion:string, metaSingleton:boolean }`
//      等 `window.__DBG`；設 `META.settings.analytics=false`、`META.tutorialHUDDone=true`；
//      `metaSingleton = ((await import('/src/game/state.js')).META === __DBG.meta())`。
//    - `export async function startRun({biomeId, characterId, difficulty, seed, maxSimSec})`
//      → `{ ok:true }`；newRun→setScene(refs.run,{run})→applyPending()→掛 world.inputFor；
//      並暴露除錯把手 `window.__BOT = { scene, run, ticks, apiHits? }`（測試以它注入狀態）。
//    - `export function step(nTicks)` → `{ time, ticks, done:boolean, endReason:string|null }`
//      跑 nTicks 格 dt=1/120（每格：清暫停 → 解選擇 → inputFor → scene.update(1/120)），
//      達終止條件即 done 並停止該批剩餘格數。
//    - `export function collect()` → raw（含 cleared / endReason / time / gameVersion /
//      runResult / hpTimeline / ticks / simMs …，可直接餵 record.mjs 的 makeRecord）。
//    - `export function lastError()` → string|null。
//    - 引擎 rAF 迴圈的停用由呼叫端（CLI／本測試）以 `context.addInitScript` 置換
//      `requestAnimationFrame`/`cancelAnimationFrame` 達成，driver 不碰 src/。
//    ※ 實測補充（2026-09-14，本檔撰寫時以探針在真頁面查證）：
//      (i) `refs` 在 `/src/game/scenes/refs.js`，不是 `/src/game/scene.js`
//          （scene.js 只導出 setScene/applyPending/getScene/updateActive/renderActive）。
//      (ii) rAF 被置換後，Playwright 的 `page.waitForFunction` **預設以 rAF 輪詢**，
//          會一路等到 timeout（__DBG 其實早已存在）→ 等頁面就緒必須傳 `{ polling: <ms> }`。
//      (iii) 置換 rAF 不影響 boot：頁面照常完成載入、`__GAME_ERROR__` 為 null、
//          `META === __DBG.meta()` 為 true、`GAME_VERSION==='V2.0'`。
//      (iv) 基準：無輸入的 driver-like 迴圈 2400 格 → `run.time` 19.9999…、`dead:false`、
//          simMs ≈ 55ms（約 360× 實時），故本檔的短局測試不需要 godmode。
// 2) CLI `node tools/bot/run.mjs <args>`：參數同 plan.mjs 的 parseArgs，另加
//    `--restartEvery N`（每 worker 每 N 局重開自己的 browser，預設 50）與
//    `--baseUrl`（預設 http://127.0.0.1:5173/；可達則沿用，不可達且為預設埠則自行
//    spawn tools/serve.mjs 並於結束時關閉）。
//    ※ plan.mjs 的 parseArgs 對未知旗標會拋 UsageError，且 plan.mjs 已 TDD 鎖定 →
//      run.mjs 必須在呼叫 parseArgs **之前**自行抽走 `--restartEvery`/`--baseUrl` 兩組旗標。
//    退出碼：成功 0；UsageError／批次識別不符／中段損壞 → 非 0 且訊息印到 stderr
//    （批次識別不符的訊息必須含「--out」提示）。
//    `--dry-run` 只印組合數與預估時間到 stdout，不建立 out 目錄。
//    輸出：`<out>/runs.jsonl`（一局一行）、`<out>/report.md`；
//    stdout 最後印 `api_hits=<n>` 與 `browser_restarts=<n>`。
//    續跑：既有 runs.jsonl 尾行截斷 → stdout 含「截掉 1 行」，且該半行須實體移出檔案
//    （跑完後整檔每一行都要能 JSON.parse），並重跑該組合。
// 3) `tools/bot/gen-ids.mjs`：開一頁讀 BIOMES 與 Characters.ids() 寫成 `tools/bot/ids.json`
//    （`{"biomes":[...],"chars":[...]}`）；CLI 與 dry-run 讀 ids.json（不開瀏覽器）。
//
// 本檔慣例：整檔共用一個 serve 與一個 browser（before/after）；每個測試自建 context
// （rAF stub + `page.route('**/api/**', abort)` 計數）；out 目錄一律建在 os.tmpdir()。
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { makeRecord, validateRecord, TOOL_VERSION } from '../record.mjs';
import { keyOf } from '../plan.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const URL_BASE = 'http://127.0.0.1:5173/';
const IDS_PATH = path.join(ROOT, 'tools', 'bot', 'ids.json');
const RUN_CLI = path.join('tools', 'bot', 'run.mjs');

const require = createRequire(path.join(ROOT, 'test', 'package.json'));
const { chromium } = require('playwright');

let server = null;
let browser = null;

// ── 基礎輔助 ────────────────────────────────────────────────────────────────

async function portInUse() {
  try { await fetch(URL_BASE, { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(URL_BASE, { signal: AbortSignal.timeout(1000) }); if (r.ok) return; }
    catch { /* 尚未起來 */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('dev server 未在 ' + URL_BASE + ' 回應');
}

/** 尚不存在的 out 目錄（父目錄存在，讓 dry-run「不建立 out」可被斷言）。 */
function mkOutPath() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'botsim-')), 'out');
}

function readLines(outDir) {
  const p = path.join(outDir, 'runs.jsonl');
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim() !== '');
}

function readIds() {
  if (!fs.existsSync(IDS_PATH)) {
    throw new Error('tools/bot/ids.json 不存在（T7 應由 tools/bot/gen-ids.mjs 產生並入 git）');
  }
  return JSON.parse(fs.readFileSync(IDS_PATH, 'utf8'));
}

/**
 * 同步跑 CLI，永不 throw；回 {code, stdout, stderr, failMsg}。
 * stderr 只放子程序真正的 stderr——execFileSync 的 e.message 是「Command failed: <完整命令列>」，
 * 含全部旗標字面（例如 --out），混進 stderr 會讓「stderr 應含 --out」這類斷言假通過。
 */
function runCli(args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, [RUN_CLI, ...args], {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 900000, maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, stdout: String(stdout), stderr: '', failMsg: '' };
  } catch (e) {
    return {
      code: (e && e.status != null) ? e.status : -1,
      stdout: e && e.stdout != null ? String(e.stdout) : '',
      stderr: e && e.stderr != null ? String(e.stderr) : '',
      failMsg: e && e.message ? String(e.message) : '',
    };
  }
}

// context.addInitScript：在任何頁面腳本前停用引擎 rAF 迴圈，驅動層成為唯一更新來源。
function stubRaf() {
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
}

/** 開一個乾淨 context（rAF 停用＋API 全攔截），跑 fn(page, state)，結束必關。 */
async function withContext(fn) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const state = { apiHits: 0, pageErrors: [] };
  await context.addInitScript(stubRaf);
  await context.route('**/api/**', (route) => { state.apiHits++; route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', (e) => state.pageErrors.push(String(e)));
  try {
    await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
    // polling:200 是必要的——Playwright 的 waitForFunction 預設以 requestAnimationFrame 輪詢，
    // 而 initScript 已把 rAF 換掉，預設模式會永遠等不到（實測 30s timeout，但 __DBG 其實早就在）。
    // run.mjs 等頁面就緒時同樣必須用 interval 輪詢，不可用預設 raf 模式。
    await page.waitForFunction(() => !!window.__DBG, null, { timeout: 30000, polling: 200 });
    return await fn(page, state);
  } finally {
    await context.close();
  }
}

const loadDriver = (page) => page.evaluate(async () => {
  window.__drv = await import('/tools/bot/driver.mjs');
  return await window.__drv.setup();
});
const drvStart = (page, cfg) => page.evaluate((c) => window.__drv.startRun(c), cfg);
const drvStep = (page, n) => page.evaluate((k) => window.__drv.step(k), n);
const drvCollect = (page) => page.evaluate(() => window.__drv.collect());
const drvLastError = (page) => page.evaluate(() => window.__drv.lastError());

const CFG = { biomeId: 'crypt', characterId: 'hunter', difficulty: 1, seed: 1, maxSimSec: 60 };
const recCfg = { biome: 'crypt', char: 'hunter', diff: 1, mode: 'normal', runIdx: 1, seed: 1 };

/** 合法 raw（供批次識別測試造首行用）。 */
function fakeRaw(over = {}) {
  return {
    cleared: false, endReason: 'finishRun', runResult: 'death', time: 123.5,
    level: 4, kills: 88, score: 1200, stage: 1, deathSrc: 'slime',
    dmgTakenBySrc: { slime: 40 }, dmgBySource: { w_soulbolt: 900 },
    weapons: ['w_soulbolt'], abilities: [], bossKills: 0, reaperSlain: false,
    hpTimeline: [1, 0.8, 0.4], simMs: 2500, ticks: 14820, gameVersion: 'V2.0',
    ...over,
  };
}

/** 反覆 step 直到 done（或超過 maxBatches 批）。 */
async function stepUntilDone(page, batch = 1800, maxBatches = 200) {
  let res = null;
  for (let i = 0; i < maxBatches; i++) {
    res = await drvStep(page, batch);
    if (res && res.done) return res;
  }
  return res;
}

// ── 生命週期 ────────────────────────────────────────────────────────────────

before(async () => {
  if (await portInUse()) {
    throw new Error('埠 5173 已被占用 — 請先關閉執行中的 dev server 再跑本測試（同 test/frontend-smoke.mjs）');
  }
  server = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, stdio: 'ignore' });
  await waitForServer();
  browser = await chromium.launch();
});

after(async () => {
  if (browser) { try { await browser.close(); } catch { /* */ } }
  if (server) { try { server.kill(); } catch { /* */ } }
});

// ── R1 CLI / ids ────────────────────────────────────────────────────────────

test('R1 dry-run 只印組合數與估時、不建立 out 目錄', () => {
  const ids = readIds();
  const out = mkOutPath();
  const expected = ids.biomes.length * ids.chars.length * 2 * 2;   // biomes×chars×diffs(1,3)×runs(2)
  const r = runCli(['--dry-run', '--biomes', 'all', '--chars', 'all', '--diffs', '1,3', '--runs', '2', '--out', out]);
  assert.equal(r.code, 0, `--dry-run 應 exit 0（stderr: ${r.stderr}）`);
  assert.ok(r.stdout.includes(String(expected)), `stdout 應含組合數 ${expected}，實得: ${r.stdout}`);
  assert.ok(r.stdout.includes('預估'), `stdout 應含「預估」字樣，實得: ${r.stdout}`);
  assert.ok(!fs.existsSync(out), 'dry-run 不得建立 out 目錄');
});

test('R1 ids.json 與 live registry 一致（10 生態 / 27 角色）', async () => {
  const ids = readIds();
  const live = await withContext(async (page) => page.evaluate(async () => {
    const biomes = (await import('/src/art/biomes.js')).BIOMES.map((b) => b.id);
    const chars = (await import('/src/game/content/registry.js')).Characters.ids();
    return { biomes, chars };
  }));
  assert.deepEqual(ids.biomes, live.biomes, 'ids.json 的 biomes 與 live BIOMES 不符（漂移）');
  assert.deepEqual(ids.chars, live.chars, 'ids.json 的 chars 與 live Characters.ids() 不符（漂移）');
  assert.equal(live.biomes.length, 10, `生態數應為 10，實得 ${live.biomes.length}`);
  assert.equal(live.chars.length, 27, `角色數應為 27，實得 ${live.chars.length}`);
});

test('R1 未知 biome id → 非零退出並列出合法 id', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'nope', '--chars', 'hunter', '--diffs', '1', '--runs', '1', '--out', out]);
  assert.notEqual(r.code, 0, '未知 id 應非零退出');
  assert.ok(r.stderr.includes('crypt'), `stderr 應列出合法 id（含 crypt），實得: ${r.stderr}`);
});

// ── R2 驅動層 ───────────────────────────────────────────────────────────────

test('R2 短局可終止、時間前進且紀錄合法', async () => {
  await withContext(async (page) => {
    const s = await loadDriver(page);
    assert.equal(s.metaSingleton, true, '頁內 import 的 META 必須與 __DBG.meta() 同一單例');
    assert.equal(typeof s.gameVersion, 'string', 'setup() 應回傳 gameVersion');

    await drvStart(page, CFG);
    const twenty = await drvStep(page, 2400);   // 20 模擬秒
    assert.equal(twenty.done, false, `短局不應在 20 秒內結束（endReason: ${twenty.endReason}）`);
    assert.ok(twenty.time >= 19, `20 模擬秒後 run.time 應 ≥ 19（story/hudTut 未凍結），實得 ${twenty.time}`);

    const fin = await stepUntilDone(page);
    assert.ok(fin && fin.done, '短局應在 maxSimSec 60 內終止');
    assert.ok(['finishRun', 'sim_cap'].includes(fin.endReason), `endReason 應為 finishRun/sim_cap，實得 ${fin.endReason}`);

    const raw = await drvCollect(page);
    const rec = makeRecord(recCfg, raw);
    assert.deepEqual(validateRecord(rec), [], 'collect() 產出的紀錄應通過 validateRecord');
    assert.ok(['death', 'timeout'].includes(rec.result), `result 應為 death/timeout，實得 ${rec.result}`);
    assert.equal(rec.gameVersion, s.gameVersion, 'raw.gameVersion 應取自頁內 GAME_VERSION');
    assert.ok(Array.isArray(rec.hpTimeline) && rec.hpTimeline.length >= 1, 'hpTimeline 應為非空陣列（每 30 模擬秒一點）');
    assert.ok(typeof rec.ticks === 'number' && rec.ticks > 0, 'ticks 應為正數');
    assert.ok(typeof rec.simMs === 'number' && rec.simMs > 0, 'simMs 應為正數');
  });
});

test('R2 兩批之間 run.time 不自行前進（rAF 已停用）', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await drvStep(page, 1800);
    const before = await page.evaluate(() => window.__BOT.run.time);
    await new Promise((r) => setTimeout(r, 500));
    const after = await page.evaluate(() => window.__BOT.run.time);
    assert.equal(after, before, `真實時間等待 500ms 後 run.time 不得改變（${before} → ${after}）`);
  });
});

test('R2 步長為正式值 dt=1/120', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    const t0 = await page.evaluate(() => window.__BOT.run.time);
    const r = await drvStep(page, 1200);
    assert.equal(r.done, false, '此段不應結束');
    const delta = r.time - t0;
    assert.ok(Math.abs(delta - 10) <= 0.05, `1200 格應前進 10 模擬秒（±0.05），實得 ${delta}`);
  });
});

test('R2 升級三選一不卡局', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await drvStep(page, 600);

    const injected = await page.evaluate(async () => {
      const prog = await import('/src/game/progression.js');
      const s = window.__BOT.scene;
      const options = prog.getRunChoices(s.run, s.player, 3);
      s.choice = { options, hover: 0, bondHints: [] };
      window.__before = JSON.stringify({
        w: s.player.weapons.map((x) => [x.def.id, x.level]),
        a: (s.run.abilities || []).slice(),
      });
      return options.length;
    });
    assert.ok(injected > 0, 'getRunChoices 應產出至少一個選項（前置失敗）');

    await drvStep(page, 1);
    const post = await page.evaluate(() => {
      const s = window.__BOT.scene;
      return {
        choice: s.choice,
        after: JSON.stringify({
          w: s.player.weapons.map((x) => [x.def.id, x.level]),
          a: (s.run.abilities || []).slice(),
        }),
        before: window.__before,
      };
    });
    assert.equal(post.choice, null, 'step 後 scene.choice 應被清空（不卡局）');
    assert.notEqual(post.after, post.before, '選擇應實際套用（武器或被動有變）');
  });
});

test('R2 連續兩件裝備：signature 被拒、佇列下一件被接受', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await drvStep(page, 600);

    const ready = await page.evaluate(async () => {
      const { Equipment } = await import('/src/game/content/registry.js');
      const sig = Equipment.get('x_starpiercer');    // slot:'weapon'、exclusive（signature）
      const armor = Equipment.get('leather_armor');  // slot:'armor'
      if (!sig || !armor) return { ok: false, sig: !!sig, armor: !!armor };
      const s = window.__BOT.scene;
      s.equipChoice = { def: sig };
      s.equipQueue = [armor];
      return { ok: true, sigSlot: sig.slot, armorSlot: armor.slot };
    });
    assert.ok(ready.ok, `前置失敗：找不到裝備 def（sig:${ready.sig} armor:${ready.armor}）`);

    await drvStep(page, 2);
    const post = await page.evaluate(() => {
      const s = window.__BOT.scene;
      return { equipChoice: s.equipChoice, queueLen: s.equipQueue.length, equipment: s.run.equipment };
    });
    assert.equal(post.equipChoice, null, '兩格後 equipChoice 應清空');
    assert.equal(post.queueLen, 0, '兩格後 equipQueue 應清空');
    assert.ok(post.equipment.armor, `護甲應被接受（run.equipment.armor 實得 ${post.equipment.armor}）`);
    assert.equal(post.equipment.weapon, null, 'signature（weapon 槽）不得被裝備——必須走 resolveEquip(false)');
  });
});

test('R2 通關後死神逾時 → finishRun(true) / reaper_timeout / clear', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, { ...CFG, maxSimSec: 200 });   // 需容納 reaperAt(+30) + 60 的逾時
    await drvStep(page, 600);

    await page.evaluate(() => {
      const s = window.__BOT.scene;
      s.player.takeDamage = () => {};        // 隔離：死神不得在逾時前殺死探針
      s.run.cleared = true;
      s.cleared = true;
      s.reaperAt = s.run.time + 30;
    });

    const fin = await stepUntilDone(page);
    assert.ok(fin && fin.done, '應在 maxSimSec 200 內終止');
    assert.equal(fin.endReason, 'reaper_timeout', `endReason 應為 reaper_timeout，實得 ${fin.endReason}`);

    const raw = await drvCollect(page);
    assert.equal(raw.cleared, true, 'collect().cleared 應為 true');
    const rec = makeRecord(recCfg, raw);
    assert.equal(rec.result, 'clear', `result 應為 clear（通關不因終止原因流失），實得 ${rec.result}`);
    assert.deepEqual(validateRecord(rec), [], '紀錄應通過 validateRecord');
  });
});

test('R2 頁內例外 → 該局記 error 並可讀回訊息', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await page.evaluate(() => { window.__BOT.scene.update = () => { throw new Error('boom'); }; });

    const r = await drvStep(page, 1);
    assert.equal(r.done, true, '拋例外後該局應立即結束');
    assert.equal(r.endReason, 'error', `endReason 應為 error，實得 ${r.endReason}`);
    const err = await drvLastError(page);
    assert.ok(err && String(err).includes('boom'), `lastError() 應含 'boom'，實得 ${err}`);

    const raw = await drvCollect(page);
    const rec = makeRecord(recCfg, raw);
    assert.equal(rec.result, 'error', 'error 局的 result 應為 error');
    assert.deepEqual(validateRecord(rec), [], 'error 局也應寫出合法紀錄');
  });
});

// ── R7 隔離 ─────────────────────────────────────────────────────────────────

test('R7 context 隔離：第二個 context 讀不到第一局的 history', async () => {
  const first = await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, { ...CFG, maxSimSec: 20 });
    await drvStep(page, 1200);
    return page.evaluate(() => {
      window.__BOT.scene.finishRun(false);   // 實際結算 → bankRun 寫入 META.stats.history
      return window.__DBG.meta().stats.history.length;
    });
  });
  assert.ok(first >= 1, `第一個 context 結算後 history 應 ≥1，實得 ${first}`);

  const second = await withContext(async (page) => {
    const beforeRun = await page.evaluate(() => window.__DBG.meta().stats.history.length);
    await loadDriver(page);
    await drvStart(page, { ...CFG, maxSimSec: 20 });
    await drvStep(page, 1200);
    const afterRun = await page.evaluate(() => {
      window.__BOT.scene.finishRun(false);
      return window.__DBG.meta().stats.history.length;
    });
    return { beforeRun, afterRun };
  });
  assert.equal(second.beforeRun, 0, `第二個 context 開局前 history 應為 0（乾淨 localStorage），實得 ${second.beforeRun}`);
  assert.equal(second.afterRun, 1, `第二個 context 只應含自己這局，實得 ${second.afterRun}`);
});

// ── R5 單行原子性 + R7 API 攔截（CLI） ──────────────────────────────────────

test('R5/R7 CLI 兩局：每局一行合法紀錄、印出 api_hits', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '2',
    '--parallel', '1', '--maxSimSec', '20', '--out', out]);
  assert.equal(r.code, 0, `CLI 應 exit 0（stderr: ${r.stderr}）`);

  const lines = readLines(out);
  assert.ok(lines, `應產生 ${path.join(out, 'runs.jsonl')}`);
  assert.equal(lines.length, 2, `runs.jsonl 應恰 2 行，實得 ${lines.length}`);

  const recs = lines.map((l, i) => {
    let obj;
    assert.doesNotThrow(() => { obj = JSON.parse(l); }, `第 ${i + 1} 行應為單行合法 JSON`);
    assert.deepEqual(validateRecord(obj), [], `第 ${i + 1} 行應通過 validateRecord`);
    return obj;
  });
  assert.deepEqual(recs.map((x) => x.runIdx).sort(), [1, 2], 'runIdx 應為 1、2');
  for (const rec of recs) {
    assert.ok(rec.time <= 20.5, `--maxSimSec 20 的局 time 應 ≤ 20.5，實得 ${rec.time}`);
    assert.equal(rec.toolVersion, TOOL_VERSION, 'toolVersion 應為 record.mjs 的常數');
  }
  assert.ok(/api_hits=\d+/.test(r.stdout), `stdout 應印出 api_hits=<n>，實得: ${r.stdout}`);
  assert.ok(fs.existsSync(path.join(out, 'report.md')), '應產生 report.md');
});

// ── R8 並行 / 續跑 / 重開 ───────────────────────────────────────────────────

test('R8 --parallel 2 對 4 組合 → 恰 4 行、key 不重複', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'crypt,cavern', '--chars', 'hunter,ranger', '--diffs', '1', '--runs', '1',
    '--parallel', '2', '--maxSimSec', '10', '--out', out]);
  assert.equal(r.code, 0, `CLI 應 exit 0（stderr: ${r.stderr}）`);

  const lines = readLines(out) || [];
  assert.equal(lines.length, 4, `runs.jsonl 應恰 4 行，實得 ${lines.length}`);
  const keys = lines.map((l) => keyOf(JSON.parse(l)));
  assert.equal(new Set(keys).size, 4, `4 個組合的 key 不得重複，實得 ${JSON.stringify(keys)}`);
});

test('R8 批次識別不符（seed）→ 非零退出並提示改 --out', () => {
  const out = mkOutPath();
  fs.mkdirSync(out, { recursive: true });
  const header = makeRecord({ ...recCfg, seed: 2 }, fakeRaw());
  assert.deepEqual(validateRecord(header), [], '前置：造出的首行必須合法');
  fs.writeFileSync(path.join(out, 'runs.jsonl'), JSON.stringify(header) + '\n', 'utf8');

  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '1',
    '--parallel', '1', '--maxSimSec', '10', '--seed', '1', '--out', out]);
  assert.notEqual(r.code, 0, '批次識別不符應非零退出');
  assert.ok(r.stderr.includes('--out'), `stderr 應提示改用新的 --out，實得: ${r.stderr}`);
  assert.equal((readLines(out) || []).length, 1, '拒絕執行時不得追加任何行');
});

test('R8 尾行截斷 → 續跑成功、印「截掉 1 行」、整檔皆可 parse', () => {
  const out = mkOutPath();
  const args = ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1',
    '--parallel', '1', '--maxSimSec', '10', '--out', out];

  const first = runCli([...args, '--runs', '1']);
  assert.equal(first.code, 0, `首跑應 exit 0（stderr: ${first.stderr}）`);
  assert.equal((readLines(out) || []).length, 1, '首跑應產生 1 行');

  fs.appendFileSync(path.join(out, 'runs.jsonl'), '{"biome":"cr', 'utf8');

  const second = runCli([...args, '--runs', '2']);
  assert.equal(second.code, 0, `尾行截斷應可續跑（stderr: ${second.stderr}）`);
  assert.ok(second.stdout.includes('截掉 1 行'), `stdout 應印出「截掉 1 行」警告，實得: ${second.stdout}`);

  const lines = readLines(out) || [];
  assert.equal(lines.length, 2, `續跑後應恰 2 行（半行須實體移除），實得 ${lines.length}`);
  for (const [i, l] of lines.entries()) {
    assert.doesNotThrow(() => JSON.parse(l), `續跑後第 ${i + 1} 行應可 JSON.parse，實得: ${l}`);
  }
  assert.deepEqual(lines.map((l) => JSON.parse(l).runIdx).sort(), [1, 2], '應只補跑未完成的 runIdx 2');
});

test('R8 跨 browser 重開不遺失（--restartEvery 3、8 局）', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter,ranger', '--diffs', '1,2', '--runs', '2',
    '--parallel', '2', '--maxSimSec', '5', '--restartEvery', '3', '--out', out]);
  assert.equal(r.code, 0, `CLI 應 exit 0（stderr: ${r.stderr}）`);

  const lines = readLines(out) || [];
  assert.equal(lines.length, 8, `應恰 8 行（組合數），實得 ${lines.length}`);
  const recs = lines.map((l) => JSON.parse(l));
  assert.equal(new Set(recs.map(keyOf)).size, 8, 'key 不得重複');
  const errs = recs.filter((x) => x.result === 'error');
  assert.equal(errs.length, 0, `不得有 error 行，實得 ${JSON.stringify(errs.map(keyOf))}`);

  const m = /browser_restarts=(\d+)/.exec(r.stdout);
  assert.ok(m, `stdout 應印出 browser_restarts=<n>，實得: ${r.stdout}`);
  assert.ok(Number(m[1]) >= 1, `restartEvery 3 / 每 worker 4 局，重開次數應 ≥ 1，實得 ${m[1]}`);
});

// ════════════════════════════════════════════════════════════════════════════
// 第 3 波審查裁決追加案例（TDD 鎖定；以下為實作代理要滿足的「契約補充」）
// ════════════════════════════════════════════════════════════════════════════
// C. run.mjs
//    - `--out` 相對路徑一律相對 ROOT 解析（不論 cwd）。
//    - 啟動時以 preflight.readGameVersionFromSource 取真 gameVersion（不開瀏覽器），
//      供首行批次識別比對與 errorRecord 使用。
//    - 未給 `--maxSimSec` 時以 preflight.readBalanceCapFromSource 的值當上限。
//    - 續跑用 preflight.resumeDoneKeys（error 局要重跑）；report 與 api 統計用
//      preflight.dedupeLatest（同 key 只算最後一筆）。
//    - 尾行截斷修復改寫檔時先寫 `runs.jsonl.tmp` 再 rename，結束後不得殘留 `.tmp`。
//    - 每次 page.evaluate 走 pw_util.evaluateWithTimeout（預設 60000ms，
//      `--evalTimeoutMs N` 覆寫；run.mjs 在呼叫 parseArgs 前自行抽走該旗標）。
//      逾時 → 該局 `result:'error'`、`error` 含 'EvaluateTimeout'，worker 續跑。
//    - pageerror 或頁內 `window.__GAME_ERROR__` 有值 → 該局 endReason/result 皆 'error'。
//    - `consecFail` 以 preflight.nextConsecFail 累計（error 紀錄也算）；連 3 局 → 提前退出。
//    - 非 dry-run 且佇列非空時，開 worker 前先開一頁讀 live BIOMES id 與 Characters.ids()，
//      與 ids.json 不符 → 改寫 ids.json、stderr 含「ids.json」與「已更新」、exit 2。
//    - `chromium.launch()` 失敗只讓該 worker 退出（stderr 訊息），其他 worker 續跑
//      且仍寫 report、印 api_hits；結尾用 `process.exitCode`，不用 `process.exit`；
//      exit 3 只在確有未跑組合時。
// D. driver.mjs：`step()` 每批開頭與結尾檢查 `window.__GAME_ERROR__`，有值 →
//    `done:true, endReason:'error'`，`lastError()` 含其字串。
// E. gen-ids.mjs：`--baseUrl` 缺值或非 http(s) URL → stderr 訊息、exit 1；
//    Chromium 啟動失敗時仍會關掉自己 spawn 的 serve（try/finally 包住 require/launch）。

/** 同 runCli，但可指定 cwd（用來驗「--out 相對 ROOT，不隨 cwd 走」）。 */
function runCliAt(cwd, args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, [path.join(ROOT, RUN_CLI), ...args], {
      cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 900000, maxBuffer: 32 * 1024 * 1024,
    });
    return { code: 0, stdout: String(stdout), stderr: '' };
  } catch (e) {
    return {
      code: (e && e.status != null) ? e.status : -1,
      stdout: e && e.stdout != null ? String(e.stdout) : '',
      stderr: e && e.stderr != null ? String(e.stderr) : '',
    };
  }
}

/** 跑任意 tools/bot 腳本（cwd = ROOT），永不 throw。 */
function runNode(args, opts = {}) {
  try {
    const stdout = execFileSync(process.execPath, args, {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      timeout: opts.timeout || 120000, maxBuffer: 8 * 1024 * 1024,
    });
    return { code: 0, stdout: String(stdout), stderr: '' };
  } catch (e) {
    return {
      code: (e && e.status != null) ? e.status : -1,
      stdout: e && e.stdout != null ? String(e.stdout) : '',
      stderr: e && e.stderr != null ? String(e.stderr) : '',
    };
  }
}

const rmrf = (p) => { try { fs.rmSync(p, { recursive: true, force: true }); } catch { /* */ } };

// ── D 驅動層：頁面級錯誤 ────────────────────────────────────────────────────

test('W3 真 pageerror（非同步拋例外）→ 該局 endReason error', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await page.evaluate(() => { setTimeout(() => { throw new Error('async-boom'); }, 0); });
    await new Promise((r) => setTimeout(r, 100));

    // 前置：index.html 的全域 error 陷阱應已把訊息寫進 __GAME_ERROR__。
    const ge = await page.evaluate(() => window.__GAME_ERROR__ || null);
    assert.ok(ge && String(ge).includes('async-boom'),
      `前置失敗：pageerror 後 window.__GAME_ERROR__ 應含 async-boom，實得 ${ge}`);

    const r = await drvStep(page, 120);
    assert.equal(r.done, true, '頁面級錯誤後該局應立即結束（step 每批檢查 __GAME_ERROR__）');
    assert.equal(r.endReason, 'error', `endReason 應為 error，實得 ${r.endReason}`);
    const err = await drvLastError(page);
    assert.ok(err && String(err).includes('async-boom'), `lastError() 應含 async-boom，實得 ${err}`);
  });
});

test('W3 __GAME_ERROR__ 手動設值 → step(1) 即記 error', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await page.evaluate(() => { window.__GAME_ERROR__ = 'forced'; });

    const r = await drvStep(page, 1);
    assert.equal(r.done, true, '__GAME_ERROR__ 有值時該局應立即結束');
    assert.equal(r.endReason, 'error', `endReason 應為 error，實得 ${r.endReason}`);
    const err = await drvLastError(page);
    assert.ok(err && String(err).includes('forced'), `lastError() 應含 'forced'，實得 ${err}`);
  });
});

test('W3 eventChoice / curseChoice 被解掉且不卡局', async () => {
  await withContext(async (page) => {
    await loadDriver(page);
    await drvStart(page, CFG);
    await drvStep(page, 600);

    const ready = await page.evaluate(async () => {
      const { EVENTS } = await import('/src/game/content/events.js');
      const { CURSES } = await import('/src/game/content/curses.js');
      const s = window.__BOT.scene;
      s.eventChoice = EVENTS.slice(0, 3);
      s.curseChoice = CURSES.slice(0, 3);
      return { ev: s.eventChoice.length, cu: s.curseChoice.length };
    });
    assert.ok(ready.ev > 0 && ready.cu > 0, `前置失敗：EVENTS/CURSES 應非空，實得 ${JSON.stringify(ready)}`);

    await drvStep(page, 2);
    const post = await page.evaluate(() => {
      const s = window.__BOT.scene;
      return { eventChoice: s.eventChoice, curseChoice: s.curseChoice, dead: !!s.dead, curses: (s.curses || []).length };
    });
    assert.equal(post.eventChoice, null, '兩格後 eventChoice 應為 null（否則 run.update 永遠凍結）');
    assert.equal(post.curseChoice, null, '兩格後 curseChoice 應為 null');
    assert.equal(post.dead, false, '解事件／詛咒不應讓該局死亡');
    assert.ok(post.curses >= 1, `applyCurse 應實際套用（scene.curses 應 ≥1），實得 ${post.curses}`);
  });
});

// ── C run.mjs 批次調度 ──────────────────────────────────────────────────────

test('W3 --out 相對路徑一律相對 ROOT（不隨 cwd 走）', () => {
  const rel = 'tools/bot/out_t7fix_' + Math.random().toString(36).slice(2, 8);
  const expected = path.join(ROOT, rel);
  const wrong = path.join(ROOT, 'test', 'tools');
  try {
    const r = runCliAt(path.join(ROOT, 'test'),
      ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '1',
        '--parallel', '1', '--maxSimSec', '5', '--out', rel]);
    assert.equal(r.code, 0, `CLI 應 exit 0（stderr: ${r.stderr}）`);
    assert.ok(fs.existsSync(path.join(expected, 'runs.jsonl')),
      `--out 應相對 ROOT 解析 → 期待 ${path.join(expected, 'runs.jsonl')}`);
    assert.ok(!fs.existsSync(wrong), `不得以 cwd 解析而寫到 ${wrong}`);
  } finally {
    rmrf(expected);
    rmrf(wrong);
  }
});

test('W3 續跑會重試 error 局（resumeDoneKeys）且統計去重（dedupeLatest）', () => {
  const out = mkOutPath();
  fs.mkdirSync(out, { recursive: true });
  const errRec = makeRecord(recCfg, fakeRaw({
    endReason: 'error', runResult: null, cleared: false, time: 0, error: 'boom', gameVersion: 'V2.0',
  }));
  assert.equal(errRec.result, 'error', '前置：造出的首行應是 error 局');
  assert.deepEqual(validateRecord(errRec), [], '前置：造出的首行必須合法');
  fs.writeFileSync(path.join(out, 'runs.jsonl'), JSON.stringify(errRec) + '\n', 'utf8');

  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '1',
    '--parallel', '1', '--maxSimSec', '5', '--seed', '1', '--out', out]);
  assert.equal(r.code, 0, `續跑應 exit 0（stderr: ${r.stderr}）`);

  const lines = readLines(out) || [];
  assert.equal(lines.length, 2, `error 局應被重跑 → 2 行，實得 ${lines.length}`);
  const last = JSON.parse(lines[1]);
  assert.equal(keyOf(last), keyOf(errRec), '第 2 行應是同一個組合 key');
  assert.notEqual(last.result, 'error', `重跑後 result 不應仍是 error（error: ${last.error}）`);

  const report = fs.readFileSync(path.join(out, 'report.md'), 'utf8');
  assert.ok(report.includes('1（有效'), `report 的 n 應去重後只算一筆，實得: ${report}`);
});

test('W3 evaluate 逾時 → 該局記 error 且 worker 續跑', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '2',
    '--parallel', '1', '--maxSimSec', '5', '--evalTimeoutMs', '1', '--out', out]);
  assert.equal(r.code, 0, `逾時不是致命錯誤，應 exit 0（stderr: ${r.stderr}）`);

  const lines = readLines(out) || [];
  assert.equal(lines.length, 2, `兩局都應寫出紀錄，實得 ${lines.length}`);
  for (const [i, l] of lines.entries()) {
    const rec = JSON.parse(l);
    assert.equal(rec.result, 'error', `第 ${i + 1} 行應為 error 局`);
    assert.ok(String(rec.error || '').includes('EvaluateTimeout'),
      `第 ${i + 1} 行 error 應含 EvaluateTimeout，實得: ${rec.error}`);
  }
  assert.ok(/api_hits=\d+/.test(r.stdout), `逾時後仍應正常收尾並印 api_hits，實得: ${r.stdout}`);
});

test('W3 連續 3 局失敗 → 提前退出 exit 3、恰寫 3 行', () => {
  const out = mkOutPath();
  const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '4',
    '--parallel', '1', '--maxSimSec', '5', '--evalTimeoutMs', '1', '--out', out]);
  assert.equal(r.code, 3, `有組合未跑完應 exit 3（stderr: ${r.stderr}）`);
  assert.ok(r.stderr.includes('連續 3'), `stderr 應說明連續 3 局失敗，實得: ${r.stderr}`);
  assert.equal((readLines(out) || []).length, 3, '連敗 3 局後應停手，恰 3 行');
});

test('W3 ids.json 漂移 → 自動改寫並 exit 2', () => {
  const out = mkOutPath();
  const backupText = fs.readFileSync(IDS_PATH, 'utf8');
  const backup = JSON.parse(backupText);
  try {
    const drifted = { biomes: backup.biomes.slice(), chars: backup.chars.slice(0, -1) };
    assert.ok(drifted.chars.includes('hunter'), '前置：漂移版仍須含 hunter');
    fs.writeFileSync(IDS_PATH, JSON.stringify(drifted, null, 2) + '\n', 'utf8');

    const r = runCli(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '1',
      '--parallel', '1', '--maxSimSec', '5', '--out', out]);
    assert.equal(r.code, 2, `ids.json 漂移應 exit 2（stdout: ${r.stdout} / stderr: ${r.stderr}）`);
    assert.ok(r.stderr.includes('ids.json'), `stderr 應提到 ids.json，實得: ${r.stderr}`);
    assert.ok(r.stderr.includes('已更新'), `stderr 應說明已更新，實得: ${r.stderr}`);
    assert.deepEqual(JSON.parse(fs.readFileSync(IDS_PATH, 'utf8')), backup,
      'preflight 應把 ids.json 改寫回 live registry 的內容');
  } finally {
    fs.writeFileSync(IDS_PATH, backupText, 'utf8');
  }
});

test('W3 尾行截斷修復不得殘留 runs.jsonl.tmp', () => {
  const out = mkOutPath();
  const args = ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1',
    '--parallel', '1', '--maxSimSec', '5', '--out', out];

  const first = runCli([...args, '--runs', '1']);
  assert.equal(first.code, 0, `首跑應 exit 0（stderr: ${first.stderr}）`);
  fs.appendFileSync(path.join(out, 'runs.jsonl'), '{"biome":"cr', 'utf8');

  const second = runCli([...args, '--runs', '2']);
  assert.equal(second.code, 0, `尾行截斷應可續跑（stderr: ${second.stderr}）`);
  assert.equal((readLines(out) || []).length, 2, '續跑後應恰 2 行');
  assert.ok(!fs.existsSync(path.join(out, 'runs.jsonl.tmp')),
    '截斷修復須先寫 .tmp 再 rename，結束後不得殘留 runs.jsonl.tmp');
});

// ── E gen-ids.mjs ───────────────────────────────────────────────────────────

// 注意：斷言刻意要求 stderr 含「--baseUrl」（帶雙橫線）並在 10 秒內失敗。
// 只驗「含 baseUrl」會假通過——Node 對未捕捉例外會把拋出處的原始碼行一起印到 stderr，
// 而現行 gen-ids.mjs 那一行正好含 `${baseUrl}`（且要先空等 20 秒 dev server 才拋）。
// 契約 E 的「參數驗證」必須發生在 spawn serve／launch chromium 之前，故以「快速失敗」鎖定。
test('W3 gen-ids --baseUrl 缺值 → exit 1、快速失敗並提示 --baseUrl', () => {
  const t0 = Date.now();
  const r = runNode([path.join('tools', 'bot', 'gen-ids.mjs'), '--baseUrl'], { timeout: 90000 });
  const ms = Date.now() - t0;
  assert.equal(r.code, 1, `--baseUrl 缺值應 exit 1（stdout: ${r.stdout} / stderr: ${r.stderr}）`);
  assert.ok(r.stderr.includes('--baseUrl'), `stderr 應點名 --baseUrl，實得: ${r.stderr}`);
  assert.ok(ms < 10000, `參數驗證應在起 dev server 前就失敗（實耗 ${ms}ms）`);
});

test('W3 gen-ids --baseUrl 非 http(s) → exit 1、快速失敗並提示 --baseUrl', () => {
  const t0 = Date.now();
  const r = runNode([path.join('tools', 'bot', 'gen-ids.mjs'), '--baseUrl', 'ftp://nope/'], { timeout: 90000 });
  const ms = Date.now() - t0;
  assert.equal(r.code, 1, `非 http(s) URL 應 exit 1（stdout: ${r.stdout} / stderr: ${r.stderr}）`);
  assert.ok(r.stderr.includes('--baseUrl'), `stderr 應點名 --baseUrl，實得: ${r.stderr}`);
  assert.ok(ms < 10000, `參數驗證應在起 dev server 前就失敗（實耗 ${ms}ms）`);
});
