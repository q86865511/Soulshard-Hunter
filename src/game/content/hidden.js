// Hidden rooms (隱藏房間, #6): genuinely-hidden secret rooms that must be DISCOVERED on the
// map (the marker is invisible until you walk up to it). Entering pauses the run for a short
// event; the reward is SAVE-PERMANENT and claimable ONCE PER SAVE (tracked in META.hidden.claimed) —
// permanent gold / content unlocks / an easter egg, NOT a single-run ability or item.
import { P } from '../../engine/palette.js';
import { META, saveMeta } from '../state.js';
import { LOCKED } from './unlocks.js';

function unlockRandom(kind) {
  META.unlocked = META.unlocked || {};
  const have = META.unlocked[kind] || (META.unlocked[kind] = []);
  const pool = (LOCKED[kind] || []).filter((id) => !have.includes(id));
  if (!pool.length) return null;
  const id = pool[Math.floor(Math.random() * pool.length)];
  have.push(id);
  return id;
}

export const HIDDEN_ROOMS = [
  { id: 'vault', name: '魂晶寶庫', color: P.goldL, desc: '塵封的寶庫，魂晶堆積如山——這份財富會永遠跟著你。',
    claim: () => { META.gold += 400; return '永久獲得 400 金幣（已存入金庫）！'; } },
  { id: 'archive', name: '遠古檔案室', color: P.manaL, desc: '書架上封存著失傳的戰技，等待有緣人開啟。',
    claim: () => { const id = unlockRandom('weapons') || unlockRandom('abilities') || unlockRandom('equipment'); if (id) { META.gold += 120; return '永久解鎖了一項封存內容！（＋120 金幣）'; } META.gold += 300; return '封存內容皆已解鎖 — 改贈永久 300 金幣！'; } },
  { id: 'relic', name: '聖物密室', color: P.emberL, desc: '一件遠古聖物在祭壇上靜靜發光。',
    claim: () => { const id = unlockRandom('equipment') || unlockRandom('items'); if (id) { META.gold += 150; return '永久解鎖了一件聖物！（＋150 金幣）'; } META.gold += 300; return '聖物皆已收齊 — 改贈永久 300 金幣！'; } },
  { id: 'egg', name: '？ ？ ？', color: P.magenta || P.manaL, desc: '牆上潦草寫著：「開發者偷藏的房間。你居然找到了。噓——」',
    claim: () => { META.flags = META.flags || {}; META.flags.devEgg = true; META.gold += 88; return '✨ 你發現了開發者彩蛋！（永久紀念 ＋88 金幣）'; } },
];

export function hiddenRoomById(id) { return HIDDEN_ROOMS.find((r) => r.id === id) || HIDDEN_ROOMS[0]; }
export function hiddenClaimed(id) { return !!(META.hidden && META.hidden.claimed && META.hidden.claimed[id]); }
// claim a room's save-permanent reward, once per save. Returns the result text, or null if already claimed.
export function claimHidden(id) {
  const room = hiddenRoomById(id);
  META.hidden = META.hidden || { claimed: {} };
  META.hidden.claimed = META.hidden.claimed || {};
  if (META.hidden.claimed[id]) return null;
  let text = ''; try { text = room.claim() || ''; } catch (e) { /* */ }
  META.hidden.claimed[id] = true;
  try { saveMeta(); } catch (e) { /* */ }
  return text;
}
