// 5-6 衣帽店 rotation → R17/3.2 rework. The shop stocks 8 randomly rotating
// (character, skin) PAIR offers drawn from the player's UNLOCKED heroes × every
// purchasable skin (minus already-owned pairs), refreshed every 30 real minutes.
// Hidden skins are a 1% per-slot jackpot. Prices by tier: 1000 / 3000, hidden in a
// deterministic 20000–50000 band; the weekly sale only discounts non-hidden tiers (×0.8).
// Offers persist on META.skinShop.offers as [{c, s}]; a paid reroll forces a new batch.
// Skins are owned per-character (META.ownedSkins "charId:skinId") and equipped per hero.
import { SKINS } from './characters.js';

export const SKINSHOP_REROLL_COST = 200;               // R17/3.2: was 70 — prices jumped, so does the reroll
export const SKINSHOP_SLOTS = 8;                       // R17/3.2: 8 on the rack (was 4)
export const SKINSHOP_REFRESH_MS = 30 * 60 * 1000;     // auto-restock every 30 real minutes
export const SKINSHOP_HIDDEN_CHANCE = 0.01;            // R17/3.2: per-slot hidden jackpot (was a 45% one-slot roll)
const nowMs = () => (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

const buyable = (s) => !s.exclusive;   // B6 hidden-room reward skins never hit the rack

// pool of {c, s} pairs the player could buy right now (unlocked chars × skins, minus owned)
function offerPool(meta) {
  const chars = (meta.unlocked && meta.unlocked.characters) || [];
  const ownedSet = new Set(meta.ownedSkins || []);
  const normal = [], hidden = [];
  for (const c of chars) for (const sk of SKINS) {
    if (!buyable(sk) || ownedSet.has(c + ':' + sk.id)) continue;
    (sk.hidden ? hidden : normal).push({ c, s: sk.id });
  }
  return { normal, hidden };
}

function rollOffers(meta, resetTimer = true) {
  const { normal, hidden } = offerPool(meta);
  shuffle(normal); shuffle(hidden);
  const offers = [];
  for (let i = 0; i < SKINSHOP_SLOTS; i++) {
    if (hidden.length && Math.random() < SKINSHOP_HIDDEN_CHANCE) { offers.push(hidden.pop()); continue; }
    if (normal.length) { offers.push(normal.pop()); continue; }
    // non-hidden pool exhausted (completionist): a slightly kinder 10% hidden roll per empty slot
    if (hidden.length && Math.random() < 0.10) offers.push(hidden.pop());
  }
  meta.skinShop = meta.skinShop || { roll: 0, offers: [], nextRoll: 0 };
  meta.skinShop.offers = offers;
  meta.skinShop.roll = (meta.skinShop.roll || 0) + 1;
  meta.skinShop._poolDry = offers.length === 0;   // R17 QA: completionist pool exhausted — don't re-roll every frame
  if (resetTimer) meta.skinShop.nextRoll = nowMs() + SKINSHOP_REFRESH_MS;   // only the free auto-restock resets the 30-min deadline
  return offers;
}

// pre-R17 saves stored offers as plain skin-id strings — clear so a pair batch re-rolls
function guardShape(meta) {
  const ss = meta.skinShop;
  if (!ss || typeof ss !== 'object') { meta.skinShop = { roll: 0, offers: [], nextRoll: 0 }; return; }
  if (!Array.isArray(ss.offers)) { ss.offers = []; return; }
  ss.offers = ss.offers.filter((o) => o && typeof o === 'object' && o.c && o.s && SKINS.some((sk) => sk.id === o.s));
}

// current stock; rolls a fresh batch if empty OR the 30-min timer has elapsed.
// R17 QA: ensure runs every frame the shop is drawn — when the pool is EXHAUSTED a roll
// yields 0 offers, so an unconditional empty→re-roll froze the countdown (timer reset每幀)
// and burned CPU. _poolDry suppresses retries until the next due tick; a non-due roll
// never touches the 30-min deadline.
export function ensureSkinOffers(meta) {
  guardShape(meta);
  const due = !meta.skinShop.nextRoll || nowMs() >= meta.skinShop.nextRoll;
  if (due || (!meta.skinShop.offers.length && !meta.skinShop._poolDry)) rollOffers(meta, due);
  return meta.skinShop.offers;
}

// true when nothing is left to stock — every buyable (char, skin) pair is owned
export function skinPoolDry(meta) { const { normal, hidden } = offerPool(meta); return !normal.length && !hidden.length; }

// R18/B11: 薇拉 Lv5 好感把重抽價砍半
export function rerollCost(meta) { return Math.round(SKINSHOP_REROLL_COST * ((meta && meta.flags && meta.flags.qolWardrobe) ? 0.5 : 1)); }
export function rerollSkinShop(meta) {
  guardShape(meta);
  // R17 QA: completionist pool exhausted — a reroll can't stock anything, never charge for the no-op
  if (skinPoolDry(meta)) { meta.skinShop._poolDry = true; return false; }
  const cost = rerollCost(meta);
  if ((meta.gold || 0) < cost) return false;
  meta.gold -= cost;
  const prev = meta.skinShop.offers;
  // paid reroll refreshes stock but does NOT extend the free 30-min deadline
  if (!rollOffers(meta, false).length) {
    // hidden-only pool can roll all blanks — keep the old rack and refund
    meta.skinShop.offers = prev;
    meta.skinShop._poolDry = !prev.length;
    meta.gold += cost;
    return false;
  }
  return true;
}

// ms remaining until the next free auto-restock (0 = due now)
export function skinShopCountdown(meta) { return (meta.skinShop && meta.skinShop.nextRoll) ? Math.max(0, meta.skinShop.nextRoll - nowMs()) : 0; }

// after a sortie banks: the 30-min timer governs refresh now, so only clear if already due
export function restockSkinShop(meta) { if (meta.skinShop && meta.skinShop.nextRoll && nowMs() >= meta.skinShop.nextRoll) meta.skinShop.offers = []; }

// ---- R16/3.8 tier pricing + weekly sale → R17/3.2 price rework -------------
export const SKIN_TIER_PRICE = { normal: 1000, premium: 3000 };   // R17/3.2: was 450/900; hidden priced per-skin below
export const SKIN_SALE_MS = 7 * 24 * 60 * 60 * 1000;
export function skinTier(sk) { return sk.tier || (sk.hidden ? 'hidden' : ((sk.price || 0) >= 320 ? 'premium' : 'normal')); }
// R17/3.2: hidden skins land in a stable 20000–50000 band — deterministic per skin id
// (hash → 5000-step rungs) so the price never jitters between visits or saves.
export function hiddenSkinPrice(id) {
  let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 20000 + (h % 7) * 5000;
}
export function skinBasePrice(sk) { const t = skinTier(sk); return t === 'hidden' ? hiddenSkinPrice(sk.id) : (SKIN_TIER_PRICE[t] || sk.price || 1000); }
function rollSale(meta) {
  meta.skinShop = meta.skinShop || { roll: 0, offers: [], nextRoll: 0 };
  // R17/3.2: the sale only ever touches normal/premium — hidden skins are never discounted
  const normals = shuffle(SKINS.filter((s) => !s.exclusive && skinTier(s) === 'normal').map((s) => s.id)).slice(0, 2);
  const prems = shuffle(SKINS.filter((s) => !s.exclusive && skinTier(s) === 'premium').map((s) => s.id)).slice(0, 1);
  const map = {}; for (const id of [...normals, ...prems]) map[id] = 0.8;   // flat 8折
  meta.skinShop.sale = { map, until: nowMs() + SKIN_SALE_MS };
}
export function ensureSale(meta) {
  if (!meta.skinShop || typeof meta.skinShop !== 'object') meta.skinShop = { roll: 0, offers: [], nextRoll: 0 };
  const s = meta.skinShop.sale;
  if (!s || !s.map || !s.until || nowMs() >= s.until) rollSale(meta);
  return meta.skinShop.sale;
}
// { price, base, onSale, saleUntil } for a skin, after any active sale discount.
export function skinPrice(meta, sk) {
  const base = skinBasePrice(sk); const sale = ensureSale(meta);
  if (skinTier(sk) === 'hidden') return { price: base, base, onSale: false, saleUntil: sale.until };   // R17/3.2: never on sale
  const f = (sale.map && sale.map[sk.id]) || 1;
  return { price: Math.round(base * f), base, onSale: f < 1, saleUntil: sale.until };
}
