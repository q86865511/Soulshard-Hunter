// tools/bot/gen-ids.mjs — 生成 tools/bot/ids.json（生態 id ＋ 角色 id）。
//
// 用法：node tools/bot/gen-ids.mjs [--baseUrl URL]
// 開一頁讀 live registry（BIOMES / Characters.ids()），順序照遊戲原順序，不做排序。
// CLI 與 --dry-run 只讀這個檔，因此不必開瀏覽器。產物入 git（已核可為生成檔）。
//
// 對應 specs/bot-balance-sim：requirements.md R1、design.md「取捨」ids.json 一條、tasks.md T7。
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const OUT_PATH = path.join(HERE, 'ids.json');
const DEFAULT_BASE_URL = 'http://127.0.0.1:5173/';

const require = createRequire(path.join(ROOT, 'test', 'package.json'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function reachable(url) {
  try { await fetch(url, { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}

// 參數驗證必須在 spawn dev server／launch chromium 之前——否則錯的 URL 要空等 20 秒才報錯。
function parseBaseUrl(argv) {
  const i = argv.indexOf('--baseUrl');
  if (i === -1) return DEFAULT_BASE_URL;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) {
    process.stderr.write('--baseUrl 缺少值（用法：node tools/bot/gen-ids.mjs [--baseUrl http://127.0.0.1:5173/]）\n');
    process.exit(1);
  }
  let u;
  try { u = new URL(v); } catch {
    process.stderr.write(`--baseUrl 不是合法的 URL：${v}\n`);
    process.exit(1);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    process.stderr.write(`--baseUrl 必須是 http(s) URL，收到：${v}\n`);
    process.exit(1);
  }
  return v;
}

const baseUrl = parseBaseUrl(process.argv.slice(2));

let srv = null;
let browser = null;
try {
  if (!(await reachable(baseUrl))) {
    srv = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, stdio: 'ignore' });
    let up = false;
    for (let i = 0; i < 100 && !up; i++) { up = await reachable(baseUrl); if (!up) await sleep(200); }
    if (!up) throw new Error(`無法啟動 dev server（${baseUrl}）`);
  }

  const { chromium } = require('playwright');
  browser = await chromium.launch();
  const context = await browser.newContext();
  // 與批次跑局一致地停用引擎 rAF 迴圈：只讀 registry，不需要遊戲自己在跑。
  await context.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  });
  const page = await context.newPage();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.__DBG, null, { timeout: 60000, polling: 100 });
  const ids = await page.evaluate(async () => {
    const biomes = (await import('/src/art/biomes.js')).BIOMES.map((b) => b.id);
    const chars = (await import('/src/game/content/registry.js')).Characters.ids();
    return { biomes, chars };
  });
  fs.writeFileSync(OUT_PATH, JSON.stringify(ids, null, 2) + '\n', 'utf8');
  process.stdout.write(`已寫入 ${OUT_PATH}（生態 ${ids.biomes.length} · 角色 ${ids.chars.length}）\n`);
  await context.close();
} finally {
  if (browser) { try { await browser.close(); } catch { /* */ } }
  if (srv) { try { srv.kill(); } catch { /* */ } }
}
