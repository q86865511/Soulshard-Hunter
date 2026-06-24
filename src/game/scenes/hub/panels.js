// hub/panels.js — panels methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { UI, ctxRaw, drawSpriteUI, goldStr, uiBar, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite } from '../../../engine/sprites.js';
import { BALANCE } from '../../balance.js';
import { BANK_INTEREST, BANK_MIN, bankBorrow, bankLimit, bankState } from '../../content/bank.js';
import { PETS, petUnlocked } from '../../content/pets.js';
import { ROOM_DECOR, buyDecor, decorLocked, decorOwned, placedDecor } from '../../content/room_decor.js';
import { facilityGate, gate } from '../../content/town_gates.js';
import { META, saveMeta } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { TS } from '../../world.js';
import { inside } from './shared.js';

export const panelsMixin = {
  panelTitle(id) { return { talents: '教堂 · 天賦', smith: '鐵匠鋪', guild: '獵人公會', wardrobe: '衣帽店', achievements: '成就殿堂', personal: '個人小屋', sortie: '出擊', bank: '魂晶銀行' }[id] || id; },
  // 2.3 / 3.5-C: reusable「新」/「可領」badge — a yellow circle with a white「!」.
  drawNewBadge(bx, by, S) {
    const ctx = ctxRaw(), r = 7 * S;
    ctx.save(); ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fillStyle = '#f5c518'; ctx.fill();
    ctx.lineWidth = 1.5 * S; ctx.strokeStyle = '#7a5c00'; ctx.stroke(); ctx.restore();
    uiText('!', bx, by + 0.5 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900', shadow: false });
  },

  // ---- panel dispatch ------------------------------------------------------
  updatePanel() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (this.confirm) { this.updateConfirm(mx, my); return; }   // task 8: modal intercepts everything
    // R17/10.2: sortie first-open walkthrough — eats ALL input until dismissed (once per save)
    if (this.panel === 'sortie' && this.sortieTut) {
      if (mouse.justDown || pressed('escape') || pressed('space') || pressed('interact') || pressed('enter')) {
        this.sortieTut = false; META.tutorialSortieDone = true; saveMeta(); Sfx.play('uiClick');
      }
      return;
    }
    if (pressed('escape') || pressed('build')) {
      // R17/3.1: the wardrobe is layered (entry → mine/shop → per-hero) — Esc steps back one layer
      if (this.panel === 'wardrobe' && (this.wardrobeChar != null || this.wardrobeView)) {
        if (this.wardrobeChar != null) this.wardrobeChar = null; else this.wardrobeView = null;
        this.panelScroll = 0; Sfx.play('uiClick'); return;
      }
      this.panel = null; return;
    }
    const frame = this.panelFrame();
    if (this.handleScrollbar(mx, my, frame)) return;
    const rt = this.resetTarget();   // task 8: per-category reset button
    if (rt && mouse.justDown && inside(mx, my, this.resetBtnRect(frame))) { this.ask(rt.label + '？', '清除此分頁的升級，以基準價返還金幣（不含動態加價部分）', rt.fn); return; }   // R17 QA: honest wording — refunds are at base cost
    if (mouse.justDown) {
      if (inside(mx, my, frame.close)) { this.panel = null; return; }
      if (!inside(mx, my, frame)) { this.panel = null; return; }
    }
    // tab switching for smith / guild (R17/3.1: wardrobe dropped its tabs for the layered flow)
    if ((this.panel === 'smith' || this.panel === 'guild') && mouse.justDown) {
      for (const tb of this.tabRects(frame)) if (inside(mx, my, tb)) { this.tab = tb.i; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    }
    if (mouse.wheel && ['talents', 'facilities', 'achievements', 'smith', 'personal', 'wardrobe', 'guild'].includes(this.panel)) {
      this.panelScroll = clamp((this.panelScroll || 0) + mouse.wheel * 0.5, 0, this.panelMaxScroll || 0);
    }
    if (this.panel === 'talents') this.updateTalents(mx, my);
    else if (this.panel === 'sortie') this.updateSortie(mx, my);
    else if (this.panel === 'achievements') this.updateAchievements(mx, my);   // 3.5-B filter tabs
    else if (this.panel === 'wardrobe') this.updateWardrobe(mx, my);
    else if (this.panel === 'smith') { this.tab === 0 ? this.updateForge(mx, my) : this.updateFacilities(mx, my); }
    else if (this.panel === 'guild') { this.tab === 0 ? this.updateQuests(mx, my) : this.updateGuildRank(mx, my); }
    else if (this.panel === 'personal') {
      if (mouse.justDown) for (const tb of this.personalTabRects(this.panelFrame())) if (inside(mx, my, tb)) { if (this.personalTab !== tb.i) this.panelScroll = 0; this.personalTab = tb.i; Sfx.play('uiClick'); return; }
      if ((this.personalTab || 0) === 2) this.updateRoomTab(mx, my);   // R18/B10 裝飾·寵物
    }
    else if (this.panel === 'bank') this.updateBank(mx, my);   // 7.2 魂晶銀行
  },
  // ---- 魂晶銀行 (7.2): borrow a CUSTOM amount now, auto-repaid (×interest) from next run's gold ----
  bankStep() { return Math.max(10, Math.round(bankLimit(META) / 20)); },
  bankUi(f) {
    const S = f.S, t0 = this.bodyTop(f);
    const rowY = t0 + 112 * S;                     // amount-selector row (all offsets ×S → scale-safe)
    return {
      minus: { x: f.x + 30 * S, y: rowY, w: 46 * S, h: 46 * S },
      box: { x: f.x + 86 * S, y: rowY, w: 156 * S, h: 46 * S },
      plus: { x: f.x + 252 * S, y: rowY, w: 46 * S, h: 46 * S },
      full: { x: f.x + 312 * S, y: rowY + 5 * S, w: 74 * S, h: 36 * S },
      bar: { x: f.x + 30 * S, y: rowY + 66 * S, w: 356 * S, h: 10 * S },     // +20 below the box
      repayY: rowY + 100 * S,                                                // repay line (well clear of the bar)
      borrow: { x: f.x + 30 * S, y: rowY + 122 * S, w: 320 * S, h: 48 * S },
    };
  },
  updateBank(mx, my) {
    if (gate(META, 'bank')) return;   // R17/9.1: gated until guild rank 2
    if (!mouse.justDown) return;
    if (bankState(META).debt > 0) return;
    const lim = bankLimit(META), u = this.bankUi(this.panelFrame()), step = this.bankStep();
    const clamp = () => { this.bankAmount = Math.max(BANK_MIN, Math.min(this.bankAmount == null ? lim : this.bankAmount, lim)); };
    if (inside(mx, my, u.minus)) { this.bankAmount = (this.bankAmount == null ? lim : this.bankAmount) - step; clamp(); Sfx.play('uiClick'); return; }
    if (inside(mx, my, u.plus)) { this.bankAmount = (this.bankAmount == null ? lim : this.bankAmount) + step; clamp(); Sfx.play('uiClick'); return; }
    if (inside(mx, my, u.full)) { this.bankAmount = lim; Sfx.play('uiClick'); return; }
    if (inside(mx, my, u.bar)) { this.bankAmount = Math.round(BANK_MIN + (lim - BANK_MIN) * Math.max(0, Math.min(1, (mx - u.bar.x) / u.bar.w))); clamp(); Sfx.play('uiClick'); return; }   // click the bar to set
    if (inside(mx, my, u.borrow)) {
      clamp(); const amt = this.bankAmount;
      this.ask('向銀行借款 ' + goldStr(amt) + '？', '下一局結算須還 ' + goldStr(Math.round(amt * BANK_INTEREST)) + '（含 ' + Math.round((BANK_INTEREST - 1) * 100) + '% 利息）', () => { if (bankBorrow(META, amt)) { saveMeta(); this.feedback('已借款 ' + goldStr(amt)); } });
    }
  },
  drawBank() {
    const f = this.drawPanelFrame('🏦 魂 晶 銀 行', '借金幣提前強化 · 下一局結算自動還款（含息）'); const S = f.S;
    const gB = gate(META, 'bank');   // R17/9.1
    if (gB) { this.drawLockedPanel(f, gB); return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const t0 = this.bodyTop(f);
    const b = bankState(META), limit = bankLimit(META);
    const coin = (x, y, sc) => { const sp = getSprite('coin'); drawSpriteUI(sp.frames[0], x, y - sp.h * sc, sc); };
    // info strip
    uiRect(f.x + 24 * S, t0 + 6 * S, f.w - 48 * S, 30 * S, withAlpha('#10142c', 0.7), { radius: 7 * S, stroke: withAlpha(P.goldL, 0.4), lw: 1 });
    uiText('利率 × ' + BANK_INTEREST + '（+' + Math.round((BANK_INTEREST - 1) * 100) + '% 利息）　·　同時僅能有一筆借款　·　額度隨公會等級提升', f.x + 38 * S, t0 + 25 * S, { size: 11.5 * S, color: P.gray3, weight: '600' });
    if (b.debt > 0) {
      uiRect(f.x + 24 * S, t0 + 52 * S, f.w - 48 * S, 96 * S, withAlpha('#241016', 0.85), { radius: 9 * S, stroke: withAlpha(P.redL, 0.55), lw: 1.5 });
      uiText('💳 目前欠款', f.x + 40 * S, t0 + 78 * S, { size: 14 * S, color: P.redL, weight: '800' });
      coin(f.x + 44 * S, t0 + 116 * S, 2.4 * S);
      uiText(String(b.debt) + '　應還', f.x + 70 * S, t0 + 110 * S, { size: 20 * S, color: '#fff', weight: '900' });
      uiText('（借出本金 ' + goldStr(b.borrowed) + '）　下一局結算自動償還，不足順延。', f.x + 40 * S, t0 + 132 * S, { size: 11 * S, color: P.gray3 });
      const r = { x: f.x + 24 * S, y: t0 + 162 * S, w: 300 * S, h: 44 * S };
      uiRect(r.x, r.y, r.w, r.h, withAlpha('#2a2030', 0.96), { radius: 9 * S, stroke: P.gray1, lw: 2 });
      uiText('已有借款（剩餘 ' + goldStr(b.debt) + ' 待還）', r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: P.gray3, weight: '800' });
    } else {
      if (this.bankAmount == null) this.bankAmount = limit;
      this.bankAmount = Math.max(BANK_MIN, Math.min(this.bankAmount, limit));
      const amt = this.bankAmount, repay = Math.round(amt * BANK_INTEREST), u = this.bankUi(f);
      // credit-limit line
      uiText('可借額度', f.x + 30 * S, t0 + 64 * S, { size: 13 * S, color: P.shardL, weight: '800' });
      coin(f.x + 92 * S, t0 + 70 * S, 1.9 * S); uiText(String(limit), f.x + 112 * S, t0 + 66 * S, { size: 16 * S, color: P.goldL, weight: '900' });
      uiText('自訂借款金額', f.x + 30 * S, t0 + 102 * S, { size: 12 * S, color: P.gray3, weight: '700' });
      // − / amount box / +
      const btn = (rr, t, on) => { const h = inside(mx, my, rr); uiRect(rr.x, rr.y, rr.w, rr.h, withAlpha(h && on ? '#27306a' : '#1b2138', 0.96), { radius: 8 * S, stroke: on ? P.shardL : P.ink2, lw: 2 }); uiText(t, rr.x + rr.w / 2, rr.y + rr.h / 2 + 1 * S, { size: 20 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray2, weight: '900' }); };
      btn(u.minus, '−', amt > BANK_MIN);
      uiRect(u.box.x, u.box.y, u.box.w, u.box.h, withAlpha('#10142c', 0.95), { radius: 8 * S, stroke: P.goldL, lw: 2 });
      coin(u.box.x + 26 * S, u.box.y + u.box.h / 2 + 9 * S, 2.2 * S);
      uiText(String(amt), u.box.x + u.box.w / 2 + 12 * S, u.box.y + u.box.h / 2 + 1 * S, { size: 22 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '900' });
      btn(u.plus, '＋', amt < limit);
      const fh = inside(mx, my, u.full); uiRect(u.full.x, u.full.y, u.full.w, u.full.h, withAlpha(fh ? '#27306a' : '#1b2138', 0.96), { radius: 7 * S, stroke: P.shardL, lw: 1.5 }); uiText('全額', u.full.x + u.full.w / 2, u.full.y + u.full.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '800' });
      // amount bar (click to set)
      uiBar(u.bar.x, u.bar.y, u.bar.w, u.bar.h, (amt - BANK_MIN) / Math.max(1, limit - BANK_MIN), { fg: P.goldL, bg: '#16183a', border: P.ink });
      // repay breakdown (its own row, well below the bar — was overlapping it)
      uiText('到期應還', f.x + 30 * S, u.repayY, { size: 12 * S, color: P.gray3, weight: '700' });
      uiText(goldStr(repay) + '　＝ 本金 ' + goldStr(amt) + ' ＋ 利息 ' + goldStr(repay - amt), f.x + 96 * S, u.repayY, { size: 12 * S, color: P.emberL, weight: '800' });
      // borrow button
      const hov = inside(mx, my, u.borrow);
      uiRect(u.borrow.x, u.borrow.y, u.borrow.w, u.borrow.h, withAlpha(hov ? '#2a6a3a' : '#1f5030', 0.96), { radius: 9 * S, stroke: P.greenL, lw: 2 });
      goldLabel(u.borrow.x + u.borrow.w / 2, u.borrow.y + u.borrow.h / 2 + 1 * S, amt, { size: 15 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900', prefix: '借款 ' });   // R17/2.1
    }
    uiText('− / ＋ 或點擊金條調整金額　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
  personalTabRects(f) {
    const S = f.S, w = 92 * S, h = 24 * S, gap = 7 * S, names = ['生涯戰績', '羈絆圖鑑', '裝飾·寵物'], tw = w * names.length + gap * (names.length - 1);
    const x0 = f.x + f.w / 2 - tw / 2, y = f.y + 13 * S;
    return names.map((name, i) => ({ name, i, x: x0 + i * (w + gap), y, w, h }));
  },
  // ---- R18/B10 個人小屋裝飾 + 迷你寵物 ----
  injectRoomDecor() {   // (re)place owned decorations into the world (called on loadArea + after a buy)
    if (!this.world || !this.rooms) return;
    this.world.decor = (this.world.decor || []).filter((d) => !d._room);
    // R19: the personal room is its own interior area now — only inject the gold-sink decor there
    if (this.area !== 'personal' || !this.rooms.personal) return;
    // R19: the gold-sink offsets (dx -6..+6, dy -2..+4) were authored around the old room CENTRE —
    // anchor them mid-room (row ~5.5 of the now-17×13 R20 interior; cx is the true centre column),
    // not at the top-centre station anchor. Every placement below stays FLOOR-guarded.
    const anchor = { cx: this.rooms.personal.cx, cy: 5.5 * TS };
    for (const dd of placedDecor(META, anchor)) {
      const tx = Math.floor(dd.x / TS), ty = Math.floor(dd.y / TS);
      if (this.world.inBounds(tx, ty) && this.world.tileAt(tx, ty) === 0 /* FLOOR */) { dd._room = true; this.world.decor.push(dd); }
    }
  },
  roomTabLayout(f) {
    const S = f.S, top = this.bodyTop(f) + 6 * S, cols = 2, cw = (f.w - 48 * S - 12 * S) / cols, chh = 38 * S, gap = 8 * S;
    const cards = ROOM_DECOR.map((d, i) => ({ d, x: f.x + 24 * S + (i % cols) * (cw + 12 * S), y: top + Math.floor(i / cols) * (chh + gap) - (this.panelScroll || 0), w: cw, h: chh }));
    const petTop = top + Math.ceil(ROOM_DECOR.length / cols) * (chh + gap) + 30 * S - (this.panelScroll || 0);
    const pw = (f.w - 48 * S - 16 * S) / 3;
    const pets = PETS.map((p, i) => ({ p, x: f.x + 24 * S + i * (pw + 8 * S), y: petTop, w: pw, h: 38 * S }));
    return { f, cards, pets, top, petTop };
  },
  updateRoomTab(mx, my) {
    if (!mouse.justDown) return;
    const L = this.roomTabLayout(this.panelFrame()); const bot = L.f.y + L.f.h - 24 * L.f.S;
    for (const c of L.cards) {
      if (c.y + c.h < L.top - 6 * L.f.S || c.y > bot) continue;   // QA B12: match the draw clip (L.top - 6S) so the top sliver stays clickable
      if (inside(mx, my, c)) {
        if (decorOwned(META, c.d.id)) { this.feedback('已擁有 ' + c.d.name); return; }
        if (decorLocked(META, c.d)) { this.feedback('🔒 尚未解鎖'); return; }
        if (META.gold < c.d.price) { this.feedback('金幣不足'); return; }
        this.ask('購買裝飾「' + c.d.name + '」？', goldStr(c.d.price), () => { if (buyDecor(META, c.d.id)) { saveMeta(); this.injectRoomDecor(); this.feedback('已佈置 ' + c.d.name); } });
        return;
      }
    }
    for (const pt of L.pets) {
      if (pt.y + pt.h < L.top - 6 * L.f.S || pt.y > bot) continue;   // QA B12: align with the draw clip
      if (inside(mx, my, pt)) {
        if (!petUnlocked(META, pt.p)) { this.feedback('🔒 ' + pt.p.hint); return; }
        META.pet = (META.pet === pt.p.id) ? null : pt.p.id; saveMeta(); Sfx.play('uiClick');
        this.feedback(META.pet ? ('出戰寵物：' + pt.p.name) : '已收起寵物');
        return;
      }
    }
  },
  drawRoomTab(f) {
    const S = f.S, mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const L = this.roomTabLayout(f);
    let bottom = L.top;
    for (const c of L.cards) bottom = Math.max(bottom, c.y + c.h + (this.panelScroll || 0));
    for (const pt of L.pets) bottom = Math.max(bottom, pt.y + pt.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom + 12 * S - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, L.top - 6 * S, f.w, (f.y + f.h - 24 * S) - (L.top - 6 * S)); ctx.clip();
    for (const c of L.cards) {
      if (c.y + c.h < L.top - 6 * S || c.y > f.y + f.h) continue;
      const owned = decorOwned(META, c.d.id), locked = decorLocked(META, c.d), hov = inside(mx, my, c);
      uiRect(c.x, c.y, c.w, c.h, withAlpha(owned ? '#16221a' : locked ? '#1a1622' : (hov ? '#243a5a' : '#1b2138'), 0.95), { radius: 6 * S, stroke: owned ? P.greenD : locked ? P.purpleD : (hov ? P.shardL : P.ink2), lw: 1 });
      const sp = getSprite(c.d.sprite); if (sp && !sp.missing) { const sc = Math.min(2 * S, (c.h - 8 * S) / sp.h); drawSpriteUI(sp.frames[0], c.x + 6 * S, c.y + c.h - sp.h * sc - 3 * S, sc, { alpha: owned ? 1 : 0.85 }); }
      uiText(c.d.name, c.x + 44 * S, c.y + 15 * S, { size: 12 * S, color: owned ? P.greenL : '#fff', weight: '800' });
      if (owned) uiText('✓ 已佈置', c.x + 44 * S, c.y + 30 * S, { size: 10 * S, color: P.greenL, weight: '700' });
      else if (locked) uiText('🔒 需開發者彩蛋', c.x + 44 * S, c.y + 30 * S, { size: 10 * S, color: P.purpleL, weight: '700' });
      else goldLabel(c.x + 44 * S, c.y + 30 * S, c.d.price, { size: 11 * S, align: 'left', color: META.gold >= c.d.price ? P.goldL : P.gray3, weight: '800' });
    }
    uiText('🐾 出戰寵物（純裝飾，點擊出戰／收起）', f.x + 24 * S, L.petTop - 12 * S, { size: 12 * S, color: P.shardL, weight: '800' });
    for (const pt of L.pets) {
      const unlocked = petUnlocked(META, pt.p), on = META.pet === pt.p.id, hov = inside(mx, my, pt);
      uiRect(pt.x, pt.y, pt.w, pt.h, withAlpha(on ? '#243a5a' : (hov ? '#1f2542' : '#1b2138'), 0.95), { radius: 6 * S, stroke: on ? P.shardL : unlocked ? P.gray3 : P.ink2, lw: on ? 2 : 1 });
      const sp = getSprite(pt.p.sprite); if (sp && !sp.missing) { const sc = Math.min(1.8 * S, (pt.h - 6 * S) / sp.h); drawSpriteUI(sp.frames[0], pt.x + 5 * S, pt.y + pt.h - sp.h * sc - 3 * S, sc, { alpha: unlocked ? 1 : 0.3 }); }
      uiText(pt.p.name, pt.x + pt.w / 2 + 6 * S, pt.y + 14 * S, { size: 11 * S, align: 'center', color: unlocked ? '#fff' : P.gray3, weight: '800' });
      uiText(unlocked ? (on ? '● 出戰中' : '可出戰') : ('🔒 ' + pt.p.hint), pt.x + pt.w / 2 + 6 * S, pt.y + 29 * S, { size: 8.5 * S, align: 'center', color: on ? P.shardL : P.gray3, weight: '700' });
    }
    ctx.restore();
    this.drawScrollbar(f);
  },
  tabRects(f) {
    const S = f.S; const tabs = this.panel === 'smith' ? ['鍛造', '營地設施'] : ['任務委託', '公會等級'];
    return tabs.map((name, i) => ({ name, i, x: f.x + 20 * S + i * 130 * S, y: f.y + 46 * S, w: 122 * S, h: 26 * S }));
  },
  drawTabs(f) {
    const S = f.S;
    for (const tb of this.tabRects(f)) {
      const on = this.tab === tb.i;
      // 1.5: clearer tab contrast — unselected darker, selected brighter + a bottom accent line
      uiRect(tb.x, tb.y, tb.w, tb.h, withAlpha(on ? '#26406a' : '#11142a', 0.97), { radius: 6 * S, stroke: on ? P.shardL : withAlpha(P.ink2, 0.9), lw: on ? 2 : 1 });
      if (on) uiRect(tb.x + 8 * S, tb.y + tb.h - 3.5 * S, tb.w - 16 * S, 2.5 * S, P.shardL, { radius: 1.5 * S });
      uiText(tb.name, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1 * S, { size: (UI.FONT_HEADING - 1) * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray3, weight: '800' });
    }
  },

  // ---- scrollbar (原#19) ----------------------------------------------------
  scrollbarGeom(f) {
    const S = f.S;
    const x = f.x + f.w - 14 * S, y = f.y + 78 * S, h = f.h - 96 * S, w = 8 * S;
    const max = this.panelMaxScroll || 0;
    const content = h + max;
    const thumbH = Math.max(26 * S, h * (h / Math.max(h, content)));
    const thumbY = max > 0 ? y + (h - thumbH) * ((this.panelScroll || 0) / max) : y;
    return { x, y, h, w, thumbH, thumbY, max, S };
  },
  handleScrollbar(mx, my, f) {
    if (!(this.panelMaxScroll > 0)) { this.scrollDrag = null; return false; }
    const g = this.scrollbarGeom(f);
    if (this.scrollDrag) {
      if (!mouse.down) { this.scrollDrag = null; return false; }
      const trackH = g.h - g.thumbH;
      this.panelScroll = clamp(this.scrollDrag.s + (trackH > 0 ? (my - this.scrollDrag.y) / trackH * g.max : 0), 0, g.max);
      return true;
    }
    if (mouse.justDown && mx >= g.x - 6 * g.S && mx <= g.x + g.w + 6 * g.S && my >= g.y && my <= g.y + g.h) {
      if (my < g.thumbY || my > g.thumbY + g.thumbH) { const trackH = g.h - g.thumbH; this.panelScroll = clamp((my - g.y - g.thumbH / 2) / Math.max(1, trackH) * g.max, 0, g.max); }
      this.scrollDrag = { y: my, s: this.panelScroll };
      return true;
    }
    return false;
  },
  drawScrollbar(f) {
    if (!(this.panelMaxScroll > 0)) return;
    const g = this.scrollbarGeom(f);
    uiRect(g.x, g.y, g.w, g.h, withAlpha('#0b0d1a', 0.55), { radius: g.w / 2 });
    uiRect(g.x, g.thumbY, g.w, g.thumbH, withAlpha(this.scrollDrag ? P.shardL : P.gray3, 0.92), { radius: g.w / 2 });
  },

  // ---- talents (church) ----------------------------------------------------
  // round16/9.3: VS-style dynamic price = base × HUB_COST_GROWTH^(this panel's purchase count).
  hubCost(base, key) { return Math.round(base * Math.pow(BALANCE.HUB_COST_GROWTH, (META.hub && META.hub[key]) || 0)); },
  hubPriceHint(key) { const n = (META.hub && META.hub[key]) || 0; return n ? '已升級 ' + n + ' 次 · 後續費用 +' + Math.round((Math.pow(BALANCE.HUB_COST_GROWTH, n) - 1) * 100) + '%' : '每次升級後本欄費用 +' + Math.round((BALANCE.HUB_COST_GROWTH - 1) * 100) + '%'; },
  talentState(def) {
    const cur = META.talents[def.id] || 0;
    if (cur >= def.maxLevel) return 'max';
    if ((def.row || 0) >= 2 && !(cur > 0) && gate(META, 'talentRow2')) return 'gated';   // R17/9.1: 3rd talent row gated by guild rank — owned nodes (pre-gate buys) stay upgradeable, never shown locked
    if (def.requires) for (const r of def.requires) if (!(META.talents[r] > 0)) return 'locked';
    return META.gold >= this.hubCost(def.cost(cur), 'talentPurchases') ? 'ok' : 'poor';
  },
  buyTalent(def) {
    if (this.talentState(def) !== 'ok') return;
    const cur = META.talents[def.id] || 0;
    META.gold -= this.hubCost(def.cost(cur), 'talentPurchases'); META.talents[def.id] = cur + 1;
    META.hub = META.hub || {}; META.hub.talentPurchases = (META.hub.talentPurchases || 0) + 1; saveMeta();
    this.feedback(def.name + ' Lv.' + (cur + 1));
  },
  facilityState(def) {
    const cur = META.facilities[def.id] || 0;
    if (cur >= def.maxLevel) return 'max';
    if (facilityGate(META, def.id, cur + 1)) return 'gated';   // R17/9.1: high facility levels gated by biome clears
    return META.gold >= this.hubCost(def.cost(cur), 'facilityPurchases') ? 'ok' : 'poor';
  },
  buyFacility(def) {
    if (this.facilityState(def) !== 'ok') return;
    const cur = META.facilities[def.id] || 0;
    META.gold -= this.hubCost(def.cost(cur), 'facilityPurchases'); META.facilities[def.id] = cur + 1;
    META.hub = META.hub || {}; META.hub.facilityPurchases = (META.hub.facilityPurchases || 0) + 1;
    if (def.onPurchase) try { def.onPurchase(META, cur + 1); } catch (e) { /* */ }
    saveMeta(); this.feedback(def.name + ' Lv.' + (cur + 1));
  },

  // ---- layout helpers ------------------------------------------------------
  panelFrame() {
    const S = uiScale();
    const pw = Math.min(view.W * 0.82, 880 * S);
    const ph = Math.min(view.H * 0.84, 600 * S);
    const x = (view.W - pw) / 2, y = (view.H - ph) / 2;
    return { x, y, w: pw, h: ph, S, close: { x: x + pw - 38 * S, y: y + 10 * S, w: 28 * S, h: 28 * S } };
  },
  // content area top (lower for tabbed panels)
  bodyTop(f) { return (this.panel === 'smith' || this.panel === 'guild' || this.panel === 'wardrobe') ? f.y + 80 * f.S : f.y + 58 * f.S; },
};
