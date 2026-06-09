// 7.2 魂晶銀行 (soulshard bank). Borrow gold in town to pre-upgrade; the loan (principal ×
// interest) is auto-repaid out of the NEXT run's banked gold (carrying any remainder).
// Only one loan at a time. The credit limit unlocks with guild rank. Pure data module —
// takes `meta` in; state lives on META.bank = { debt, borrowed }.
import { guildRank } from './guild.js';

export const BANK_INTEREST = 1.2;
export const BANK_MIN = 10;   // smallest borrowable amount
// credit limit by guild rank index (0-based); clamps to the last entry past the top rank.
const LIMITS = [50, 100, 100, 200, 200, 350, 350, 500, 500, 700, 1000, 1000];

export function bankLimit(meta) { return LIMITS[Math.min(guildRank(meta), LIMITS.length - 1)]; }
export function bankState(meta) { if (!meta.bank || typeof meta.bank !== 'object') meta.bank = { debt: 0, borrowed: 0 }; return meta.bank; }

// borrow a chosen amount (clamped to [BANK_MIN, limit]); one loan at a time. returns true on success.
export function bankBorrow(meta, amount) {
  const b = bankState(meta);
  if (b.debt > 0) return false;            // outstanding loan — repay first
  const lim = bankLimit(meta);
  const amt = Math.max(BANK_MIN, Math.min(Math.round(amount != null ? amount : lim), lim));
  if (amt <= 0) return false;
  b.borrowed = amt; b.debt = Math.round(amt * BANK_INTEREST); meta.gold += amt;
  return true;
}

// repay from the just-banked gold at run settlement; carries any remainder. returns repaid amount.
export function bankRepay(meta) {
  const b = bankState(meta);
  if (!b.debt) return 0;
  const pay = Math.min(meta.gold || 0, b.debt);
  meta.gold -= pay; b.debt -= pay;
  if (b.debt <= 0) { b.debt = 0; b.borrowed = 0; }
  return pay;
}
