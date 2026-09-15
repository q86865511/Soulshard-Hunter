// tools/bot/summarize.mjs — R6 彙整報告：純函式 summarize(records) → Markdown。
// 純 ESM，零 Node API；Node 與瀏覽器共用。
// 對應 specs/bot-balance-sim/requirements.md R6、R9、design.md「測試策略」fixture F6、tasks.md T5。

// nearest-rank 分位數：sortedAsc 已升冪排序，p ∈ (0,1]；回傳第 ceil(p*n) 筆（1-based）。
function nearestRank(sortedAsc, p) {
  const n = sortedAsc.length;
  if (n === 0) return null;
  const idx = Math.min(Math.max(Math.ceil(p * n), 1), n);
  return sortedAsc[idx - 1];
}

function round1(x) {
  return Math.round(x * 100);
}

// 一格（biome×diff）的統計：n＝全部筆數、有效＝排除 timeout/error。
function computeGroupStats(records) {
  const n = records.length;
  const effective = records.filter((r) => r.result !== 'timeout' && r.result !== 'error');
  const effN = effective.length;

  let clearRate = null; // number|null（null＝N/A）
  let p25 = null;
  let p50 = null;
  let p75 = null;
  if (effN > 0) {
    const clearCount = effective.filter((r) => r.result === 'clear').length;
    clearRate = round1(clearCount / effN);
    const times = effective.map((r) => r.time).slice().sort((a, b) => a - b);
    p25 = nearestRank(times, 0.25);
    p50 = nearestRank(times, 0.5);
    p75 = nearestRank(times, 0.75);
  }

  // 死因 top3：只看 result 'death' 的 deathSrc，null 略過；分母為該格非 null 死因的死亡筆數。
  const deathRecords = records.filter((r) => r.result === 'death' && r.deathSrc != null);
  const deathTotal = deathRecords.length;
  const counts = new Map();
  for (const r of deathRecords) counts.set(r.deathSrc, (counts.get(r.deathSrc) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top3 = ranked
    .slice(0, 3)
    .map(([src, c]) => `${src} ${round1(c / deathTotal)}%`);
  const topSrc = ranked.length > 0 ? ranked[0][0] : null;
  const topSharePct = deathTotal > 0 && ranked.length > 0 ? round1(ranked[0][1] / deathTotal) : null;

  return { n, effN, clearRate, p25, p50, p75, top3, deathTotal, topSrc, topSharePct };
}

function computeCharStats(records) {
  const byChar = new Map();
  for (const r of records) {
    if (!byChar.has(r.char)) byChar.set(r.char, []);
    byChar.get(r.char).push(r);
  }
  const rows = [];
  for (const [char, recs] of byChar) {
    const effective = recs.filter((r) => r.result !== 'timeout' && r.result !== 'error');
    const effN = effective.length;
    let rate = null;
    let median = null;
    if (effN > 0) {
      const clearCount = effective.filter((r) => r.result === 'clear').length;
      rate = round1(clearCount / effN);
      const times = effective.map((r) => r.time).slice().sort((a, b) => a - b);
      median = nearestRank(times, 0.5);
    }
    rows.push({ char, rate, median });
  }
  rows.sort((a, b) => {
    const ra = a.rate === null ? -1 : a.rate;
    const rb = b.rate === null ? -1 : b.rate;
    if (rb !== ra) return rb - ra;
    const ma = a.median === null ? -1 : a.median;
    const mb = b.median === null ? -1 : b.median;
    return mb - ma;
  });
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

export function summarize(records) {
  const lines = [];
  lines.push('# Bot 平衡測試報告');
  lines.push('');
  lines.push('本報告量的是系統性質，不代表真人退出與重試行為。');
  lines.push('遊戲 RNG 不受控，局間差異屬正常。');
  lines.push('策略等級：走位＋懂進化的選擇（event/curse 固定第一項、shop 不買）。');
  lines.push('');

  if (!Array.isArray(records) || records.length === 0) {
    lines.push('無資料。');
    return lines.join('\n');
  }

  // 生態×難度 格表（依 records 出現順序分組，避免依賴外部排序）。
  const groupOrder = [];
  const groups = new Map();
  for (const r of records) {
    const key = `${r.biome}::${r.diff}`;
    if (!groups.has(key)) {
      groups.set(key, { biome: r.biome, diff: r.diff, records: [] });
      groupOrder.push(key);
    }
    groups.get(key).records.push(r);
  }

  lines.push('## 生態×難度');
  lines.push('| biome | diff | n（有效） | 通關率 | p25 | p50 | p75 | 死因 top3 |');
  lines.push('|---|---|---|---|---|---|---|---|');

  const anomalies = [];
  for (const key of groupOrder) {
    const g = groups.get(key);
    const stats = computeGroupStats(g.records);
    const clearRateStr = stats.clearRate === null ? 'N/A' : `${stats.clearRate}%`;
    const p25Str = stats.p25 === null ? 'N/A' : `${stats.p25}`;
    const p50Str = stats.p50 === null ? 'N/A' : `${stats.p50}`;
    const p75Str = stats.p75 === null ? 'N/A' : `${stats.p75}`;
    const top3Str = stats.top3.length > 0 ? stats.top3.join(', ') : '-';
    lines.push(
      `| ${g.biome} | ${g.diff} | ${stats.n}（有效 ${stats.effN}） | ${clearRateStr} | ${p25Str} | ${p50Str} | ${p75Str} | ${top3Str} |`
    );

    if (stats.effN > 0) {
      if (stats.clearRate === 0 || stats.clearRate === 100) {
        anomalies.push(`${g.biome}×${g.diff}：通關率 ${stats.clearRate}%`);
      }
      if (stats.deathTotal > 0 && stats.topSharePct !== null && stats.topSharePct >= 60) {
        anomalies.push(`${g.biome}×${g.diff}：死因 ${stats.topSrc} ${stats.topSharePct}%`);
      }
    }
  }
  lines.push('');

  // 角色表
  const charRows = computeCharStats(records);
  lines.push('## 角色');
  lines.push('| char | 通關率 | 中位存活 | 名次 |');
  lines.push('|---|---|---|---|');
  for (const row of charRows) {
    const rateStr = row.rate === null ? 'N/A' : `${row.rate}%`;
    const medianStr = row.median === null ? 'N/A' : `${row.median}`;
    lines.push(`| ${row.char} | ${rateStr} | ${medianStr} | ${row.rank} |`);
  }
  lines.push('');

  // 角色間通關率極差 ≥50 個百分點
  const ratedRows = charRows.filter((r) => r.rate !== null);
  if (ratedRows.length >= 2) {
    const sorted = ratedRows.slice().sort((a, b) => b.rate - a.rate);
    const hi = sorted[0];
    const lo = sorted[sorted.length - 1];
    const diff = hi.rate - lo.rate;
    if (diff >= 50) {
      anomalies.push(`角色極差 ${hi.char} vs ${lo.char}：${diff}pp`);
    }
  }

  lines.push('## 異常清單');
  if (anomalies.length === 0) {
    lines.push('無異常');
  } else {
    for (const a of anomalies) lines.push(`- ${a}`);
  }

  return lines.join('\n');
}
