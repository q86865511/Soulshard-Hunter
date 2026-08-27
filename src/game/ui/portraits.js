// game/ui/portraits.js — R28/W2-E(b): lazy-loading local portrait layer (ART-05).
// assets/portraits/<charId>.png — 128×128 thick-paint half-body art, dark background kept
// (spec 方向 A: no alpha punch-out; the display side pixel-card-crops instead). Only the 6
// core heroes have art so far (batch 1); other ids simply miss the fetch and callers fall
// back to the existing char sprite — zero third-party requests, no save/protocol changes.
import { roundRectPath, ctxRaw } from '../../engine/renderer.js';

const cache = new Map();   // charId -> { img, ready, failed }

// R28/FIX-1 (gate 低項「肖像 404 噪音」) — WHICH ids actually have a file on disk. Without it
// every one of the other 21 heroes fired a request that 404'd (once per id per session, and
// again on every hard reload) and filled the console with red — noise that buries real errors,
// and needless traffic in a runtime that otherwise makes zero requests it doesn't need.
// ADDING A PORTRAIT: drop assets/portraits/<id>.png in AND add <id> to this Set. An id that is
// not listed never gets fetched, so a file present but unlisted stays invisible.
const MANIFEST = new Set([
  'hunter', 'ranger', 'pyro', 'guardian', 'shadow', 'stormcaller',
  'g_vanguard', 'g_arcanist', 'g_ranger', 'g_warden', 'g_stormcaller',
  'h4_paladin', 'h4_chronomancer', 'h4_puppeteer', 'h4_gravekeeper', 'h4_starcaller',
  'g_revenant', 'h4_bladedancer', 'h2_duelist', 'h2_warlock', 'h2_trapper',
  'h2_voidcaller', 'h2_warder', 'h3_spearmaiden', 'h3_plague', 'h3_beastfang',
]);

// Returns the loaded <img> once ready, else null (caller should fall back to sprite art).
// First call for an id kicks off the fetch; onload/onerror flip state for the NEXT call —
// this frame still falls back, same pattern as sprite lazy-bake misses elsewhere in the UI.
export function getPortrait(charId) {
  if (!MANIFEST.has(charId)) return null;
  let e = cache.get(charId);
  if (!e) {
    e = { img: new Image(), ready: false, failed: false };
    e.img.onload = () => { e.ready = true; };
    e.img.onerror = () => { e.failed = true; };
    e.img.src = `assets/portraits/${charId}.png`;
    cache.set(charId, e);
  }
  return (e.ready && !e.failed) ? e.img : null;
}

// Draws the portrait cover-fit (scale-to-fill + centre-crop) into a rounded-rect card slot,
// clipped to that card's own corner radius. Returns true if it drew something, false if the
// caller should fall back (no image yet / failed / unknown id) — call sites branch on this.
// Portraits are painterly, not pixel-art, so smoothing is switched ON for the blit only and
// restored to the renderer's pixel-art default (false) immediately after.
export function drawPortrait(charId, x, y, w, h, { radius = 6, alpha = 1 } = {}) {
  const img = getPortrait(charId);
  if (!img) return false;
  const ctx = ctxRaw();
  ctx.save();
  ctx.globalAlpha = alpha;
  roundRectPath(x, y, w, h, radius);
  ctx.clip();
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  const dx = x + (w - dw) / 2, dy = y + (h - dh) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.imageSmoothingEnabled = false;
  ctx.restore();
  return true;
}
