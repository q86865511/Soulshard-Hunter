// 5-6 衣帽店 rotation. The shop's SHOP tab stocks 4 randomly rotating skins that
// refresh on a 30-minute REAL-TIME timer (task-10) — fully random, drawn from every
// hero-agnostic skin, with ~45% chance one slot is a HIDDEN skin (a totally different
// silhouette). Offers persist on META.skinShop.offers; a paid reroll forces a new batch.
// Skins are owned per-character (META.ownedSkins "charId:skinId") and equipped per hero.
import { SKINS } from './characters.js';

export const SKINSHOP_REROLL_COST = 70;
export const SKINSHOP_SLOTS = 4;                       // task-10: always 4 on the rack
export const SKINSHOP_REFRESH_MS = 30 * 60 * 1000;     // task-10: auto-restock every 30 real minutes
export const SKINSHOP_HIDDEN_CHANCE = 0.45;            // chance a slot rolls a hidden skin
const nowMs = () => (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0;

function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function rollOffers(meta, resetTimer = true) {
  const normal = shuffle(SKINS.filter((s) => !s.hidden).map((s) => s.id));
  const hidden = SKINS.filter((s) => s.hidden).map((s) => s.id);
  const offers = normal.slice(0, SKINSHOP_SLOTS);
  if (hidden.length && Math.random() < SKINSHOP_HIDDEN_CHANCE) offers[Math.floor(Math.random() * offers.length)] = hidden[Math.floor(Math.random() * hidden.length)];
  meta.skinShop = meta.skinShop || { roll: 0, offers: [], nextRoll: 0 };
  meta.skinShop.offers = offers;
  meta.skinShop.roll = (meta.skinShop.roll || 0) + 1;
  if (resetTimer) meta.skinShop.nextRoll = nowMs() + SKINSHOP_REFRESH_MS;   // only the free auto-restock resets the 30-min deadline
  return offers;
}

// current stock; rolls a fresh batch if empty OR the 30-min timer has elapsed
export function ensureSkinOffers(meta) {
  if (!meta.skinShop || typeof meta.skinShop !== 'object') meta.skinShop = { roll: 0, offers: [], nextRoll: 0 };
  const due = !meta.skinShop.nextRoll || nowMs() >= meta.skinShop.nextRoll;
  if (!Array.isArray(meta.skinShop.offers) || !meta.skinShop.offers.length || due) rollOffers(meta);
  return meta.skinShop.offers;
}

export function rerollSkinShop(meta) {
  if ((meta.gold || 0) < SKINSHOP_REROLL_COST) return false;
  meta.gold -= SKINSHOP_REROLL_COST;
  rollOffers(meta, false);   // paid reroll refreshes stock but does NOT extend the free 30-min deadline
  return true;
}

// ms remaining until the next free auto-restock (0 = due now)
export function skinShopCountdown(meta) { return (meta.skinShop && meta.skinShop.nextRoll) ? Math.max(0, meta.skinShop.nextRoll - nowMs()) : 0; }

// after a sortie banks: the 30-min timer governs refresh now, so only clear if already due
export function restockSkinShop(meta) { if (meta.skinShop && meta.skinShop.nextRoll && nowMs() >= meta.skinShop.nextRoll) meta.skinShop.offers = []; }

export function isOffered(meta, skinId) { return !!(meta.skinShop && Array.isArray(meta.skinShop.offers) && meta.skinShop.offers.includes(skinId)); }

// ---- R16/3.8 tier pricing + weekly sale ----------------------------------
// Skins now cost by tier (replacing the old per-skin hardcoded price), and EVERY skin is
// buyable any time (no more 4-slot rotation gate). A weekly sale discounts a few.
export const SKIN_TIER_PRICE = { normal: 450, premium: 900, hidden: 3000 };
export const SKIN_SALE_MS = 7 * 24 * 60 * 60 * 1000;
export function skinTier(sk) { return sk.tier || (sk.hidden ? 'hidden' : ((sk.price || 0) >= 320 ? 'premium' : 'normal')); }
export function skinBasePrice(sk) { return SKIN_TIER_PRICE[skinTier(sk)] || sk.price || 500; }
function rollSale(meta) {
  meta.skinShop = meta.skinShop || { roll: 0, offers: [], nextRoll: 0 };
  const normals = shuffle(SKINS.filter((s) => !s.hidden).map((s) => s.id)).slice(0, 2);
  const hiddens = shuffle(SKINS.filter((s) => s.hidden).map((s) => s.id)).slice(0, 1);
  const map = {}; normals.forEach((id) => { map[id] = 0.8; }); hiddens.forEach((id) => { map[id] = 0.9; });
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
  const f = (sale.map && sale.map[sk.id]) || 1;
  return { price: Math.round(base * f), base, onSale: f < 1, saleUntil: sale.until };
}
