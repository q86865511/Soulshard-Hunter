// Hidden rooms (隱藏房間, #6): genuinely-hidden secret rooms that must be DISCOVERED on the
// map (the marker is invisible until you walk up to it). Entering pauses the run for a short
// event; the reward is SAVE-PERMANENT and claimable ONCE PER SAVE (tracked in META.hidden.claimed) —
// permanent gold / content unlocks / an easter egg, NOT a single-run ability or item.
import { P } from '../../engine/palette.js';
import { META, saveMeta } from '../state.js';
import { HIDDEN_REWARD_INFO } from './hidden_rewards.js';   // R17/6.x: also registers the exclusive content

// R17/6.x: each room grants a FIXED exclusive unlock (content that exists nowhere else),
// pushed into META.unlocked so the normal isUnlocked() gating opens it up.
function unlock(kind, id) {
  META.unlocked = META.unlocked || {};
  const a = META.unlocked[kind] || (META.unlocked[kind] = []);
  if (!a.includes(id)) a.push(id);
}
const R = (roomId, text) => ({ ...HIDDEN_REWARD_INFO[roomId], text });

export const HIDDEN_ROOMS = [
  { id: 'vault', name: '魂晶寶庫', color: P.goldL, desc: '塵封的寶庫，魂晶堆積如山——這份財富會永遠跟著你。',
    claim: () => { unlock('equipment', 'hr_vault_sigil'); META.gold += 1000; return R('vault', '永久解鎖傳說飾品「寶庫之印」！（＋1000 金幣）'); } },
  { id: 'archive', name: '遠古檔案室', color: P.manaL, desc: '書架上封存著失傳的戰技，等待有緣人開啟。',
    claim: () => { unlock('weapons', 'hr_archive_codex'); META.gold += 300; return R('archive', '永久解鎖專屬武器「禁書迴響」！（＋300 金幣）'); } },
  { id: 'relic', name: '聖物密室', color: P.emberL, desc: '一件遠古聖物在祭壇上靜靜發光。',
    claim: () => { unlock('abilities', 'hr_relic_heart'); META.gold += 300; return R('relic', '永久解鎖專屬被動「聖物之心」！（＋300 金幣）'); } },
  { id: 'egg', name: '？ ？ ？', color: P.magenta || P.manaL, desc: '牆上潦草寫著：「開發者偷藏的房間。你居然找到了。噓——」',
    claim: () => { META.flags = META.flags || {}; META.flags.devEgg = true; META.gold += 888; return R('egg', '✨ 永久解鎖隱藏造型「開發者 · 小妖」（全英雄可裝）！＋888 金幣'); } },
];

export function hiddenRoomById(id) { return HIDDEN_ROOMS.find((r) => r.id === id) || HIDDEN_ROOMS[0]; }
export function hiddenClaimed(id) { return !!(META.hidden && META.hidden.claimed && META.hidden.claimed[id]); }
// claim a room's save-permanent reward, once per save. Returns a reveal object
// { text, icon, name, kindLabel } (R17/6.5), or null if already claimed.
export function claimHidden(id) {
  const room = hiddenRoomById(id);
  META.hidden = META.hidden || { claimed: {} };
  META.hidden.claimed = META.hidden.claimed || {};
  if (META.hidden.claimed[id]) return null;
  let res = null; try { res = room.claim() || null; } catch (e) { /* */ }
  META.hidden.claimed[id] = true;
  try { saveMeta(); } catch (e) { /* */ }
  return res;
}
