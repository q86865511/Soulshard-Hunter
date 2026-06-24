// run/coop.js — coop methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { drawSpriteUI, uiClipRound, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { applyChoice, choiceStyle, getRunChoices } from '../../progression.js';
import { applyWeaponChoice, buildWeaponChoices, inside } from './shared.js';

export const coopMixin = {

  // ---- co-op (host) helpers ------------------------------------------------
  // Party level-up: can't pause the shared world for a pick menu, so auto-level every
  // living avatar's weapons (or top a maxed one up with a small heal).
  // co-op party level-up: a NON-BLOCKING pick menu for every player (the shared world
  // can't pause). The host gets the full single-player choice menu (own run state); each
  // guest gets a weapon-choice menu the host computed + applies the pick authoritatively.
  coopLevelUp() {
    this.levelQueue--;
    if (this.coopPick) this.coopPickQueue = Math.min(3, (this.coopPickQueue || 0) + 1);   // stack if one is already open (capped so rapid level-ups can't trap the host in an endless menu chain)
    else this.openCoopPick();
    for (const slot of this.coop.players) {
      if (slot.isLocal || slot.left || !slot.player || slot.player.dead) continue;
      this.coop.sendLevelup(slot, buildWeaponChoices(slot.player));
    }
    this.banner = '隊伍升級！選擇強化'; this.bannerT = 1.4; Sfx.play('levelup');
  },
  openCoopPick() {
    const options = getRunChoices(this.run, this.player);
    if (!options.length) { this.player.heal(this.player.maxHp * 0.12); return; }   // fully capped → heal instead
    this.coopPick = { options, hover: -1, t: 0 };
  },
  // host applies a guest's networked pick to that guest's avatar (coophost calls this)
  applyCoopGuestPick(slot, i) {
    if (!slot || !slot.pendingOpts || !slot.player) return;
    applyWeaponChoice(slot.player, slot.pendingOpts[i] || slot.pendingOpts[0], this.world);
    slot.pendingOpts = null;
  },
  coopPickRects(n) {
    const S = uiScale(); const cw = Math.min(150 * S, (view.W - 40 * S) / n - 12 * S); const ch = cw * 1.18; const gap = 12 * S;
    const totalW = n * cw + (n - 1) * gap; const x0 = (view.W - totalW) / 2; const y = view.H - ch - 16 * S;   // bottom row → world stays visible
    return Array.from({ length: n }, (_, i) => ({ x: x0 + i * (cw + gap), y, w: cw, h: ch }));
  },
  updateCoopPick(dt) {
    const cp = this.coopPick; cp.t += dt;
    const rects = this.coopPickRects(cp.options.length); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    cp.hover = -1; rects.forEach((r, i) => { if (inside(mx, my, r)) cp.hover = i; });
    let pick = -1;
    if (mouse.justDown && cp.hover >= 0) pick = cp.hover;
    if (pressed('slot1')) pick = 0; if (pressed('slot2')) pick = 1; if (pressed('slot3')) pick = 2;
    if (pick < 0 && cp.t > 18) pick = 0;   // auto-pick if ignored far too long (never blocks the run)
    if (pick >= 0 && pick < cp.options.length) {
      try { applyChoice(this.run, this.player, this.world, cp.options[pick]); } catch (e) { /* */ }
      this.world.particles.ring(this.player.x, this.player.y, P.manaL, 18, 100);
      this.banner = cp.options[pick].def.name; this.bannerT = 1.4; Sfx.play('levelup');
      this.coopPick = null;
      if (this.coopPickQueue > 0) { this.coopPickQueue--; this.openCoopPick(); }
    }
  },
  drawCoopPick() {
    const S = uiScale(); const cp = this.coopPick; const rects = this.coopPickRects(cp.options.length);
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('★ 選擇強化（點擊或按 1 / 2 / 3）', view.W / 2, rects[0].y - 12 * S, { size: 13 * S, align: 'center', color: P.manaL, weight: '800', shadowColor: withAlpha('#000', 0.8) });
    rects.forEach((r, i) => {
      const c = cp.options[i]; const st = choiceStyle(c); const hover = cp.hover === i; const oy = hover ? -6 * S : 0;
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.96), { radius: 8 * S, stroke: hover ? st.accent : withAlpha(st.accent, 0.5), lw: hover ? 3 : 2 });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 8 * S, () => uiRect(r.x, r.y + oy, r.w, 4 * S, st.accent));   // #7: accent clipped to rounded corners
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.36) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 12 * S, isc);
      const midY = r.y + oy + 14 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 8 * S, { size: 10 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 24 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
      uiText(String(i + 1), r.x + 9 * S, r.y + oy + 18 * S, { size: 13 * S, color: withAlpha('#fff', 0.45), weight: '900' });
    });
  },
  // Non-blocking online leave menu (the world keeps simulating underneath). Returns
  // true if the player left the run.
  coopMenuLayout() {
    const S = uiScale(); const w = 240 * S, h = 46 * S, gap = 14 * S;
    const x = view.W / 2 - w / 2, y0 = view.H / 2 - (h * 2 + gap) / 2;
    return { S, resume: { x, y: y0, w, h }, leave: { x, y: y0 + h + gap, w, h } };
  },
  updateCoopMenu() {
    const L = this.coopMenuLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (mouse.justDown) {
      if (inside(mx, my, L.resume)) { this.coopMenu = false; Sfx.play('uiClick'); }
      else if (inside(mx, my, L.leave)) { this.abandon(); return true; }
    }
    return false;
  },
  drawCoopMenu() {
    const S = uiScale(); const L = this.coopMenuLayout(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.45));
    uiText('連線合作中', view.W / 2, L.resume.y - 40 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('（世界持續進行，無法暫停）', view.W / 2, L.resume.y - 16 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    const btn = (r, label, col) => { const hov = inside(mx, my, r); uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.97), { radius: 8 * S, stroke: hov ? (col || P.shardL) : P.ink2, lw: hov ? 3 : 2 }); uiText(label, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' }); };
    btn(L.resume, '繼 續');
    btn(L.leave, '離開房間', P.redL);
  },
};
