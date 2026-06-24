// hub/render.js — render methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { mouse } from '../../../engine/input.js';
import { dist } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { UI, ctxRaw, drawShadow, drawSprite, drawSpriteUI, glowWorld, textWidth, uiBar, uiRect, uiScale, uiText, view, vignette, worldToScreen } from '../../../engine/renderer.js';
import { frameAt, getSprite, iconOr } from '../../../engine/sprites.js';
import { Cheats } from '../../cheats.js';
import { guildProgress } from '../../content/guild.js';
import { npcAffLevel } from '../../content/npcs.js';
import { petById } from '../../content/pets.js';
import { trackedQuestState } from '../../content/quests.js';
import { TALENT_BRANCHES } from '../../content/talents.js';
import { gateProgress } from '../../content/town_gates.js';
import { cheatUnlockAll } from '../../content/unlocks.js';
import { drawAchievementToasts } from '../../hud.js';
import { META, saveMeta } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { settingsUI } from '../../ui/settings.js';
import { TS } from '../../world.js';
import { AREA_TITLE, ROOM_THEME, inside } from './shared.js';

export const renderMixin = {

  // ---- render --------------------------------------------------------------
  render() {
    const S = uiScale();
    this.world.draw();
    // R19 ROOM_THEME wash. In TOWN: a gentle themed wash only over the open districts (plaza/garden/
    // market) so each open-air area reads distinctly. In an INTERIOR: one full-room warm wash of that
    // building's theme colour. Kept subtle so the floor art shows through as ambient lighting.
    if (this.area === 'town') {
      for (const id of ['plaza', 'garden', 'market']) {
        const rm = this.rooms[id]; const col = ROOM_THEME[id]; if (!rm || !col) continue;
        glowWorld(rm.cx, rm.cy, 130, col, 0.05);
      }
    } else {
      const col = ROOM_THEME[this.area];
      if (col && this.world) { glowWorld(this.hero.x, this.hero.y, 220, col, 0.06); uiRect(0, 0, view.W, view.H, withAlpha(col, 0.04)); }
    }
    // R20/B3: the walk-in door circles — a pulsing soul glow over the ruin_doorglow decal,
    // plus a「踏入光圈」hint when the hero is about to step on one
    if (this.world.triggers) {
      const h0 = this.hero;
      for (const g of this.world.triggers) {
        const gx = (g.tx + 0.5) * TS, gy = (g.ty + 0.5) * TS;
        glowWorld(gx, gy, 11, P.shardL, 0.16 + 0.10 * Math.sin(this.t * 3 + g.tx));
        if (h0 && dist(h0.x, h0.y, gx, gy) < TS * 1.6 && (this.doorCd || 0) <= 0) {
          const ss0 = worldToScreen(gx, gy - 16);
          uiText(g.target === 'town' ? '踏入光圈 離開' : '踏入光圈 進入', ss0.x, ss0.y, { size: 11 * S, align: 'center', color: withAlpha(P.shardL, 0.85), weight: '800' });
        }
      }
    }
    // stations + hero + npcs
    for (const s of this.stations) {
      // R19: a door-station has no sprite — the facade door IS the visual; just a soft warm glow
      // (brighter when the hero is near) so the player reads "enterable".
      if (s.kind === 'door') { glowWorld(s.x, s.y - 6, 18, s.color, 0.08 + (this.near === s ? 0.18 : 0)); continue; }
      const sp = getSprite(s.sprite);
      const bob = s.id === 'sortie' ? Math.sin(this.t * 2) * 1.5 : 0;
      const portalGlow = s.id === 'sortie' ? 0.26 : 0.14;   // R19: the grand portal is the centrepiece — strong glow
      glowWorld(s.x, s.y - 8, s.id === 'sortie' ? 28 : 16, s.color, portalGlow + (this.near === s ? 0.16 : 0));
      drawShadow(s.x, s.y, sp.w * 0.3);
      drawSprite(frameAt(sp, this.t), s.x, s.y + bob, { ax: sp.ax, ay: sp.ay });
    }
    for (const n of this.npcs) {
      const sp = getSprite(n.def.sprite);
      drawShadow(n.x, n.y, sp.w * 0.28);
      glowWorld(n.x, n.y - 8, 12, n.def.color, this.near === n ? 0.16 : 0.0);
      drawSprite(frameAt(sp, n.t), n.x, n.y, { ax: sp.ax, ay: sp.ay, flipX: n.facing < 0 });
    }
    const h = this.hero; const psp = getSprite(this.heroSprite || 'player');
    drawShadow(h.x, h.y, h.radius + 1.5);
    drawSprite(h.moving ? frameAt(psp, h.walkT) : frameAt(psp, this.t * 0.4), h.x, h.y, { ax: psp.ax, ay: psp.ay, flipX: h.facing < 0 });
    if (META.pet && this.petState && this.petState.x != null) {   // R18/B10 cosmetic pet follower
      const pp = petById(META.pet), psp2 = pp && getSprite(pp.sprite);
      if (psp2 && !psp2.missing) { drawShadow(this.petState.x, this.petState.y, 4); drawSprite(frameAt(psp2, this.petState.t), this.petState.x, this.petState.y + (this.petState.bob || 0), { ax: psp2.ax, ay: psp2.ay, flipX: h.facing < 0 }); }
    }
    // labels
    for (const s of this.stations) {
      // R19: door-stations have no sprite — anchor their label above the door anchor itself
      const labelH = s.kind === 'door' ? 22 : (getSprite(s.sprite).h + 6);
      const ss = worldToScreen(s.x, s.y - labelH);
      uiText(s.label, ss.x, ss.y, { size: 12 * S, align: 'center', color: s.color, weight: '800' });
      if (this.near === s) {
        const sp2 = worldToScreen(s.x, s.y + 8);
        // R19: doors prompt 進入 (town→building) / 離開 (building→town); panel stations prompt 進入
        const prompt = s.kind === 'door' ? (s.target === 'town' ? '【E】離開' : '【E】進入') : '【E】互動';
        uiText(prompt, sp2.x, sp2.y, { size: 12 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' });
      }
    }
    for (const n of this.npcs) {
      const sp = getSprite(n.def.sprite); const ss = worldToScreen(n.x, n.y - sp.h - 4);
      const isNew = !(META.npc && META.npc.met && META.npc.met[n.def.id]);
      uiText(n.def.name, ss.x, ss.y, { size: 11 * S, align: 'center', color: n.def.color, weight: '800' });
      const aff = npcAffLevel(META, n.def.id);   // R18/B11: persistent affinity badge under the name (QA B12 wired the helper)
      if (aff > 0) uiText('❤ Lv' + aff, ss.x, ss.y + 12 * S, { size: 9 * S, align: 'center', color: P.redL, weight: '800' });
      if (isNew) this.drawNewBadge(ss.x, ss.y - 24 * S, S);   // 2.3: 「新」徽章 — 黃圈白驚嘆號於名字正上方（上移避免壓到名字）
      if (this.near === n) { const sp2 = worldToScreen(n.x, n.y + 8); uiText('【E】交談', sp2.x, sp2.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
    this.world.particles.drawText();
    vignette(0.45);

    // top bar — R19: title reflects the active area (town vs. the building you're inside)
    uiText(AREA_TITLE[this.area] || AREA_TITLE.town, view.W / 2, 28 * S, { size: 20 * S, align: 'center', color: '#fff', weight: '900' });
    const csp = getSprite('coin');
    drawSpriteUI(csp.frames[0], view.W - 110 * S, 12 * S, 2.2 * S);
    uiText(String(META.gold), view.W - 84 * S, 30 * S, { size: 18 * S, color: P.goldL, weight: '800' });
    const footer = this.area === 'town'
      ? '1 教堂　2 鐵匠　3 成就　4 公會　空白 出擊　踏入門前光圈進出建築　Esc 設定'
      : '靠近站點或 NPC 按【E】互動　·　踏入門口光圈離開　·　1 教堂 2 鐵匠 3 成就 4 公會 空白 出擊　Esc 設定';
    uiText(footer, view.W / 2, view.H - 16 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    if (this.flashT > 0) uiText(this.flash, view.W / 2, view.H * 0.78, { size: 18 * S, align: 'center', color: withAlpha(P.goldL, Math.min(1, this.flashT)), weight: '800' });
    if (!this.panel && !this.dialogue) this.drawQuestTracker();

    if (this.panel === 'talents') this.drawTalents();
    else if (this.panel === 'sortie') { this.drawSortie(); if (this.sortieTut) this.drawSortieTut(); }   // R17/10.2
    else if (this.panel === 'achievements') this.drawAchievements();
    else if (this.panel === 'wardrobe') this.drawWardrobe();
    else if (this.panel === 'smith') this.drawSmith();
    else if (this.panel === 'guild') this.drawGuild();
    else if (this.panel === 'personal') this.drawPersonal();
    else if (this.panel === 'bank') this.drawBank();

    if (this.dialogue) this.drawDialogue();
    if (this.confirm) this.drawConfirm();   // task 8: buy/reset confirmation on top
    if (Cheats.enabled) this.drawHubCheats();
    if (this.escMenu) this.drawEscMenu();
    drawAchievementToasts();   // round16/4.9-B: global unlock banners (above panels)
    settingsUI.draw();
  },

  // ---- hub dev panel (Konami ↑↑↓↓←→←→ B A toggles Cheats.enabled globally) -----
  hubCheatButtons() {
    const S = uiScale(); const w = 168 * S, h = 26 * S, gap = 6 * S, x = view.W - w - 10 * S; let y = 96 * S;
    const items = [{ id: 'unlock', label: '解鎖全部內容＋關卡' }, { id: 'gold', label: '金幣 +9999' }, { id: 'guild', label: '公會聲望 +5000' }];
    return items.map((it) => { const r = { ...it, x, y, w, h }; y += h + gap; return r; });
  },
  hubCheatInput() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const b of this.hubCheatButtons()) {
      if (!inside(mx, my, b)) continue;
      if (b.id === 'unlock') { cheatUnlockAll(META); this.feedback('已解鎖全部內容與關卡'); }
      else if (b.id === 'gold') { META.gold += 9999; this.feedback('金幣 +9999'); }
      else if (b.id === 'guild') { META.guild = META.guild || { xp: 0, claimed: {} }; META.guild.xp += 5000; this.feedback('公會聲望 +5000'); }
      saveMeta();   // the sortie panel re-reads META.levels.unlocked on open, so newly-unlocked biomes appear automatically
      return true;
    }
    return false;
  },
  drawHubCheats() {
    const S = uiScale(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('☠ 開發者模式', view.W - 94 * S, 88 * S, { size: 12 * S, align: 'center', color: P.goldL, weight: '900' });
    for (const b of this.hubCheatButtons()) {
      const hov = inside(mx, my, b);
      uiRect(b.x, b.y, b.w, b.h, withAlpha(hov ? '#3a2a1a' : '#1b1530', 0.95), { radius: 6 * S, stroke: withAlpha(P.goldL, hov ? 0.9 : 0.5), lw: hov ? 2 : 1 });
      uiText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 4 * S, { size: 11 * S, align: 'center', color: '#ffe9a0', weight: '700' });
    }
  },

  drawQuestTracker() {
    const S = uiScale(); const q = trackedQuestState(META); if (!q) return;
    const gp = guildProgress(META);
    const x = 12 * S, y = 12 * S, w = 210 * S, h = 64 * S;
    uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.66), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.6), lw: 1.5 });
    uiText('追蹤 · ' + q.title, x + 8 * S, y + 15 * S, { size: 11 * S, color: P.goldL, weight: '800' });
    if (q.sub) uiText(q.sub, x + 8 * S, y + 28 * S, { size: 9 * S, color: P.gray3 });
    uiBar(x + 8 * S, y + 33 * S, w - 16 * S, 4 * S, q.frac || 0, { fg: q.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
    uiText('公會 · ' + gp.name, x + 8 * S, y + 50 * S, { size: 9.5 * S, color: P.shardL, weight: '700' });
    uiBar(x + 8 * S, y + 55 * S, w - 16 * S, 3 * S, gp.frac || 0, { fg: P.gold, bg: '#16183a', border: P.ink });
  },

  drawPanelFrame(title, sub) {
    const f = this.panelFrame(); const S = f.S;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.74));
    uiRect(f.x, f.y, f.w, f.h, withAlpha('#161a30', 0.98), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(f.x, f.y, f.w, 50 * S, withAlpha('#1f2542', 0.96), { radius: 12 * S });
    uiText(title, f.x + 22 * S, f.y + 33 * S, { size: UI.FONT_TITLE * S, color: '#fff', weight: '900' });   // 1.6: unified panel-title size
    if (sub) uiText(sub, f.x + 22 * S + textWidth(title, UI.FONT_TITLE * S, '900') + 12 * S, f.y + 33 * S, { size: UI.FONT_CAPTION * S, color: P.gray3, weight: '600' });
    const csp = getSprite('coin');
    drawSpriteUI(csp.frames[0], f.x + f.w - 150 * S, f.y + 14 * S, 2 * S);
    uiText(String(META.gold), f.x + f.w - 128 * S, f.y + 32 * S, { size: 17 * S, color: P.goldL, weight: '800' });
    uiRect(f.close.x, f.close.y, f.close.w, f.close.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', f.close.x + f.close.w / 2, f.close.y + f.close.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    // task 8: per-category reset button (top-right, left of the coin)
    const rt = this.resetTarget();
    if (rt) { const rb = this.resetBtnRect(f); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const hov = inside(mx, my, rb); uiRect(rb.x, rb.y, rb.w, rb.h, withAlpha(hov ? '#3a2a18' : '#241a10', 0.96), { radius: 6 * S, stroke: P.emberL, lw: 1.5 }); uiText('↺ ' + rt.label, rb.x + rb.w / 2, rb.y + rb.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: P.emberL, weight: '800' }); }
    return f;
  },

  drawTalents() {
    const f = this.drawPanelFrame('教 堂 · 天 賦', '向女神像祈求，以金幣永久強化');
    const S = f.S;
    const cols = TALENT_BRANCHES.length; const colW = f.w / cols;
    TALENT_BRANCHES.forEach((br, ci) => { uiText(br.name, f.x + ci * colW + colW / 2, f.y + 72 * S, { size: 15 * S, align: 'center', color: br.color, weight: '800' }); });
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const { nodes } = this.talentNodes();
    let bottom = f.y + 92 * S;
    for (const n of nodes) bottom = Math.max(bottom, n.y + n.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y + 78 * S, f.w, f.h - 94 * S); ctx.clip();
    for (const n of nodes) {
      const def = n.def; const cur = META.talents[def.id] || 0; const st = this.talentState(def);
      const hover = inside(mx, my, n);
      const bg = st === 'max' ? '#1c2c1c' : st === 'locked' ? '#201622' : '#1b2138';
      uiRect(n.x, n.y, n.w, n.h, withAlpha(bg, 0.96), { radius: 7 * S, stroke: hover && st === 'ok' ? n.color : P.ink2, lw: hover ? 3 : 2 });
      const BRANCH_ICON = { offense: 'talent_t_damage', defense: 'talent_t_hp', utility: 'talent_t_speed', fortune: 'talent_t_gold' };
      const isp = getSprite(iconOr(def.icon, BRANCH_ICON[def.branch] || 'talent_t_damage'));
      drawSpriteUI(isp.frames[0], n.x + 6 * S, n.y + 6 * S, (26 * S) / isp.w);
      uiText(def.name, n.x + 38 * S, n.y + 17 * S, { size: 12.5 * S, color: '#fff', weight: '800' });
      this.clip1(def.desc, n.x + 38 * S, n.y + 31 * S, n.w - 44 * S, 10 * S, P.gray4);
      for (let i = 0; i < def.maxLevel; i++) uiRect(n.x + 40 * S + i * 9 * S, n.y + 42 * S, 7 * S, 5 * S, i < cur ? n.color : '#333a55', { radius: 1 });
      const col = st === 'max' ? P.greenL : (st === 'locked' || st === 'gated') ? P.gray3 : st === 'poor' ? P.redL : P.goldL;
      if (st === 'max' || st === 'locked' || st === 'gated') uiText(st === 'max' ? '已滿級' : st === 'gated' ? '🔒 進度解鎖' : '需先解鎖前置', n.x + n.w - 8 * S, n.y + n.h - 9 * S, { size: 11 * S, align: 'right', color: col, weight: '800' });
      else goldLabel(n.x + n.w - 8 * S, n.y + n.h - 9 * S, this.hubCost(def.cost(cur), 'talentPurchases'), { size: 11 * S, align: 'right', color: col, weight: '800' });   // R17/2.1
    }
    ctx.restore();
    this.drawScrollbar(f);
    uiText('點擊節點升級　·　' + this.hubPriceHint('talentPurchases') + '　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  // R17/9.1: shared locked-panel body for progression-gated systems
  drawLockedPanel(f, hint) {
    const S = f.S;
    this.panelMaxScroll = 0;
    // R17 UI-sweep polish: center within the BODY (below any tab row) — anchoring at 0.42·f.h
    // left a ~180px dead band under the smith tabs while the lock sat too low.
    const cy = (this.bodyTop(f) + f.y + f.h - 24 * S) / 2;
    uiText('🔒', f.x + f.w / 2, cy - 22 * S, { size: 40 * S, align: 'center', color: P.gray2, weight: '900' });
    uiText(hint, f.x + f.w / 2, cy + 16 * S, { size: 14 * S, align: 'center', color: '#cfe0ff', weight: '800' });
    uiText(gateProgress(META), f.x + f.w / 2, cy + 38 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    uiText('Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
};
