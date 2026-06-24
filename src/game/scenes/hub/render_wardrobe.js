// hub/render_wardrobe.js — render_wardrobe methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse } from '../../../engine/input.js';
import { clamp } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { ctxRaw, drawSpriteUI, textWidth, uiClipRound, uiRect, uiText, view } from '../../../engine/renderer.js';
import { getSprite } from '../../../engine/sprites.js';
import { ACHIEVEMENTS, achievementProgress } from '../../content/achievements.js';
import { SKINS, ownsSkin, skinSpriteName, skinnedSprite } from '../../content/characters.js';
import { Characters } from '../../content/registry.js';
import { ensureSale, rerollCost, skinPoolDry, skinPrice, skinShopCountdown, skinTier } from '../../content/skinshop.js';
import { META } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { inside } from './shared.js';

export const renderWardrobeMixin = {

  // ---- achievement hall ----------------------------------------------------
  // 3.5-B: filter chips (全部 / 已達成 / 未達成) so the 200+ list is browsable.
  achFilterRects(f) {
    const S = f.S, y = f.y + 60 * S, w = 70 * S, h = 22 * S, gap = 8 * S, x0 = f.x + 24 * S;   // R17/1.8: 4 tabs — slightly narrower
    return [0, 1, 2, 3].map((i) => ({ x: x0 + i * (w + gap), y, w, h, i }));
  },
  updateAchievements(mx, my) {
    if (!mouse.justDown) return;
    for (const r of this.achFilterRects(this.panelFrame())) if (inside(mx, my, r)) { if ((this.achFilter || 0) !== r.i) { this.achFilter = r.i; this.panelScroll = 0; } Sfx.play('uiClick'); return; }
  },
  drawAchievements() {
    const f = this.drawPanelFrame('成 就 殿 堂', '達成成就 · 解鎖更多內容');
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const got = META.achievements || [];
    // 3.5-B filter tabs + R17/1.8: a dedicated 隱藏 tab (violet accent)
    const HID = '#d36bff';
    const FILTERS = ['全部', '已達成', '未達成', '隱藏']; const fl = this.achFilter || 0;
    this.achFilterRects(f).forEach((r) => {
      const on = fl === r.i, hov = inside(mx, my, r);
      const acc = r.i === 3 ? HID : P.shardL;
      uiRect(r.x, r.y, r.w, r.h, withAlpha(on ? '#243a5a' : (hov ? '#1f2740' : '#1b2138'), 0.96), { radius: 6 * S, stroke: on ? acc : P.ink2, lw: on ? 2 : 1 });
      uiText(FILTERS[r.i], r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: on ? acc : P.gray3, weight: '800' });
    });
    const list = ACHIEVEMENTS.filter((a) => fl === 0 ? true : fl === 1 ? got.includes(a.id) : fl === 2 ? !got.includes(a.id) : !!a.hidden);
    const cols = 2;
    const cardW = (f.w - 40 * S - (cols - 1) * 14 * S) / cols, cardH = 62 * S;
    const gridTop = f.y + 92 * S, clipTop = f.y + 86 * S;
    const rows = Math.ceil(list.length / cols);
    const bottom = gridTop + rows * (cardH + 9 * S);
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    if (mouse.wheel) this.panelScroll = clamp((this.panelScroll || 0) + mouse.wheel * 0.5, 0, this.panelMaxScroll);
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, clipTop, f.w, f.y + f.h - 24 * S - clipTop); ctx.clip();
    if (!list.length) uiText('（此分類沒有成就）', f.x + f.w / 2, gridTop + 20 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    list.forEach((a, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = f.x + 20 * S + c * (cardW + 14 * S), y = gridTop + r * (cardH + 9 * S) - (this.panelScroll || 0);
      if (y > f.y + f.h || y + cardH < clipTop) return;   // cull off-screen rows
      const done = got.includes(a.id);
      const hid = !!a.hidden;   // R17/1.8: hidden achievements keep a violet identity BOTH before and after completion
      const name = (hid && !done) ? '？？？' : (a.realName || a.name);
      let desc = (hid && !done) ? '隱藏成就 — 達成後揭曉' : a.desc;
      if (!done && !a.hidden && a.prog) { const pg = a.prog(META.stats || {}, META); desc += `（${Math.min(pg[0], pg[1])}/${pg[1]}）`; }
      uiRect(x, y, cardW, cardH, withAlpha(done ? (hid ? '#2a1d33' : '#1d2c1d') : (hid ? '#221a2c' : '#1b2138'), 0.96), { radius: 7 * S, stroke: hid ? withAlpha(HID, done ? 0.9 : 0.5) : (done ? P.goldL : P.ink2), lw: 2 });
      uiText(done ? '★' : '☆', x + 12 * S, y + 23 * S, { size: 17 * S, color: done ? (hid ? HID : P.goldL) : P.gray2, weight: '900' });
      if (hid) { const pw = textWidth('★隱藏', 8.5 * S, '800') + 10 * S; uiRect(x + cardW - pw - 8 * S, y + 8 * S, pw, 14 * S, withAlpha(HID, 0.18), { radius: 7 * S, stroke: withAlpha(HID, 0.7), lw: 1 }); uiText('★隱藏', x + cardW - pw / 2 - 8 * S, y + 15 * S, { size: 8.5 * S, align: 'center', baseline: 'middle', color: HID, weight: '800' }); }
      uiText(name, x + 34 * S, y + 20 * S, { size: 12.5 * S, color: done ? '#fff' : P.gray3, weight: '800' });
      this.clip1(desc, x + 34 * S, y + 38 * S, cardW - 42 * S, 10 * S, done ? P.gray4 : P.gray2);
      if (a.rewardLabel) this.clip1((done ? '✓ 已解鎖：' : '✦ 解鎖：') + a.rewardLabel, x + 34 * S, y + 53 * S, cardW - 42 * S, 9.5 * S, done ? P.greenL : P.shardL, '700');
    });
    ctx.restore();
    this.drawScrollbar(f);
    const prog = achievementProgress(META);
    uiText(`已解鎖 ${prog.unlocked} / ${prog.total}　·　▲▼ 滾輪捲動　·　Esc 關閉`, f.x + f.w / 2, f.y + f.h - 14 * S, { size: 12 * S, align: 'center', color: P.goldL, weight: '700' });
  },

  // ---- clothing store (R17/3.1 layered: entry → mine/shop → per-hero) -------
  drawWardrobe() {
    if (!this.wardrobeView) { const f = this.drawPanelFrame('衣 帽 店', '更換造型 · 或逛逛本期進貨'); this.drawWardrobeEntry(f); return; }
    if (this.wardrobeView === 'shop') { const f = this.drawPanelFrame('衣 帽 店 · 造型商店', '每 30 分鐘進貨 8 款 · 隱藏款 1% 機率現身 · 購買後不可退款'); this.drawSkinShop(f); return; }
    if (this.wardrobeChar == null) { const f = this.drawPanelFrame('衣 帽 店 · 我的造型', '選擇角色 · 點擊裝備已擁有的造型'); this.drawWardrobeChars(f); return; }
    const ch = Characters.get(this.wardrobeChar);
    const f = this.drawPanelFrame('衣 帽 店 · ' + (ch ? ch.name : this.wardrobeChar), '我的造型 · 點擊裝備');
    this.drawWardrobeSkins(f);
  },
  drawWardrobeEntry(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.panelMaxScroll = 0;
    const R = this.wardrobeEntryRects(f);
    const door = (r, icon, title, caption, accent) => {
      const hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#27306a' : '#1b2138', 0.97), { radius: 12 * S, stroke: hov ? accent : withAlpha(accent, 0.45), lw: hov ? 3 : 2 });
      uiText(icon, r.x + r.w / 2, r.y + r.h * 0.38, { size: 34 * S, align: 'center', color: accent, weight: '900' });
      uiText(title, r.x + r.w / 2, r.y + r.h * 0.62, { size: 17 * S, align: 'center', color: hov ? '#fff' : '#eaf2ff', weight: '900' });
      uiText(caption, r.x + r.w / 2, r.y + r.h * 0.62 + 20 * S, { size: 10 * S, align: 'center', color: P.gray3, weight: '600' });
    };
    door(R.mine, '👤', '我的造型', '為每位獵人更換已擁有的造型', P.shardL);
    door(R.shop, '🛍', '造型商店', '本期 8 款 · 30 分鐘輪替 · 隱藏款 1%', P.goldL);
    uiText('Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
  drawSkinShop(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.panelMaxScroll = 0;
    const L = this.skinShopLayout(f);
    // toolbar: back + restock countdown + reroll
    const bh = inside(mx, my, L.back);
    uiRect(L.back.x, L.back.y, L.back.w, L.back.h, withAlpha(bh ? '#27306a' : '#161b34', 0.95), { radius: 6 * S, stroke: withAlpha(P.shardL, bh ? 0.9 : 0.5), lw: 1.5 });
    uiText('◀ 返回', L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
    const dry = skinPoolDry(META);   // R17 QA: pool exhausted — reroll/countdown are no-ops, hide them
    if (!dry) {
      const ms = skinShopCountdown(META), mm = Math.floor(ms / 60000), ss2 = Math.floor((ms % 60000) / 1000);
      uiText('↻ 下次免費進貨 ' + mm + ':' + String(ss2).padStart(2, '0'), L.reroll.x - 12 * S, L.reroll.y + L.reroll.h / 2 + 1 * S, { size: 10.5 * S, align: 'right', baseline: 'middle', color: P.gray3, weight: '700' });
      const rh = inside(mx, my, L.reroll);
      uiRect(L.reroll.x, L.reroll.y, L.reroll.w, L.reroll.h, withAlpha(rh ? '#3a5a2a' : '#26401c', 0.96), { radius: 6 * S, stroke: P.greenL, lw: 1.5 });
      goldLabel(L.reroll.x + L.reroll.w / 2, L.reroll.y + L.reroll.h / 2 + 1 * S, rerollCost(META), { size: 11 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800', prefix: '↺ 重新進貨 ' });
    }
    if (!L.cards.length) {
      uiText(dry ? '已蒐集所有上架造型！' : '本輪沒有進到新貨——重新進貨試試手氣', f.x + f.w / 2, f.y + f.h / 2, { size: 16 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '900' });
      return;
    }
    const TIER = { normal: '普通', premium: '豪華', hidden: '★隱藏' };
    const TIERCOL = { normal: '#cfd6ee', premium: P.shardL, hidden: P.goldL };
    for (const cd of L.cards) {
      const sk = SKINS.find((s) => s.id === cd.o.s); const c = Characters.get(cd.o.c);
      if (!sk || !c) continue;
      const owned = (META.ownedSkins || []).includes(cd.o.c + ':' + cd.o.s);
      const hov = inside(mx, my, cd); const hidden = !!sk.hidden;
      const pr = skinPrice(META, sk);
      uiRect(cd.x, cd.y, cd.w, cd.h, withAlpha(hidden ? '#241a10' : hov ? '#243a5a' : '#1b2138', 0.96), { radius: 9 * S, stroke: hidden ? P.goldL : hov ? P.shardL : P.ink2, lw: hidden || hov ? 2.5 : 1.5 });
      if (hidden) uiClipRound(cd.x, cd.y, cd.w, cd.h, 9 * S, () => uiRect(cd.x, cd.y, cd.w, 4 * S, P.goldL));
      const sp = getSprite(skinSpriteName(cd.o.c, cd.o.s)), sc = Math.min(2.4 * S, (cd.h - 78 * S) / sp.h);
      drawSpriteUI(sp.frames[Math.floor(this.t * 3) % sp.frames.length], cd.x + cd.w / 2 - sp.w * sc / 2, cd.y + 12 * S, sc, { alpha: owned ? 0.45 : 1 });
      uiText((hidden ? '★ ' : '') + sk.name, cd.x + cd.w / 2, cd.y + cd.h - 52 * S, { size: 12 * S, align: 'center', color: hidden ? P.goldL : '#fff', weight: '800' });
      // char tag + tier pill row
      const tierTxt = TIER[skinTier(sk)] || '';
      uiText(c.name + '　·　' + tierTxt, cd.x + cd.w / 2, cd.y + cd.h - 38 * S, { size: 9 * S, align: 'center', color: TIERCOL[skinTier(sk)] || P.gray3, weight: '700' });
      if (owned) uiText('已擁有', cd.x + cd.w / 2, cd.y + cd.h - 16 * S, { size: 11 * S, align: 'center', color: P.greenL, weight: '800' });
      else {
        const afford = (META.gold || 0) >= pr.price;
        if (pr.onSale) {
          uiText(String(Math.round(pr.base)), cd.x + cd.w / 2 - 34 * S, cd.y + cd.h - 16 * S, { size: 9 * S, align: 'center', color: P.gray2, weight: '600' });
          uiText('特賣8折', cd.x + cd.w / 2, cd.y + cd.h - 28 * S, { size: 8.5 * S, align: 'center', color: P.emberL, weight: '800' });
        }
        goldLabel(cd.x + cd.w / 2 + (pr.onSale ? 10 * S : 0), cd.y + cd.h - 16 * S, pr.price, { size: 11.5 * S, align: 'center', color: afford ? P.goldL : P.redL, weight: '900' });
      }
    }
    const sale = ensureSale(META); const sms = sale && sale.until ? Math.max(0, sale.until - Date.now()) : 0; const dd = Math.floor(sms / 86400000), hh = Math.floor((sms % 86400000) / 3600000);
    uiText('🏷 特賣輪替剩 ' + dd + ' 天 ' + hh + ' 時（僅普通/豪華 8 折，隱藏款恕不打折）　·　Esc 返回', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
  drawWardrobeChars(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.wardrobeCharCards();
    // R17/3.1: back to the entry screen
    const bk = this.wardrobeBackRect(f); const bh = inside(mx, my, bk);
    uiRect(bk.x, bk.y, bk.w, bk.h, withAlpha(bh ? '#27306a' : '#161b34', 0.95), { radius: 6 * S, stroke: withAlpha(P.shardL, bh ? 0.9 : 0.5), lw: 1.5 });
    uiText('◀ 返回', bk.x + bk.w / 2, bk.y + bk.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
    let bottom = L.top; for (const c of L.cards) bottom = Math.max(bottom, c.y + c.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y + 58 * S, f.w, f.h - 82 * S); ctx.clip();
    for (const card of L.cards) {
      const c = card.c, hov = inside(mx, my, card);
      const ownedN = SKINS.filter((sk) => ownsSkin(META, c.id, sk.id)).length;
      uiRect(card.x, card.y, card.w, card.h, withAlpha(hov ? '#243a5a' : '#1b2138', 0.96), { radius: 8 * S, stroke: hov ? P.shardL : P.ink2, lw: hov ? 3 : 2 });
      const sp = getSprite(skinnedSprite(META, c.id)), sc = 2.6 * S;
      drawSpriteUI(sp.frames[Math.floor(this.t * 3) % sp.frames.length], card.x + card.w / 2 - sp.w * sc / 2, card.y + 10 * S, sc);
      uiText(c.name, card.x + card.w / 2, card.y + card.h - 22 * S, { size: 12 * S, align: 'center', color: '#fff', weight: '800' });
      uiText('已持有 ' + ownedN + ' / ' + SKINS.length, card.x + card.w / 2, card.y + card.h - 8 * S, { size: 9.5 * S, align: 'center', color: P.shardL, weight: '700' });
    }
    ctx.restore(); this.drawScrollbar(f);
    uiText('滾輪捲動　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
  // R17/3.1: owned-skins list — pure equip flow (the buy path moved to the shop view)
  drawWardrobeSkins(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.wardrobeSkinLayout(); const cid = L.cid;
    const bh = inside(mx, my, L.back);
    uiRect(L.back.x, L.back.y, L.back.w, L.back.h, withAlpha(bh ? '#27306a' : '#161b34', 0.95), { radius: 6 * S, stroke: withAlpha(P.shardL, bh ? 0.9 : 0.5), lw: 1.5 });
    uiText('◀ 返回', L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
    let bottom = L.top; for (const r of L.rows) bottom = Math.max(bottom, r.y + r.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, L.top - 6 * S, f.w, f.y + f.h - 24 * S - (L.top - 6 * S)); ctx.clip();
    const TIER = { normal: '普通', premium: '豪華', hidden: '隱藏' };
    for (const r of L.rows) {
      const sk = r.sk, id = sk.id || null;
      const equipped = (id || null) === (META.skins[cid] || null);
      const hidden = !!sk.hidden;
      const stroke = equipped ? P.shardL : hidden ? withAlpha(P.goldL, 0.6) : P.ink2;
      uiRect(f.x + 16 * S, r.y, f.w - 32 * S, r.h, withAlpha(equipped ? '#243a5a' : '#1b2138', 0.94), { radius: 7 * S, stroke, lw: equipped ? 2 : 1.5 });
      const sp = getSprite(skinSpriteName(cid, id)), sc = Math.min((r.h - 8 * S) / sp.h, 2.2 * S);
      drawSpriteUI(sp.frames[0], f.x + 26 * S, r.y + (r.h - sp.h * sc) / 2, sc);
      uiText((hidden ? '★ ' : '') + (id ? sk.name : '原色'), f.x + 66 * S, r.y + 17 * S, { size: 13 * S, color: hidden ? P.goldL : '#fff', weight: '800' });
      if (id) uiText(TIER[skinTier(sk)] || '', f.x + 66 * S, r.y + 33 * S, { size: 9.5 * S, color: P.gray3, weight: '700' });
      const b = r.btn;
      if (equipped) uiText('● 使用中', b.x + b.w / 2, b.y + b.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: P.shardL, weight: '800' });
      else { const h2 = inside(mx, my, b); uiRect(b.x, b.y, b.w, b.h, withAlpha(h2 ? '#27306a' : '#1b2840', 0.96), { radius: 6 * S, stroke: P.shardL, lw: 1.5 }); uiText('裝備', b.x + b.w / 2, b.y + b.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '800' }); }
    }
    ctx.restore(); this.drawScrollbar(f);
    uiText('想要更多造型？回到入口逛「造型商店」　·　Esc 返回', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
};
