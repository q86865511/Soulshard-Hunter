// hub/render_smith.js — render_smith methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { mouse } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { ctxRaw, drawSpriteUI, textWidth, uiBar, uiRect, uiText, view } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { FORGE_MAX_EFFECTS, FORGE_MAX_LEVEL, forgeEffectCost, forgeLevelCost, forgeOf, forgeSummary } from '../../content/forge.js';
import { claimableRanks, guildProgress } from '../../content/guild.js';
import { MAX_TRACKED, chapterState, fmtQuestVal, isQuestTracked, questLockedBy, trackedCount, weeklyState } from '../../content/quests.js';
import { Weapons } from '../../content/registry.js';
import { gate } from '../../content/town_gates.js';
import { META } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { inside } from './shared.js';

export const renderSmithMixin = {
  // ---- blacksmith: forge + facilities tabs ---------------------------------
  drawSmith() {
    const f = this.drawPanelFrame('鐵 匠 鋪', '鍛造武器 · 升級營地設施');
    this.drawTabs(f);
    if (this.tab === 0) {
      const g = gate(META, 'forge');   // R17/9.1: forging unlocks after the first biome clear
      if (g) { this.drawLockedPanel(f, g); return; }
      this.drawForge(f);
    } else this.drawFacilities(f);
    uiText(this.hubPriceHint(this.tab === 0 ? 'forgePurchases' : 'facilityPurchases'), f.x + f.w / 2, f.y + f.h - 14 * f.S, { size: 10 * f.S, align: 'center', color: P.gray3, weight: '600' });   // 9.3
  },
  drawForge(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.forgeLayout();
    let bottom = this.bodyTop(f) + 12 * S;
    for (const r of L.rows) bottom = Math.max(bottom, r.y + r.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    // weapon list (clipped)
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x + 16 * S, this.bodyTop(f), L.detail.x - f.x - 20 * S, f.h - 96 * S); ctx.clip();
    for (const r of L.rows) {
      const sel = this.forgeSel === r.w.id; const sum = forgeSummary(META, r.w.id);
      uiRect(r.x, r.y, r.wd, r.h, withAlpha(sel ? '#243a5a' : '#1b2138', 0.96), { radius: 6 * S, stroke: sel ? P.shardL : P.ink2, lw: sel ? 2 : 1 });
      const isp = getSprite(iconOr('weapon_' + r.w.id, 'weapon_w_soulbolt'));
      drawSpriteUI(isp.frames[0], r.x + 4 * S, r.y + 4 * S, (24 * S) / isp.w);
      this.clip1(r.w.name, r.x + 40 * S, r.y + 14 * S, r.wd - 48 * S, 11.5 * S, '#fff', '700');   // 12px gap from the icon (was hugging it)
      if (sum) uiText(sum, r.x + r.wd - 6 * S, r.y + 25 * S, { size: 9 * S, align: 'right', color: P.emberL, weight: '700' });
    }
    ctx.restore();
    this.drawScrollbar(f);
    // detail pane
    const d = L.detail, sel = this.forgeSel;
    uiRect(d.x, d.y, d.w, d.h, withAlpha('#12152a', 0.9), { radius: 8 * S, stroke: P.ink2, lw: 1.5 });
    if (!sel) { uiText('選擇左側武器進行鍛造', d.x + d.w / 2, d.y + d.h / 2, { size: 12 * S, align: 'center', baseline: 'middle', color: P.gray3 }); return; }
    // R17 UI-sweep: the pane content was UNCLIPPED — at uiScale 1.5 the last effect rows
    // (廣域/疾速) painted 84px past the panel bottom, over the town. Clip to the pane.
    const ctxD = ctxRaw(); ctxD.save(); ctxD.beginPath(); ctxD.rect(d.x, d.y, d.w, d.h); ctxD.clip();
    const wdef = Weapons.get(sel); const fdata = forgeOf(META, sel);
    const isp = getSprite(iconOr('weapon_' + sel, 'weapon_w_soulbolt'));
    drawSpriteUI(isp.frames[0], d.x + 14 * S, d.y + 12 * S, (34 * S) / isp.w);
    uiText(wdef ? wdef.name : sel, d.x + 56 * S, d.y + 24 * S, { size: 15 * S, color: '#fff', weight: '900' });
    uiText('鍛造等級 ' + fdata.level + '/' + FORGE_MAX_LEVEL + '（每級傷害 +8%）', d.x + 56 * S, d.y + 42 * S, { size: 11 * S, color: P.emberL, weight: '700' });
    for (let i = 0; i < FORGE_MAX_LEVEL; i++) uiRect(d.x + 56 * S + i * 12 * S, d.y + 50 * S, 9 * S, 6 * S, i < fdata.level ? P.ember : '#333a55', { radius: 1 });
    const b = this.forgeButtons(d);
    if (b.level) { const can = META.gold >= forgeLevelCost(fdata.level), hov = inside(mx, my, b.level); uiRect(b.level.x, b.level.y, b.level.w, b.level.h, withAlpha(can ? (hov ? '#3a5a2a' : '#26401c') : '#2a2030', 0.96), { radius: 6 * S, stroke: can ? P.greenL : P.gray1, lw: 2 }); goldLabel(b.level.x + b.level.w / 2, b.level.y + b.level.h / 2 + 1 * S, forgeLevelCost(fdata.level), { size: 12 * S, align: 'center', baseline: 'middle', color: can ? '#fff' : P.gray3, weight: '800', prefix: '強化等級 ' }); }
    else uiText('★ 鍛造等級已滿', d.x + 14 * S, d.y + 110 * S, { size: 12 * S, color: P.greenL, weight: '800' });
    uiText('特效（最多 ' + FORGE_MAX_EFFECTS + ' 種，已鑲 ' + fdata.effects.length + '）', d.x + 14 * S, d.y + 144 * S, { size: 11 * S, color: P.shardL, weight: '800' });
    for (const eb of b.effects) {
      const hov = inside(mx, my, eb); const afford = META.gold >= forgeEffectCost(fdata.effects.length);
      const state = eb.owned ? 'owned' : eb.full ? 'full' : afford ? 'ok' : 'poor';
      const bg = state === 'owned' ? '#1c2c1c' : state === 'ok' ? (hov ? '#243a5a' : '#1b2138') : '#201a26';
      uiRect(eb.x, eb.y, eb.w, eb.h, withAlpha(bg, 0.96), { radius: 6 * S, stroke: state === 'owned' ? P.greenL : (hov && state === 'ok' ? eb.color : P.ink2), lw: 2 });
      uiText(eb.name, eb.x + 10 * S, eb.y + 13 * S, { size: 12 * S, color: eb.color, weight: '800' });
      this.clip1(eb.desc, eb.x + 52 * S, eb.y + 13 * S, eb.w - 130 * S, 9.5 * S, P.gray4);
      const labCol = state === 'owned' ? P.greenL : afford ? P.goldL : P.gray3;
      if (state === 'owned' || state === 'full') uiText(state === 'owned' ? '已鑲嵌' : '欄位已滿', eb.x + eb.w - 10 * S, eb.y + eb.h - 10 * S, { size: 11 * S, align: 'right', color: labCol, weight: '800' });
      else goldLabel(eb.x + eb.w - 10 * S, eb.y + eb.h - 10 * S, forgeEffectCost(fdata.effects.length), { size: 11 * S, align: 'right', color: labCol, weight: '800' });   // R17/2.1
    }
    ctxD.restore();   // R17 UI-sweep: end detail-pane clip
  },
  drawFacilities(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const { cards } = this.facilityCards();
    let bottom = this.bodyTop(f) + 12 * S;
    for (const c of cards) bottom = Math.max(bottom, c.y + c.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, this.bodyTop(f), f.w, f.h - 96 * S); ctx.clip();
    for (const c of cards) {
      const def = c.def; const cur = META.facilities[def.id] || 0; const st = this.facilityState(def);
      const hover = inside(mx, my, c);
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover && st === 'ok' ? P.emberL : P.ink2, lw: hover ? 3 : 2 });
      const isp = getSprite(iconOr(def.icon, 'facility_f_forge'));
      drawSpriteUI(isp.frames[0], c.x + 8 * S, c.y + 8 * S, (30 * S) / isp.w);
      this.clip1(def.name, c.x + 46 * S, c.y + 20 * S, c.w - 92 * S, 13 * S, '#fff', '800');
      for (let i = 0; i < def.maxLevel; i++) uiRect(c.x + c.w - 11 * S - (def.maxLevel - i) * 10 * S, c.y + 13 * S, 7 * S, 6 * S, i < cur ? P.emberL : '#333a55', { radius: 1 });   // 3.1: level pips (was「Lv.x/max」text), matches talents/forge
      this.wrap(def.desc, c.x + 10 * S, c.y + 50 * S, c.w - 20 * S, 10.5 * S);   // R17 B16: was 42S — only 4S under the 30S icon, read as glued to icon/name
      const col = st === 'max' ? P.greenL : st === 'gated' ? P.gray3 : st === 'poor' ? P.redL : P.goldL;
      if (st === 'max' || st === 'gated') uiText(st === 'max' ? '已滿級' : '🔒 進度解鎖', c.x + c.w - 10 * S, c.y + c.h - 10 * S, { size: 12 * S, align: 'right', color: col, weight: '800' });
      else goldLabel(c.x + c.w - 10 * S, c.y + c.h - 10 * S, this.hubCost(def.cost(cur), 'facilityPurchases'), { size: 12 * S, align: 'right', color: col, weight: '800' });   // R17/2.1
    }
    ctx.restore();
    this.drawScrollbar(f);
  },

  // ---- guild: quests + rank tabs -------------------------------------------
  drawGuild() {
    const f = this.drawPanelFrame('獵 人 公 會', '接取任務 · 累積聲望換取獎勵');
    this.drawTabs(f);
    if (this.tab === 0) this.drawQuests(f); else this.drawGuildRank(f);
  },
  drawQuests(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const L = this.questLayout(); const t0 = L.t0;
    uiText('主線', f.x + 24 * S, t0 + 14 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    const cur = chapterState(META, META.questIndex || 0);
    if (cur) {
      uiText(cur.q.title, f.x + 24 * S, t0 + 30 * S, { size: 14 * S, color: '#fff', weight: '900' });
      uiText('目標：' + cur.q.desc, f.x + 24 * S, t0 + 46 * S, { size: 11 * S, color: P.shardL, weight: '700' });
      uiBar(f.x + 200 * S, t0 + 38 * S, f.w - 224 * S, 6 * S, cur.goal ? cur.prog / cur.goal : 1, { fg: cur.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
      const can = cur.done, hov = inside(mx, my, L.mainClaim);
      uiRect(L.mainClaim.x, L.mainClaim.y, L.mainClaim.w, L.mainClaim.h, withAlpha(can ? (hov ? '#2a6a3a' : '#1f5030') : '#2a2030', 0.96), { radius: 7 * S, stroke: can ? P.greenL : P.gray1, lw: 2 });
      if (can) goldLabel(L.mainClaim.x + L.mainClaim.w / 2, L.mainClaim.y + L.mainClaim.h / 2 + 1 * S, cur.q.reward, { size: 12 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800', prefix: '領取 ' });   // R17/2.1
      else uiText('尚未達成', L.mainClaim.x + L.mainClaim.w / 2, L.mainClaim.y + L.mainClaim.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: P.gray3, weight: '800' });
      const trk = isQuestTracked(META, 'story'), th = inside(mx, my, L.mainTrack);
      uiRect(L.mainTrack.x, L.mainTrack.y, L.mainTrack.w, L.mainTrack.h, withAlpha(trk || th ? '#243a5a' : '#1b2138', 0.96), { radius: 7 * S, stroke: trk ? P.shardL : P.ink2, lw: trk ? 3 : 2 });
      uiText(trk ? '✓ 追蹤中' : '＋ 追蹤主線', L.mainTrack.x + L.mainTrack.w / 2, L.mainTrack.y + L.mainTrack.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: trk ? P.shardL : '#fff', weight: '800' });
    } else uiText('主線已全數完成 — 你已成為魂晶之主。', f.x + 24 * S, t0 + 40 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    uiText('委託（本週懸賞 + 一般懸賞 · 可同時追蹤 ' + trackedCount(META) + '/' + MAX_TRACKED + '）', f.x + 24 * S, t0 + 118 * S, { size: 12 * S, color: P.shardL, weight: '800' });
    // R17 UI-sweep: clip + scroll the bounty rows (mirrors the B16 guild-rank fix — at high
    // uiScale rows 4-6 painted straight over the town, 145px past the panel bottom).
    let qBottom = L.top;
    for (const r of L.rows) qBottom = Math.max(qBottom, r.y + r.h + (this.panelScroll || 0));
    for (const r of L.weeklyRows) qBottom = Math.max(qBottom, r.y + r.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, qBottom - (f.y + f.h - 24 * S));
    const ctxQ = ctxRaw(); ctxQ.save(); ctxQ.beginPath(); ctxQ.rect(f.x, L.clipTop, f.w, (f.y + f.h - 24 * S) - L.clipTop); ctxQ.clip();
    // ── R18/B9 weekly bounties ──
    uiText('📅 本週懸賞', f.x + 24 * S, L.wTop - 6 * S - (this.panelScroll || 0), { size: 12 * S, color: P.goldL, weight: '800' });
    for (const r of L.weeklyRows) {
      const st = weeklyState(META, r.q), done = st.done && !st.claimed;
      uiRect(f.x + 24 * S, r.y, f.w - 48 * S, r.h, withAlpha(st.claimed ? '#16221a' : '#2a2410', 0.95), { radius: 6 * S, stroke: st.claimed ? P.greenD : P.goldL, lw: 1 });
      uiText(r.q.title, f.x + 34 * S, r.y + 15 * S, { size: 12 * S, color: st.claimed ? P.gray3 : P.holyL, weight: '800' });
      uiText(r.q.desc + '（' + Math.floor(st.prog) + '/' + r.q.goal + '）', f.x + 34 * S, r.y + 30 * S, { size: 10 * S, color: st.done ? P.greenL : P.gray4 });
      const cH = inside(mx, my, r.claim);
      uiRect(r.claim.x, r.claim.y, r.claim.w, r.claim.h, withAlpha(st.claimed ? '#1d2a20' : done ? (cH ? '#2a6a3a' : '#1f5030') : '#2a2030', 0.96), { radius: 5 * S, stroke: st.claimed ? P.greenD : done ? P.greenL : P.gray1, lw: 1 });
      if (st.claimed) uiText('✓ 已領', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: P.greenL, weight: '700' });
      else if (done) goldLabel(r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, r.q.reward, { size: 10 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700', prefix: '領 ' });
      else uiText('進行中', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: P.gray3, weight: '700' });
    }
    uiText('一般懸賞', f.x + 24 * S, L.top - 12 * S - (this.panelScroll || 0), { size: 12 * S, color: P.shardL, weight: '800' });
    if (!L.rows.length) uiText('目前沒有可接的委託（達成條件可解鎖隱藏委託）', f.x + 34 * S, L.top + 8 * S - (this.panelScroll || 0), { size: 11 * S, color: P.gray3 });
    for (const r of L.rows) {
      const q = r.q, p = Math.min(q.goal, q.prog(META.stats || {})), done = p >= q.goal;
      const trk = isQuestTracked(META, q.id), hidden = q.id[0] === 'h';
      const lockedBy = questLockedBy(META, q);   // 5.5: prerequisite not yet claimed
      uiRect(f.x + 24 * S, r.y, f.w - 48 * S, r.h, withAlpha(lockedBy ? '#15161f' : (trk ? '#243a5a' : '#1b2138'), lockedBy ? 0.8 : 0.95), { radius: 6 * S, stroke: lockedBy ? P.gray1 : (trk ? P.shardL : (hidden ? P.purpleL : P.ink2)), lw: trk ? 2 : 1 });
      uiText(q.title, f.x + 34 * S, r.y + 15 * S, { size: 12 * S, color: lockedBy ? P.gray2 : (hidden ? P.purpleL : '#fff'), weight: '800' });
      if (lockedBy) {
        uiText('🔒 需先完成：' + lockedBy, f.x + 34 * S, r.y + 30 * S, { size: 10 * S, color: P.gray3 });
      } else {
        uiText(q.desc + '（' + fmtQuestVal(p, q.fmt) + '/' + fmtQuestVal(q.goal, q.fmt) + '）', f.x + 34 * S, r.y + 30 * S, { size: 10 * S, color: done ? P.greenL : P.gray4 });
        const tH = inside(mx, my, r.track);
        uiRect(r.track.x, r.track.y, r.track.w, r.track.h, withAlpha(trk || tH ? '#243a5a' : '#1b2138', 0.96), { radius: 5 * S, stroke: trk ? P.shardL : P.ink2, lw: 1 });
        uiText(trk ? '✓ 追蹤中' : '＋ 追蹤', r.track.x + r.track.w / 2, r.track.y + r.track.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: trk ? P.shardL : '#fff', weight: '700' });
        const cH = inside(mx, my, r.claim);
        uiRect(r.claim.x, r.claim.y, r.claim.w, r.claim.h, withAlpha(done ? (cH ? '#2a6a3a' : '#1f5030') : '#2a2030', 0.96), { radius: 5 * S, stroke: done ? P.greenL : P.gray1, lw: 1 });
        if (done) goldLabel(r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, q.reward, { size: 10 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700', prefix: '領 ' });   // R17/2.1
        else uiText('進行中', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: P.gray3, weight: '700' });
      }
    }
    ctxQ.restore();   // R17 UI-sweep: end bounty-row clip
    this.drawScrollbar(f);
  },
  drawGuildRank(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const t0 = this.bodyTop(f);
    const gp = guildProgress(META);
    uiText('當前階級 · ' + gp.name, f.x + 24 * S, t0 + 18 * S, { size: 15 * S, color: P.gold, weight: '900' });
    uiText('聲望 ' + gp.xp + (gp.next ? '　·　距「' + gp.next.name + '」還需 ' + gp.toNext : '　·　已達頂階'), f.x + 24 * S, t0 + 38 * S, { size: 11 * S, color: P.gray3 });
    uiBar(f.x + 24 * S, t0 + 44 * S, f.w - 48 * S, 7 * S, gp.frac || 0, { fg: P.gold, bg: '#16183a', border: P.ink });
    const L = this.guildRankRows();
    let bottom = t0 + 60 * S;
    for (const r of L.rows) bottom = Math.max(bottom, r.y + r.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const claimable = new Set(claimableRanks(META).map((c) => c.i));
    // R17 B16: explicit clip bottom — the old `f.h - 96S` height was measured from the rank
    // header (t0+56S), putting the clip floor 40S PAST the panel and letting rows bleed out.
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, t0 + 56 * S, f.w, (f.y + f.h - 24 * S) - (t0 + 56 * S)); ctx.clip();
    for (const r of L.rows) {
      const reached = gp.xp >= r.rk.xp, claimed = META.guild.claimed && META.guild.claimed[r.i], canClaim = claimable.has(r.i);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(reached ? (claimed ? '#1c2c1c' : '#243a5a') : '#1b2138', 0.95), { radius: 6 * S, stroke: canClaim ? P.gold : reached ? P.shardL : P.ink2, lw: canClaim ? 2 : 1 });
      // #3: clamp both text lines to stop before the claim button so long reward labels
      // (e.g.「道具『淨化波』+ 🪙1200」) no longer bleed past the panel / under the button.
      const txtL = r.x + 12 * S, txtR = r.rk.reward ? r.claim.x - 8 * S : r.x + r.w - 12 * S;
      const clampTo = (str, sz, wt) => { if (textWidth(str, sz, wt) <= txtR - txtL) return str; while (str.length > 1 && textWidth(str + '…', sz, wt) > txtR - txtL) str = str.slice(0, -1); return str + '…'; };
      uiText(clampTo((reached ? '★ ' : '☆ ') + r.rk.name + '　·　需 ' + r.rk.xp + ' 聲望', 12 * S, '800'), txtL, r.y + 15 * S, { size: 12 * S, color: reached ? '#fff' : P.gray3, weight: '800' });
      if (r.rk.reward) uiText(clampTo('獎勵：' + r.rk.reward.label, 9.5 * S, '400'), txtL, r.y + 28 * S, { size: 9.5 * S, color: claimed ? P.greenL : P.gray4 });
      if (r.rk.reward) {
        const cH = inside(mx, my, r.claim);
        const col = claimed ? '#1c2c1c' : canClaim ? (cH ? '#caa12a' : '#9a7a1a') : '#26283e';
        uiRect(r.claim.x, r.claim.y, r.claim.w, r.claim.h, withAlpha(col, 0.96), { radius: 5 * S, stroke: claimed ? P.greenL : canClaim ? P.goldL : P.ink2, lw: 1 });
        uiText(claimed ? '✓ 已領取' : canClaim ? '領取獎勵' : '未達成', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: claimed ? P.greenL : canClaim ? '#fff' : P.gray3, weight: '800' });
      }
    }
    ctx.restore();
    this.drawScrollbar(f);
  },
};
