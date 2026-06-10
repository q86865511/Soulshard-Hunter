// R17/2.1: one canvas-safe way to render a gold amount. goldStr() used the 🪙 emoji
// (U+1FA99), which is missing from the CJK UI font stack on common Windows configs and
// rendered as a □ tofu box everywhere (save slots, blacksmith, prices…).
// Rule: pure-DRAW call sites use goldLabel() — the real pixel `coin` sprite + the number;
// string contexts (ask() bodies, feedback toasts, full result sentences) use the
// text-only goldStr() from engine/renderer.js, which now reads「N 金幣」.
import { uiText, textWidth, drawSpriteUI } from '../../engine/renderer.js';
import { getSprite } from '../../engine/sprites.js';
import { P } from '../../engine/palette.js';

// Draws [prefix?] [coin sprite] [amount] as one aligned unit and returns its total width.
// `align` ('left'|'center'|'right') and `baseline` ('alphabetic'|'middle') mirror uiText —
// the whole unit is pre-measured so right/center anchored price labels land exactly.
export function goldLabel(x, y, n, {
  size = 12, align = 'left', baseline = 'alphabetic', color = P.goldL, weight = '800',
  alpha = 1, prefix = '', prefixColor = null,
} = {}) {
  const txt = String(typeof n === 'number' ? Math.round(n) : n);
  const sp = getSprite('coin');
  const sc = size / sp.h;                       // coin ≈ text height (8×9 sprite)
  const iw = sp.w * sc, pad = Math.max(2, size * 0.22);
  const pw = prefix ? textWidth(prefix, size, weight) + pad : 0;
  const tw = textWidth(txt, size, weight);
  const total = pw + iw + pad + tw;
  let x0 = x;
  if (align === 'center') x0 = x - total / 2; else if (align === 'right') x0 = x - total;
  // glyph box sits ~0.78×size above an alphabetic baseline; 'middle' centers on y
  const boxTop = baseline === 'middle' ? y - size * 0.39 : y - size * 0.78;
  if (prefix) uiText(prefix, x0, y, { size, color: prefixColor || color, weight, alpha, baseline });
  drawSpriteUI(sp.frames[0], x0 + pw, boxTop + (size * 0.78 - sp.h * sc) / 2, sc, { alpha });
  uiText(txt, x0 + pw + iw + pad, y, { size, color, weight, alpha, baseline });
  return total;
}
