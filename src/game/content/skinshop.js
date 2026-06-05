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
