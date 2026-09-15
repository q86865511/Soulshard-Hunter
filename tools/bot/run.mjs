// tools/bot/run.mjs — R1/R5/R7/R8 批次 CLI：展開組合、開 headless Chromium、每局一個乾淨
// context、逐行 append out/runs.jsonl，最後 summarize() 產 report.md。
//
// 用法：node tools/bot/run.mjs [--biomes all|a,b] [--chars all|a,b] [--diffs 1,3] [--runs N]
//       [--parallel N] [--out DIR] [--seed N] [--shard i/n] [--maxSimSec N] [--dry-run]
//       [--restartEvery N] [--baseUrl URL] [--evalTimeoutMs N]
//
// 退出碼：0 成功／1 參數錯誤（UsageError）／2 續跑前置不符（批次識別、JSONL 中段損壞）／
//         3 有組合未跑完（worker 連續失敗提前退出）。
//
// 對應 specs/bot-balance-sim：requirements.md R1/R5/R7/R8、design.md「批次調度」、tasks.md T7。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import {
  parseArgs, expandCombos, pendingCombos, shardOf, estimate,
  checkBatchHeader, readJsonlTolerant, UsageError, CorruptError,
} from './plan.mjs';
import { makeRecord, validateRecord, TOOL_VERSION } from './record.mjs';
import { summarize } from './summarize.mjs';
import {
  parseBench, readGameVersionFromSource, readBalanceCapFromSource,
  nextConsecFail, dedupeLatest, resumeDoneKeys,
} from './preflight.mjs';
import { evaluateWithTimeout } from './pw_util.mjs';
import { auditCell } from './experiment.mjs';
import { sourceIdentity, openManifest, writeJson, sessionFile } from './experiment-io.mjs';
let experimentSession = null;

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const IDS_PATH = path.join(HERE, 'ids.json');
const BENCH_PATH = path.join(ROOT, 'specs', 'bot-balance-sim', 'BENCH.md');
const PATCHNOTES_PATH = path.join(ROOT, 'src', 'game', 'content', 'patchnotes.js');
const BALANCE_PATH = path.join(ROOT, 'src', 'game', 'balance.js');
const DEFAULT_BASE_URL = 'http://127.0.0.1:5173/';
const DEFAULT_RESTART_EVERY = 50;
const DEFAULT_EVAL_TIMEOUT_MS = 60000;
const BATCH_TICKS = 1800;          // 15 模擬秒／批（design「取捨」）
const MAX_CONSEC_FAIL = 3;

const require = createRequire(path.join(ROOT, 'test', 'package.json'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 在呼叫 plan.mjs 的 parseArgs 之前抽走它不認識的旗標——parseArgs 已 TDD 鎖定，
 * 未知旗標一律 UsageError。
 */
function takeFlag(argv, name) {
  const rest = [];
  let value = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] !== name) { rest.push(argv[i]); continue; }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith('--')) throw new UsageError(`${name} 缺少值`);
    value = v;
    i++;
  }
  return { rest, value };
}

function readIds() {
  if (!fs.existsSync(IDS_PATH)) {
    throw new UsageError('找不到 tools/bot/ids.json — 請先執行 node tools/bot/gen-ids.mjs 產生');
  }
  const ids = JSON.parse(fs.readFileSync(IDS_PATH, 'utf8'));
  if (!Array.isArray(ids.biomes) || !Array.isArray(ids.chars)) {
    throw new UsageError('tools/bot/ids.json 格式不正確（需 {"biomes":[…],"chars":[…]}）');
  }
  return ids;
}

/** BENCH.md 的單局中位耗時與並行膨脹倍率；沒有基準就回退到粗估值並標示未校正。 */
function readBench() {
  const text = fs.existsSync(BENCH_PATH) ? fs.readFileSync(BENCH_PATH, 'utf8') : '';
  return parseBench(text);
}

function readSourceText(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

async function reachable(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}

function isDefaultServer(url) {
  try {
    const u = new URL(url);
    return u.port === '5173' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  } catch { return false; }
}

async function main() {
  let argv = process.argv.slice(2);
  const hasMaxSimSec = argv.includes('--maxSimSec');
  const re = takeFlag(argv, '--restartEvery');
  const bu = takeFlag(re.rest, '--baseUrl');
  const et = takeFlag(bu.rest, '--evalTimeoutMs');
  const st = takeFlag(et.rest, '--strategy');
  const strategy = st.value;
  if (strategy != null && !['A', 'B'].includes(strategy)) throw new UsageError('unknown --strategy: ' + strategy);
  argv = st.rest;

  let restartEvery = DEFAULT_RESTART_EVERY;
  if (re.value != null) {
    const n = Number(re.value);
    if (!Number.isInteger(n) || n < 1) throw new UsageError(`--restartEvery 必須是 >=1 的整數，收到: ${re.value}`);
    restartEvery = n;
  }
  let evalTimeoutMs = DEFAULT_EVAL_TIMEOUT_MS;
  if (et.value != null) {
    const n = Number(et.value);
    if (!Number.isInteger(n) || n < 1) throw new UsageError(`--evalTimeoutMs 必須是 >=1 的整數，收到: ${et.value}`);
    evalTimeoutMs = n;
  }
  const baseUrl = bu.value || DEFAULT_BASE_URL;

  const ids = readIds();
  const opts = parseArgs(argv, ids);
  // 未指定 --maxSimSec 時，以 balance.js 原文推出的上限為準（不必開瀏覽器）。
  if (!hasMaxSimSec) {
    const cap = readBalanceCapFromSource(readSourceText(BALANCE_PATH));
    if (cap != null) opts.maxSimSec = cap;
  }
  const combos = shardOf(expandCombos(opts), opts.shard.i, opts.shard.n);

  if (opts.dryRun) {
    const bench = readBench();
    const est = estimate(combos.length, opts.parallel, bench.medianMs * bench.inflation);
    process.stdout.write(`組合數: ${combos.length}\n`);
    process.stdout.write(
      `預估: ${est.hours.toFixed(2)} 小時（中位 ${bench.medianMs} ms/局 · 並行膨脹 ${bench.inflation}`
      + ` · parallel ${opts.parallel}${bench.calibrated ? '' : ' · 未校正，尚無 BENCH 基準'}）\n`
    );
    return 0;
  }

  // --out 一律相對 repo 根解析：批次可能從任何 cwd 啟動（CI、子目錄的 npm script）。
  const outDir = path.resolve(ROOT, opts.out);
  const srcGameVersion = readGameVersionFromSource(readSourceText(PATCHNOTES_PATH));
  const runsPath = path.join(outDir, 'runs.jsonl');
  let manifest = null;
  if (strategy != null) {
    const { out, dryRun, ...args } = opts;
    manifest = { experimentVersion: 1, strategy, ...sourceIdentity(ROOT), toolVersion: TOOL_VERSION,
      gameVersion: srcGameVersion, args: { ...args, restartEvery, evalTimeoutMs, baseUrl } };
    openManifest(outDir, manifest);
    experimentSession = { file: sessionFile(outDir), startedAt: new Date().toISOString(), startedMs: Date.now(),
      pid: process.pid, argv: process.argv.slice(2), identity: manifest };
    writeJson(experimentSession.file, experimentSession);
  } else if (fs.existsSync(path.join(outDir, 'manifest.json'))) {
    throw new UsageError('experimental manifest requires explicit --strategy; use original arguments');
  }

  // ── 續跑前置：容錯讀既有 JSONL ＋ 批次識別 ────────────────────────────────
  let existing = [];
  let headerRecord = null;
  if (fs.existsSync(runsPath)) {
    let parsed;
    try {
      parsed = readJsonlTolerant(fs.readFileSync(runsPath, 'utf8'));
    } catch (e) {
      if (e instanceof CorruptError) {
        process.stderr.write(`${e.message}\n無法自動修復，請檢查該檔或改用新的 --out 目錄。\n`);
        return 2;
      }
      throw e;
    }
    existing = parsed.records;
    if (manifest) {
      const audit = auditCell(existing, combos, manifest);
      if (audit.errors.length) throw new Error('manifest record mismatch: ' + audit.errors.join(','));
    }
    if (parsed.truncatedTail) {
      // 半行必須實體移出檔案，否則續跑會把新紀錄接在壞行後面。
      // 先寫 .tmp 再 rename：直接覆寫時若在此刻中斷，好的紀錄也會一起沒了。
      const body = existing.map((r) => JSON.stringify(r)).join('\n');
      const tmpPath = runsPath + '.tmp';
      fs.writeFileSync(tmpPath, existing.length ? body + '\n' : '', 'utf8');
      fs.renameSync(tmpPath, runsPath);
      process.stdout.write('⚠ runs.jsonl 尾行不完整（寫到一半中斷），已截掉 1 行後續跑\n');
    }
    headerRecord = existing[0] || null;
    if (headerRecord) {
      // gameVersion 取自 patchnotes.js 原文（不必開瀏覽器）；頁內版本於 setup 後再比一次。
      const msg = checkBatchHeader(headerRecord, {
        toolVersion: TOOL_VERSION,
        seed: opts.seed,
        gameVersion: srcGameVersion == null ? headerRecord.gameVersion : srcGameVersion,
      });
      if (msg) {
        process.stderr.write(`${msg}\n請改用新的 --out 目錄，或以原批次的參數續跑。\n`);
        return 2;
      }
    }
  }

  // error 局不算完成：續跑要重試它（resumeDoneKeys）。
  const queue = pendingCombos(combos, resumeDoneKeys(manifest ? dedupeLatest(existing) : existing));
  fs.mkdirSync(outDir, { recursive: true });

  let apiHits = 0;
  let restarts = 0;
  const written = [];
  let liveVersion = srcGameVersion || (headerRecord ? headerRecord.gameVersion : null);
  let fatal = null;

  const finishUp = (code) => {
    // 同 key 只算最後一筆：重跑過的組合不得在統計裡計兩次。
    const all = dedupeLatest(existing.concat(written));
    fs.writeFileSync(path.join(outDir, 'report.md'), summarize(all), 'utf8');
    process.stdout.write(`api_hits=${apiHits}\n`);
    process.stdout.write(`browser_restarts=${restarts}\n`);
    if (experimentSession) Object.assign(experimentSession, { apiHits, browserRestarts: restarts });
    return code;
  };

  if (queue.length === 0) return finishUp(0);

  // ── dev server：可達則沿用，否則（預設埠）自行起一個，結束時關掉 ──────────
  let srv = null;
  const serverReady = await reachable(baseUrl);
  if (strategy != null && serverReady) {
    const served = await fetch(new URL('tools/bot/driver.mjs', baseUrl), { signal: AbortSignal.timeout(5000) });
    if (!served.ok || await served.text() !== fs.readFileSync(path.join(HERE, 'driver.mjs'), 'utf8')) {
      throw new UsageError('5173/baseUrl serves different project sources; stop and identify owner');
    }
  }
  if (!serverReady) {
    if (!isDefaultServer(baseUrl)) throw new UsageError(`--baseUrl ${baseUrl} 無法連線`);
    srv = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, stdio: 'ignore' });
    let up = false;
    for (let i = 0; i < 100 && !up; i++) { up = await reachable(baseUrl); if (!up) await sleep(200); }
    if (!up) { try { srv.kill(); } catch { /* */ } throw new UsageError(`無法啟動 dev server（${baseUrl}）`); }
  }

  const { chromium } = require('playwright');
  const maxBatches = Math.ceil((opts.maxSimSec * 120) / BATCH_TICKS) + 4;

  // 引擎 rAF 迴圈必須在任何頁面腳本前失效——驅動層是唯一的更新來源。
  const rafStub = () => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  };

  /** 開一個乾淨 context（rAF 停用＋API 全攔截）並等 __DBG 就緒。 */
  async function openPage(browser) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    try {
      await context.addInitScript(rafStub);
      await context.route('**/api/**', (route) => { apiHits++; route.abort(); });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      // polling 必填：rAF 已被置換，waitForFunction 的預設 raf 輪詢永遠等不到。
      await page.waitForFunction(() => !!window.__DBG, null, { timeout: 60000, polling: 100 });
      return { context, page };
    } catch (e) {
      await context.close();
      throw e;
    }
  }

  /** 開一頁讀 live registry；漂移的 ids.json 會讓整批跑到錯的組合上。 */
  async function readLiveIds() {
    const browser = await chromium.launch();
    try {
      const { context, page } = await openPage(browser);
      try {
        // 這是前置檢查，不套用 --evalTimeoutMs（那是給單局用的護欄）。
        return await evaluateWithTimeout(page, async () => {
          const biomes = (await import('/src/art/biomes.js')).BIOMES.map((b) => b.id);
          const chars = (await import('/src/game/content/registry.js')).Characters.ids();
          return { biomes, chars };
        }, null, DEFAULT_EVAL_TIMEOUT_MS);
      } finally {
        await context.close();
      }
    } finally {
      try { await browser.close(); } catch { /* */ }
    }
  }

  const cfgOf = (job) => ({
    biome: job.biome, char: job.char, diff: job.diff, mode: 'normal', runIdx: job.runIdx, seed: opts.seed,
  });

  function errorRecord(job, e) {
    return makeRecord(cfgOf(job), {
      cleared: false, endReason: 'error', runResult: null, time: 0, level: 0, kills: 0, score: 0,
      stage: 0, deathSrc: null, dmgTakenBySrc: {}, dmgBySource: {}, weapons: [], abilities: [],
      bossKills: 0, reaperSlain: false, hpTimeline: [], simMs: 0, ticks: 0,
      gameVersion: liveVersion || 'unknown',
      error: String((e && e.message) || e),
    });
  }

  function appendRecord(rec) {
    if (strategy != null) rec.strategy = strategy;
    const errs = validateRecord(rec);
    if (errs.length) {
      rec.result = 'error';
      rec.endReason = 'error';
      rec.error = `${rec.error ? rec.error + ' | ' : ''}validateRecord 缺漏: ${errs.join(',')}`;
    }
    fs.appendFileSync(runsPath, JSON.stringify(rec) + '\n', 'utf8');
    written.push(rec);
  }

  async function runJob(browser, job) {
    const { context, page } = await openPage(browser);
    try {
      const pageErrors = [];
      page.on('pageerror', (e) => pageErrors.push(String(e)));

      const info = await evaluateWithTimeout(page, async () => {
        window.__drv = await import('/tools/bot/driver.mjs');
        return window.__drv.setup();
      }, null, evalTimeoutMs);
      if (headerRecord && headerRecord.gameVersion !== info.gameVersion) {
        const err = new Error(
          `批次識別不符:gameVersion（既有檔案為 ${headerRecord.gameVersion}，本次為 ${info.gameVersion}）`
        );
        err.fatalBatch = true;
        throw err;
      }
      if (srcGameVersion && srcGameVersion !== info.gameVersion) {
        const err = new Error(
          `批次識別不符:gameVersion（原始碼為 ${srcGameVersion}，頁內為 ${info.gameVersion}）`
        );
        err.fatalBatch = true;
        throw err;
      }
      liveVersion = info.gameVersion;

      await evaluateWithTimeout(page, (c) => window.__drv.startRun(c), {
        biomeId: job.biome, characterId: job.char, difficulty: job.diff,
        mode: 'normal', seed: opts.seed, maxSimSec: opts.maxSimSec, strategy: strategy || 'A',
      }, evalTimeoutMs);
      let res = null;
      for (let i = 0; i < maxBatches; i++) {
        res = await evaluateWithTimeout(page, (k) => window.__drv.step(k), BATCH_TICKS, evalTimeoutMs);
        if (res && res.done) break;
      }
      const raw = await evaluateWithTimeout(page, () => window.__drv.collect(), null, evalTimeoutMs);
      if (pageErrors.length && !raw.error) raw.error = pageErrors[0];
      const rec = makeRecord(cfgOf(job), raw);
      if (strategy != null) {
        if (raw.strategy !== strategy) throw new Error('driver strategy mismatch');
        rec.choiceAudit = raw.choiceAudit;
      }
      // 頁面級錯誤不得被 makeRecord 推導成 death/timeout——那會讓壞資料混進平衡結論。
      if (pageErrors.length || raw.endReason === 'error') {
        rec.result = 'error';
        rec.endReason = 'error';
        if (!rec.error) rec.error = pageErrors[0] || 'page error';
      }
      return rec;
    } finally {
      await context.close();
    }
  }

  async function worker() {
    if (!queue.length) return;
    let browser;
    try {
      browser = await chromium.launch();
    } catch (e) {
      // 單一 worker 起不了瀏覽器不該拖垮整批：其餘 worker 續跑，未跑組合由 exit 3 反映。
      if (strategy != null) fatal = new Error('Chromium launch failed: ' + ((e && e.message) || e));
      process.stderr.write(`worker 無法啟動 Chromium，該 worker 退出：${(e && e.message) || e}\n`);
      return;
    }
    let sinceRestart = 0;
    let consecFail = 0;
    try {
      while (queue.length && !fatal) {
        if (sinceRestart >= restartEvery) {
          // 只重開「自己的」browser，且在兩局之間，不影響其他 worker 的在途局。
          try {
            await browser.close();
            browser = await chromium.launch();
          } catch (e) {
            if (strategy != null) fatal = new Error('Chromium restart failed: ' + ((e && e.message) || e));
            process.stderr.write(`worker 重開 Chromium 失敗，該 worker 退出：${(e && e.message) || e}\n`);
            browser = null;
            return;
          }
          restarts++;
          sinceRestart = 0;
        }
        const job = queue.shift();
        sinceRestart++;
        let rec;
        try {
          rec = await runJob(browser, job);
        } catch (e) {
          if (e && e.fatalBatch) { fatal = e; break; }
          rec = errorRecord(job, e);
        }
        appendRecord(rec);
        consecFail = nextConsecFail(consecFail, rec);
        if (consecFail >= MAX_CONSEC_FAIL) {
          process.stderr.write(`worker 連續 ${MAX_CONSEC_FAIL} 局失敗，提前退出\n`);
          break;
        }
      }
    } finally {
      if (browser) { try { await browser.close(); } catch { /* */ } }
    }
  }

  try {
    const live = await readLiveIds();
    if (JSON.stringify(live) !== JSON.stringify({ biomes: ids.biomes, chars: ids.chars })) {
      fs.writeFileSync(IDS_PATH, JSON.stringify(live, null, 2) + '\n', 'utf8');
      process.stderr.write(
        'tools/bot/ids.json 與 live registry 不符（內容已更新為目前的登錄表）。\n'
        + '請確認組合清單後重跑本批次。\n'
      );
      return 2;
    }

    const P = Math.max(1, Math.min(opts.parallel, queue.length));
    await Promise.all(Array.from({ length: P }, () => worker()));
  } finally {
    if (srv) { try { srv.kill(); } catch { /* */ } }
  }

  if (fatal) {
    process.stderr.write(`${fatal.message}\n請改用新的 --out 目錄，或以原批次的參數續跑。\n`);
    return 2;
  }
  // exit 3 只在確有未跑組合時：連敗提前退出但佇列剛好跑完仍算成功。
  return finishUp(queue.length ? 3 : 0);
}

let code = 0;
try {
  code = await main();
} catch (e) {
  if (e instanceof UsageError) {
    process.stderr.write(`${e.message}\n`);
    code = 1;
  } else {
    process.stderr.write(`${(e && e.stack) || e}\n`);
    code = 1;
  }
}
// 用 exitCode 而非 process.exit：後者會在 stdout 尚未 flush 時就砍掉程序（管線輸出會被截斷）。
if (experimentSession) {
  Object.assign(experimentSession, { endedAt: new Date().toISOString(), wallMs: Date.now() - experimentSession.startedMs, exitCode: code });
  writeJson(experimentSession.file, experimentSession);
}
process.exitCode = code;
