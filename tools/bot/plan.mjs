// tools/bot/plan.mjs
//
// 純函式層：CLI 參數解析、組合展開、續跑/分片輔助、批次識別檢查、JSONL 容錯讀取。
// 零 Node API（不得 import fs/path/process）——argv 與檔案文字一律由呼叫端（tools/bot/run.mjs）傳入，
// 使本檔同時可被 Node 測試與（理論上）瀏覽器 import。
//
// 對應 specs/bot-balance-sim/requirements.md R1、R8；design.md「介面與資料模型」plan.mjs 一行；tasks.md T6。

/** CLI 使用方式錯誤（未知 id、參數值不合法等）。 */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

/** runs.jsonl 中段資料損壞（無法自動修復）。line 為 1-based 行號。 */
export class CorruptError extends Error {
  constructor(message, line) {
    super(message);
    this.name = 'CorruptError';
    this.line = line;
  }
}

const DEFAULT_DIFFS = '1,2,3,4,5';
const DEFAULT_RUNS = 5;
const DEFAULT_PARALLEL = 4;
const DEFAULT_OUT = 'tools/bot/out';
const DEFAULT_SEED = 1;
const DEFAULT_SHARD = '1/1';
const DEFAULT_MAX_SIM_SEC = 1200 + 30 + 120;

function splitCsv(raw) {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function resolveIdList(raw, legalIds, kindLabel) {
  if (raw === 'all') return legalIds.slice();
  const requested = splitCsv(raw);
  if (requested.length === 0) {
    throw new UsageError(`${kindLabel} 清單不可為空`);
  }
  const unknown = requested.filter((id) => !legalIds.includes(id));
  if (unknown.length > 0) {
    throw new UsageError(
      `未知的 ${kindLabel} id: ${unknown.join(', ')}（合法值：${legalIds.join(', ')}）`
    );
  }
  return requested;
}

/** 依 diffs 原始逗號分隔字串解析為 1~5 整數陣列；空字串或範圍外一律 UsageError。 */
function parseDiffs(raw) {
  const tokens = splitCsv(raw);
  if (tokens.length === 0) {
    throw new UsageError('--diffs 不可為空');
  }
  return tokens.map((s) => {
    const n = Number(s);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 5) {
      throw new UsageError(`--diffs 必須是 1~5 的整數，收到: ${s}`);
    }
    return n;
  });
}

/** 取旗標的值（下一個 argv 元素）；值缺漏或被另一個旗標佔走（以 -- 開頭）一律 UsageError。 */
function takeValue(argv, idx, flag) {
  const value = argv[idx + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new UsageError(`${flag} 缺少值`);
  }
  return value;
}

function parsePositiveInt(raw, flagName) {
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
    throw new UsageError(`${flagName} 必須是 >=1 的整數，收到: ${raw}`);
  }
  return n;
}

function parseShard(raw) {
  const m = /^(\d+)\/(\d+)$/.exec(String(raw).trim());
  if (!m) {
    throw new UsageError(`--shard 格式錯誤，應為 i/n（例如 1/2），收到: ${raw}`);
  }
  const i = Number(m[1]);
  const n = Number(m[2]);
  if (n < 1 || i < 1 || i > n) {
    throw new UsageError(`--shard 數值不合法，需 1<=i<=n 且 n>=1，收到: ${raw}`);
  }
  return { i, n };
}

/**
 * 解析 CLI 參數。
 * @param {string[]} argv 不含 node 與腳本名的參數陣列
 * @param {{biomes:string[], chars:string[]}} ids 合法 id 清單（由呼叫端提供）
 */
export function parseArgs(argv, ids) {
  const raw = {
    biomes: 'all',
    chars: 'all',
    diffs: DEFAULT_DIFFS,
    runs: String(DEFAULT_RUNS),
    parallel: String(DEFAULT_PARALLEL),
    out: DEFAULT_OUT,
    seed: String(DEFAULT_SEED),
    shard: DEFAULT_SHARD,
    maxSimSec: String(DEFAULT_MAX_SIM_SEC),
  };
  let dryRun = false;

  let idx = 0;
  while (idx < argv.length) {
    const flag = argv[idx];
    switch (flag) {
      case '--biomes':
        raw.biomes = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--chars':
        raw.chars = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--diffs':
        raw.diffs = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--runs':
        raw.runs = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--parallel':
        raw.parallel = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--out':
        raw.out = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--seed':
        raw.seed = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--shard':
        raw.shard = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--maxSimSec':
        raw.maxSimSec = takeValue(argv, idx, flag);
        idx++;
        break;
      case '--dry-run':
        dryRun = true;
        break;
      default:
        throw new UsageError(`未知參數: ${flag}`);
    }
    idx++;
  }

  const biomes = resolveIdList(raw.biomes, ids.biomes, 'biome');
  const chars = resolveIdList(raw.chars, ids.chars, 'char');
  const diffs = parseDiffs(raw.diffs);
  const runs = parsePositiveInt(raw.runs, '--runs');
  const parallel = parsePositiveInt(raw.parallel, '--parallel');
  const seed = Number(raw.seed);
  if (!Number.isFinite(seed) || !Number.isInteger(seed)) {
    throw new UsageError(`--seed 必須是整數，收到: ${raw.seed}`);
  }
  const maxSimSec = Number(raw.maxSimSec);
  if (!Number.isFinite(maxSimSec) || maxSimSec <= 0) {
    throw new UsageError(`--maxSimSec 必須是 >0 的數字，收到: ${raw.maxSimSec}`);
  }
  const shard = parseShard(raw.shard);

  return {
    biomes,
    chars,
    diffs,
    runs,
    parallel,
    out: raw.out,
    seed,
    shard,
    maxSimSec,
    dryRun,
  };
}

/**
 * 依 biomes×chars×diffs×runIdx(1..runs) 展開組合，順序固定。
 * @param {{biomes:string[], chars:string[], diffs:number[], runs:number}} opts
 * @returns {{biome:string, char:string, diff:number, runIdx:number}[]}
 */
export function expandCombos(opts) {
  const combos = [];
  for (const biome of opts.biomes) {
    for (const char of opts.chars) {
      for (const diff of opts.diffs) {
        for (let runIdx = 1; runIdx <= opts.runs; runIdx++) {
          combos.push({ biome, char, diff, runIdx });
        }
      }
    }
  }
  return combos;
}

/** 組合的識別 key（不含 seed——seed 屬批次識別，見 checkBatchHeader）。 */
export function keyOf(combo) {
  return `${combo.biome}|${combo.char}|${combo.diff}|${combo.runIdx}`;
}

/** 回未完成的組合（保序）。doneKeys 可為 Set 或陣列。 */
export function pendingCombos(all, doneKeys) {
  const done = doneKeys instanceof Set ? doneKeys : new Set(doneKeys);
  return all.filter((combo) => !done.has(keyOf(combo)));
}

/** 第 i 片（1-based）：取 index % n === i-1 的元素。 */
export function shardOf(list, i, n) {
  return list.filter((_, index) => index % n === i - 1);
}

/** 估算總耗時：totalMs = n*medianMs/parallel。 */
export function estimate(n, parallel, medianMs) {
  const totalMs = (n * medianMs) / parallel;
  return { totalMs, hours: totalMs / 3600000 };
}

/**
 * 檢查既有 runs.jsonl 的批次識別（首行）是否與本次參數相符。
 * @param {object|null|undefined} firstRecord 既有檔案的第一筆紀錄
 * @param {{toolVersion:*, seed:*, gameVersion:*}} expected 本次參數
 * @returns {string|null} 不符則回描述字串（含欄位名與兩個值），相同或 firstRecord 為空回 null
 */
export function checkBatchHeader(firstRecord, expected) {
  if (firstRecord == null) return null;
  const fields = ['toolVersion', 'seed', 'gameVersion'];
  for (const field of fields) {
    const existing = firstRecord[field];
    const current = expected[field];
    if (existing !== current) {
      return `批次識別不符:${field}（既有檔案為 ${existing}，本次參數為 ${current}）`;
    }
  }
  return null;
}

/**
 * 容錯讀取 JSONL 文字：逐行 JSON.parse（忽略空白行）。
 * 最後一個非空行無法解析（寫到一半中斷）→ 丟棄該行並回 truncatedTail:true。
 * 中段任一非空行無法解析 → 拋 CorruptError(line)（1-based）。
 */
export function readJsonlTolerant(text) {
  const lines = text.split(/\r?\n/);
  const nonBlankIdx = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() !== '') nonBlankIdx.push(i);
  }
  const lastNonBlank = nonBlankIdx.length > 0 ? nonBlankIdx[nonBlankIdx.length - 1] : -1;

  const records = [];
  let truncatedTail = false;

  for (const i of nonBlankIdx) {
    const line = lines[i];
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      if (i === lastNonBlank) {
        truncatedTail = true;
        break;
      }
      throw new CorruptError(`JSONL 第 ${i + 1} 行損壞，無法解析（非尾行，判定為資料損壞）`, i + 1);
    }
    records.push(parsed);
  }

  return { records, truncatedTail };
}
