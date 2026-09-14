// tools/bot/test/plan.test.mjs
//
// TDD 紅燈階段：測試 tools/bot/plan.mjs（此檔尚未實作，由另一代理於本測試鎖定後完成）。
// 對應 specs/bot-balance-sim/requirements.md R1、R8；design.md「測試策略」R1「parseArgs 展開與錯誤」、
// R8「續跑與分片」「批次識別不符即拒絕」「尾行截斷恢復」「中段損壞停止」的單元部分；tasks.md T6。
//
// 約束（分派任務硬性要求）：本檔只寫測試，不寫任何 tools/bot/plan.mjs 的實作碼。
// 執行：node --test "tools/bot/test/*.test.mjs"（於專案根）。

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UsageError,
  CorruptError,
  parseArgs,
  expandCombos,
  keyOf,
  pendingCombos,
  shardOf,
  checkBatchHeader,
  readJsonlTolerant,
  estimate,
} from '../plan.mjs';

// 合法 id 清單（由呼叫端提供，plan.mjs 本身不得硬編 id）
const IDS = { biomes: ['crypt', 'desert', 'swamp'], chars: ['hunter', 'ranger', 'mage'] };

// ---------------------------------------------------------------------------
// R1: parseArgs 展開與錯誤（design.md 測試策略表 R1 列；requirements.md R1 驗收條件）
// ---------------------------------------------------------------------------

test('parseArgs: --biomes crypt --chars hunter --diffs 1 --runs 1 展開後恰 1 組合', () => {
  const opts = parseArgs(
    ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '1'],
    IDS
  );
  const combos = expandCombos(opts);
  assert.equal(combos.length, 1);
});

test('parseArgs: 未知 biome id 拋 UsageError 且 message 含全部合法 biome id', () => {
  assert.throws(
    () => parseArgs(['--biomes', 'nope', '--chars', 'hunter', '--diffs', '1'], IDS),
    (err) => {
      assert.ok(err instanceof UsageError, '應為 UsageError');
      for (const id of IDS.biomes) {
        assert.ok(err.message.includes(id), `訊息應含合法 biome id: ${id}`);
      }
      return true;
    }
  );
});

test('parseArgs: 未知 char id 拋 UsageError 且 message 含全部合法 char id', () => {
  assert.throws(
    () => parseArgs(['--biomes', 'crypt', '--chars', 'nope', '--diffs', '1'], IDS),
    (err) => {
      assert.ok(err instanceof UsageError, '應為 UsageError');
      for (const id of IDS.chars) {
        assert.ok(err.message.includes(id), `訊息應含合法 char id: ${id}`);
      }
      return true;
    }
  );
});

test('parseArgs: --runs 0 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(
        ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--runs', '0'],
        IDS
      ),
    UsageError
  );
});

// ---------------------------------------------------------------------------
// expandCombos / keyOf：2 biomes×2 chars×2 diffs×runs 2 → 16 筆，key 不重複
// （plan.mjs 介面文件：expandCombos 依 biomes×chars×diffs×runIdx 展開；keyOf 不含 seed）
// ---------------------------------------------------------------------------

test('expandCombos: 2 biomes×2 chars×2 diffs×runs 2 回 16 筆，keyOf 全不重複', () => {
  const opts = parseArgs(
    [
      '--biomes', 'crypt,desert',
      '--chars', 'hunter,ranger',
      '--diffs', '1,2',
      '--runs', '2',
    ],
    IDS
  );
  const combos = expandCombos(opts);
  assert.equal(combos.length, 16);
  const keys = combos.map(keyOf);
  assert.equal(new Set(keys).size, 16, 'keyOf 產出的 16 把 key 不應有重複');
});

// ---------------------------------------------------------------------------
// R8: 續跑與分片（單元部分）
// ---------------------------------------------------------------------------

test('pendingCombos: 既有 2 個 key 回 n-2 筆', () => {
  const opts = parseArgs(
    [
      '--biomes', 'crypt,desert',
      '--chars', 'hunter,ranger',
      '--diffs', '1,2',
      '--runs', '2',
    ],
    IDS
  );
  const all = expandCombos(opts);
  const doneKeys = new Set([keyOf(all[0]), keyOf(all[3])]);
  const pending = pendingCombos(all, doneKeys);
  assert.equal(pending.length, all.length - 2);
});

test('shardOf: shardOf(list,1,2) 與 shardOf(list,2,2) 聯集＝全集、交集為空', () => {
  const list = Array.from({ length: 7 }, (_, i) => `item${i}`);
  const shard1 = shardOf(list, 1, 2);
  const shard2 = shardOf(list, 2, 2);

  const union = new Set([...shard1, ...shard2]);
  assert.equal(union.size, list.length, '聯集應等於全集大小');
  for (const item of list) {
    assert.ok(union.has(item), `全集元素 ${item} 應出現在聯集中`);
  }

  const intersection = shard1.filter((x) => shard2.includes(x));
  assert.equal(intersection.length, 0, '兩分片交集應為空');
});

// ---------------------------------------------------------------------------
// R8: 批次識別不符即拒絕（單元部分：checkBatchHeader 本身）
// ---------------------------------------------------------------------------

test('checkBatchHeader: seed 不符回含 "seed" 的字串；全相同回 null', () => {
  const firstRecord = { toolVersion: '0.1.0', seed: 1, gameVersion: 'V2.0' };

  const mismatchReason = checkBatchHeader(firstRecord, {
    toolVersion: '0.1.0',
    seed: 2,
    gameVersion: 'V2.0',
  });
  assert.equal(typeof mismatchReason, 'string');
  assert.ok(mismatchReason.includes('seed'), '不符原因字串應提及欄位名 seed');

  const sameReason = checkBatchHeader(firstRecord, {
    toolVersion: '0.1.0',
    seed: 1,
    gameVersion: 'V2.0',
  });
  assert.equal(sameReason, null);
});

// ---------------------------------------------------------------------------
// R8: 尾行截斷恢復（單元部分）
// ---------------------------------------------------------------------------

test('readJsonlTolerant: 尾行無法 JSON.parse → 截掉該行並回 truncatedTail:true', () => {
  const { records, truncatedTail } = readJsonlTolerant('{"a":1}\n{"b":2}\n{"c":');
  assert.equal(records.length, 2);
  assert.deepEqual(records[0], { a: 1 });
  assert.deepEqual(records[1], { b: 2 });
  assert.equal(truncatedTail, true);
});

// ---------------------------------------------------------------------------
// R8: 中段損壞停止（單元部分）
// ---------------------------------------------------------------------------

test('readJsonlTolerant: 中段行無法解析 → 拋 CorruptError 且 line===2', () => {
  assert.throws(
    () => readJsonlTolerant('{"a":1}\ngarbage\n{"c":3}'),
    (err) => {
      assert.ok(err instanceof CorruptError, '應為 CorruptError');
      assert.equal(err.line, 2, 'CorruptError.line 應為 1-based 行號 2');
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F1: --seed / --maxSimSec 的值必須是合法數字（--maxSimSec 需 >0）
// ---------------------------------------------------------------------------

test('parseArgs: --seed abc 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(
        ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--seed', 'abc'],
        IDS
      ),
    UsageError
  );
});

test('parseArgs: --seed 值缺漏 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--seed'], IDS),
    UsageError
  );
});

test('parseArgs: --maxSimSec abc 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(
        ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--maxSimSec', 'abc'],
        IDS
      ),
    UsageError
  );
});

test('parseArgs: --maxSimSec 0 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(
        ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--maxSimSec', '0'],
        IDS
      ),
    UsageError
  );
});

test('parseArgs: --maxSimSec -5 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(
        ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--maxSimSec', '-5'],
        IDS
      ),
    UsageError
  );
});

test('parseArgs: --seed 7 正常回 seed===7', () => {
  const opts = parseArgs(
    ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--seed', '7'],
    IDS
  );
  assert.equal(opts.seed, 7);
});

test('parseArgs: --maxSimSec 60 正常回 60', () => {
  const opts = parseArgs(
    ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1', '--maxSimSec', '60'],
    IDS
  );
  assert.equal(opts.maxSimSec, 60);
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F2: 旗標缺值／值位置被另一個旗標佔走 → 一律 UsageError（不是 TypeError）
// ---------------------------------------------------------------------------

test('parseArgs: --biomes 值缺漏 拋 UsageError（非 TypeError）', () => {
  assert.throws(() => parseArgs(['--biomes'], IDS), UsageError);
});

test('parseArgs: --chars 值缺漏 拋 UsageError（非 TypeError）', () => {
  assert.throws(() => parseArgs(['--chars'], IDS), UsageError);
});

test('parseArgs: --biomes --chars hunter（值位置是另一個旗標）拋 UsageError（非 TypeError）', () => {
  assert.throws(() => parseArgs(['--biomes', '--chars', 'hunter'], IDS), UsageError);
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F5: --biomes/--chars/--diffs 給空字串 → UsageError（不是靜默展開成空清單）
// ---------------------------------------------------------------------------

test('parseArgs: --biomes 空字串 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', '', '--chars', 'hunter', '--diffs', '1'], IDS),
    UsageError
  );
});

test('parseArgs: --chars 空字串 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', '', '--diffs', '1'], IDS),
    UsageError
  );
});

test('parseArgs: --diffs 空字串 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', ''], IDS),
    UsageError
  );
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F6: --diffs 值必須是 1~5 的整數
// ---------------------------------------------------------------------------

test('parseArgs: --diffs 0 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '0'], IDS),
    UsageError
  );
});

test('parseArgs: --diffs 6 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '6'], IDS),
    UsageError
  );
});

test('parseArgs: --diffs 1.5 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1.5'], IDS),
    UsageError
  );
});

test('parseArgs: --diffs -1 拋 UsageError', () => {
  assert.throws(
    () =>
      parseArgs(['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '-1'], IDS),
    UsageError
  );
});

test('parseArgs: --diffs 1,5 正常回 [1,5]', () => {
  const opts = parseArgs(
    ['--biomes', 'crypt', '--chars', 'hunter', '--diffs', '1,5'],
    IDS
  );
  assert.deepEqual(opts.diffs, [1, 5]);
});

// ---------------------------------------------------------------------------
// 第 1 波審查裁決 F7: estimate 覆蓋缺口
// ---------------------------------------------------------------------------

test('estimate(100,4,60000): totalMs===1500000，hours≈1500000/3600000', () => {
  const { totalMs, hours } = estimate(100, 4, 60000);
  assert.equal(totalMs, 1500000);
  assert.ok(Math.abs(hours - 1500000 / 3600000) < 1e-9);
});
