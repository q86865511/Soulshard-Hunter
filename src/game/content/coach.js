// content/coach.js — P1-4 結算教練:純函式,由「本局實際資料」產生規則式建議。
// 不改任何狀態;所有欄位防禦 undefined;無法判斷時不顯示武斷建議(見各規則的門檻)。
// coachFor(run, player) -> { lines: [{ icon, text, tone }] }  tone: 'good'|'warn'|'info',≤5 行。
import { isWeaponMaxed } from '../balance.js';
import { isSeen } from './codex.js';
import { Abilities, Enemies } from './registry.js';

// 死亡來源:完整承傷標籤 -> 中文顯示名(contact:<id> 查敵名,查無用 id)。
function deathSrcLabel(src) {
  if (!src || src === 'other') return '未知來源';
  const ci = src.indexOf(':');
  const head = ci >= 0 ? src.slice(0, ci) : src;
  const rest = ci >= 0 ? src.slice(ci + 1) : '';
  if (head === 'contact') { const e = Enemies.get(rest); return '近戰接觸(' + ((e && e.name) || rest) + ')'; }
  if (head === 'proj') return '敵方彈幕';
  if (head === 'blast') return '自爆衝擊';
  if (head === 'hazard') return '地形陷阱';
  if (head === 'boss') return '首領招式';
  if (head === 'event') return rest === 'mine' ? '魂晶詭雷' : rest === 'explosion' ? '事件爆炸' : '事件危害';
  return '未知來源';
}

// 承傷類別(冒號前綴聚類) -> { label, advice }。advice 為 null 時不附建議。
const CAT = {
  contact: { label: '近戰接觸', advice: '可優先選移速、擊退或範圍武器保持距離' },
  proj: { label: '敵方彈幕', advice: '留意走位遮蔽,優先擊殺遠程敵人' },
  hazard: { label: '地形陷阱', advice: '移動時留意地面預警(收縮圈與 ! 記號)' },
  boss: { label: '首領招式', advice: '預警出現時先脫離再輸出' },
  blast: { label: '爆裂單位', advice: '與自爆單位和爆裂物保持距離' },
  event: { label: '事件危害', advice: '與自爆單位和爆裂物保持距離' },
  other: { label: '未知來源', advice: null },
};

export function coachFor(run, player) {
  run = run || {};
  const weapons = (player && player.weapons) || [];
  const lines = [];

  // 1. 主力輸出(勝敗都給,正向摘要):dmgBySource 總和 >0 時取最大 key。
  const dmgSrc = run.dmgBySource || {};
  let topKey = null, topVal = 0, dmgTotal = 0;
  for (const k in dmgSrc) { const v = dmgSrc[k] || 0; if (v > 0) { dmgTotal += v; if (v > topVal) { topVal = v; topKey = k; } } }
  if (dmgTotal > 0 && topKey) {
    lines.push({ icon: '⚔', text: '主力輸出:「' + topKey + '」佔 ' + Math.round((topVal / dmgTotal) * 100) + '%', tone: 'good' });
  }

  // 2. 死亡來源(死亡且 deathSrc 存在)。
  if (run.result === 'death' && run.deathSrc) {
    lines.push({ icon: '☠', text: '陣亡於:' + deathSrcLabel(run.deathSrc), tone: 'warn' });
  }

  // 3. 承傷最高來源 + 一條建議。總和 <30 視為資料不足,不顯示;最大類別佔比 ≥40% 才給建議。
  const taken = run.dmgTakenBySrc || {};
  const catSum = {}; let takenTotal = 0;
  for (const k in taken) {
    const v = taken[k] || 0; if (v <= 0) continue;
    takenTotal += v;
    const cat = (k.indexOf(':') >= 0 ? k.slice(0, k.indexOf(':')) : k);
    catSum[cat] = (catSum[cat] || 0) + v;
  }
  if (takenTotal >= 30) {
    let bestCat = null, bestVal = 0;
    for (const c in catSum) if (catSum[c] > bestVal) { bestVal = catSum[c]; bestCat = c; }
    if (bestCat) {
      const info = CAT[bestCat] || CAT.other;
      const pct = Math.round((bestVal / takenTotal) * 100);
      lines.push({ icon: '🛡', text: '承傷最高:' + info.label + ' 佔 ' + pct + '%', tone: 'warn' });
      // 建議獨立一行:結算欄寬有限,併在同行會被裁切掉建議尾巴(教練的核心價值)
      if (pct >= 40 && info.advice) lines.push({ icon: '💡', text: '建議:' + info.advice, tone: 'info' });
    }
  }

  // 4. 融合提示(≤1 條):第一把「已滿級、未進化、有進化路線」的武器。
  const w = weapons.find((x) => x && x.def && isWeaponMaxed(x) && !x.def.evolved && x.def.evolveInto);
  if (w) {
    if (isSeen('rec', w.def.id) && w.def.evolveReq) {   // 配方已發現才點名所需被動
      const req = Abilities.get(w.def.evolveReq);
      lines.push({ icon: '✦', text: '「' + w.def.name + '」已滿級——取得被動「' + ((req && req.name) || w.def.evolveReq) + '」即可進化', tone: 'info' });
    } else {   // 配方未發現:不點名被動、不提結果(R22 裁決)
      lines.push({ icon: '✦', text: '「' + w.def.name + '」已滿級——或許還有進化的可能…', tone: 'info' });
    }
  }

  return { lines: lines.slice(0, 5) };
}
