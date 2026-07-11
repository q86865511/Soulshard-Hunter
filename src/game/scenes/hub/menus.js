// hub/menus.js — menus methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { UI, drawSpriteUI, goldStr, textWidth, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite } from '../../../engine/sprites.js';
import { Net } from '../../../net/api.js';
import { openSocial } from '../../../net/social.js';
import { isModalOpen, netToast, openAdmin, openAuth, openFeedback, openLeaderboard } from '../../../net/ui.js';
import { bankLimit } from '../../content/bank.js';
import { skinnedSprite } from '../../content/characters.js';
import { forgeEffectCostBase, forgeLevelCostBase, forgeableWeapons } from '../../content/forge.js';
import { NPCS, markMet, npcScript, talkAffinity } from '../../content/npcs.js';
import { Characters, Facilities, Talents } from '../../content/registry.js';
import { decorById } from '../../content/room_decor.js';
import { ensureSale } from '../../content/skinshop.js';
import { gate } from '../../content/town_gates.js';
import { setScene } from '../../scene.js';
import { META, saveMeta } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { settingsUI } from '../../ui/settings.js';
import { refs } from '../refs.js';
import { inside } from './shared.js';

export const menusMixin = {

  // ---- town Esc menu (round-15): a small option menu first; each option opens its page ----
  escMenuItems() {
    const u = Net.currentUser() || {};
    const items = [
      { id: 'resume', label: '繼續遊戲', col: P.greenL },
      { id: 'account', label: Net.isLoggedIn() ? ('☁ ' + (u.username || '帳號')) : '☁ 登入 / 註冊', col: P.shardL },
      { id: 'multi', label: '👥 多人連線', col: P.shardL },
      { id: 'leaderboard', label: '🏆 排行榜', col: P.shardL },
      { id: 'guide', label: '📖 新手指南', col: P.greenL },   // R17/10.1: replay the town tutorial any time
    ];
    if (Net.isAdmin()) items.push({ id: 'admin', label: '🛠 管理主控台', col: P.manaL });
    items.push({ id: 'feedback', label: '⚑ 回報問題', col: P.goldL });
    items.push({ id: 'settings', label: '⚙ 設定', col: P.shardL });
    items.push({ id: 'title', label: '🏠 返回主畫面', col: P.goldL });
    return items;
  },
  escMenuLayout() {
    const S0 = uiScale(); const items = this.escMenuItems();
    // R17 UI-sweep: FIT the whole group to the viewport — at uiScale 1.5 a 9-item menu
    // measured ~854px on a 720px screen (title off the top, last button past the bottom).
    const need = (s) => 58 * s + items.length * 46 * s + (items.length - 1) * 10 * s;   // 58s = title glyph box (baseline -30s + ~22s ascent + pad)
    const S = need(S0) > view.H - 24 ? S0 * (view.H - 24) / need(S0) : S0;
    const w = 300 * S, h = 46 * S, gap = 10 * S, x = view.W / 2 - w / 2;
    // 1.7: center the WHOLE group (title + buttons) — the「選 單」title floats ~44px above
    // the first button, so offset the buttons down by half the title block to centre the set.
    const titleH = 44 * S;
    const total = items.length * h + (items.length - 1) * gap;
    const y0 = view.H / 2 - (titleH + total) / 2 + titleH;
    items.forEach((it, i) => { it.r = { x, y: y0 + i * (h + gap), w, h }; });
    items.eS = S;   // effective scale — drawEscMenu sizes its fonts with this
    return items;
  },
  updateEscMenu() {
    if (isModalOpen()) return;   // a DOM page is on top — it owns input until closed
    if (pressed('escape') || pressed('pause')) { this.escMenu = false; return; }
    if (!mouse.justDown) return;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const it of this.escMenuLayout()) if (inside(mx, my, it.r)) { this.onEsc(it.id); return; }
  },
  onEsc(id) {
    Sfx.play('uiClick');
    if (id === 'resume') this.escMenu = false;
    else if (id === 'account') openAuth();
    else if (id === 'multi') { if (Net.isLoggedIn()) openSocial(); else { openAuth(); netToast('多人連線需要先登入帳號'); } }
    else if (id === 'leaderboard') openLeaderboard();
    else if (id === 'guide') { this.escMenu = false; this.triggerTutorial(true); }   // R17/10.1
    else if (id === 'admin') openAdmin();
    else if (id === 'feedback') openFeedback();
    else if (id === 'settings') { this.escMenu = false; settingsUI.show(); }
    else if (id === 'title') { this.escMenu = false; saveMeta(); setScene(refs.title, {}); }
  },
  drawEscMenu() {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.72));
    const items = this.escMenuLayout();
    const S = items.eS || uiScale();   // R17 UI-sweep: fonts follow the fitted scale
    uiText('選 單', view.W / 2, items[0].r.y - 30 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    for (const it of items) {
      const hov = inside(mx, my, it.r);
      // 1.5: stronger button↔background contrast + a brighter outline (was 0.4 → faint)
      uiRect(it.r.x, it.r.y, it.r.w, it.r.h, withAlpha(hov ? '#2a3a72' : '#141a36', 0.97), { radius: 9 * S, stroke: hov ? it.col : withAlpha(it.col, 0.6), lw: hov ? 3 : 2 });
      uiText(it.label, it.r.x + it.r.w / 2, it.r.y + it.r.h / 2 + 1 * S, { size: UI.FONT_HEADING * S, align: 'center', baseline: 'middle', color: hov ? '#fff' : '#dbe6ff', weight: '800' });
    }
  },

  openPanel(id) {
    this.panel = id; this.tab = 0; this.personalTab = 0; this.panelScroll = 0; this.panelMaxScroll = 0;
    if (id === 'sortie' && !META.tutorialSortieDone) this.sortieTut = true;   // R17/10.2: first-open walkthrough
    if (id === 'wardrobe') { this.wardrobeView = null; this.wardrobeChar = null; ensureSale(META); }   // R17/3.1: entry screen first
    if (id === 'bank') this.bankAmount = bankLimit(META);   // 7.2: default the custom-borrow amount to the full limit
    if (id === 'smith' && !this.forgeSel) this.forgeSel = (forgeableWeapons(META)[0] || {}).id || null;
    if (id === 'codex') { this.codexTab = 0; this.codexSel = null; }   // P1 內容圖鑑：預設回目標分頁
    Sfx.play('uiClick');
  },
  feedback(msg) { this.flash = msg; this.flashT = 1.4; Sfx.play('buy'); },

  // ---- buy confirmation + per-category reset (task 8) ----------------------
  ask(text, detail, onYes) { this.confirm = { text, detail, onYes }; Sfx.play('uiClick'); },
  confirmRects() {
    const S = uiScale(); const w = Math.min(view.W * 0.62, 440 * S), h = 174 * S;
    const x = (view.W - w) / 2, y = (view.H - h) / 2; const bw = (w - 60 * S) / 2, by = y + h - 54 * S;
    return { x, y, w, h, S, yes: { x: x + 20 * S, y: by, w: bw, h: 38 * S }, no: { x: x + 40 * S + bw, y: by, w: bw, h: 38 * S } };
  },
  updateConfirm(mx, my) {
    if (pressed('escape')) { this.confirm = null; return; }
    if (!mouse.justDown) return;
    const c = this.confirmRects();
    if (inside(mx, my, c.yes)) { const fn = this.confirm.onYes; this.confirm = null; if (fn) fn(); return; }
    if (inside(mx, my, c.no) || !inside(mx, my, c)) { this.confirm = null; Sfx.play('uiClick'); return; }
  },
  drawConfirm() {
    const c = this.confirmRects(); const S = c.S; const cf = this.confirm;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.62));
    uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.99), { radius: 12 * S, stroke: P.goldL, lw: 2 });
    uiText('確 認', c.x + c.w / 2, c.y + 30 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    uiText(cf.text, c.x + c.w / 2, c.y + 64 * S, { size: 14 * S, align: 'center', color: '#fff', weight: '700' });
    if (cf.detail) uiText(cf.detail, c.x + c.w / 2, c.y + 90 * S, { size: 13 * S, align: 'center', color: P.goldL, weight: '800' });
    goldLabel(c.x + c.w / 2, c.y + 112 * S, META.gold || 0, { size: 11 * S, align: 'center', color: P.gray3, weight: '700', prefix: '持有 ' });   // R17/2.1: real coin sprite
    const hy = inside(mx, my, c.yes); uiRect(c.yes.x, c.yes.y, c.yes.w, c.yes.h, withAlpha(hy ? '#2a6a3a' : '#1f5030', 0.98), { radius: 7 * S, stroke: P.greenL, lw: 2 }); uiText('確 定', c.yes.x + c.yes.w / 2, c.yes.y + c.yes.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
    const hn = inside(mx, my, c.no); uiRect(c.no.x, c.no.y, c.no.w, c.no.h, withAlpha(hn ? '#3a2030' : '#2a2030', 0.98), { radius: 7 * S, stroke: P.redD, lw: 2 }); uiText('取 消', c.no.x + c.no.w / 2, c.no.y + c.no.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '800' });
  },
  // which upgrade category the current panel/tab can reset (each separate)
  resetTarget() {
    if (this.panel === 'talents') return { label: '重置天賦', fn: () => this.resetTalents() };
    if (this.panel === 'smith' && this.tab === 0) return gate(META, 'forge') ? null : { label: '重置鍛造', fn: () => this.resetForge() };   // R17 QA: no live control over the locked panel
    if (this.panel === 'smith' && this.tab === 1) return { label: '重置設施', fn: () => this.resetFacilities() };
    return null;
  },
  resetBtnRect(f) { const S = f.S; return { x: f.x + f.w - 258 * S, y: f.y + 13 * S, w: 96 * S, h: 24 * S }; },
  resetTalents() {
    let refund = 0; for (const id in (META.talents || {})) { const def = Talents.get(id); const lvl = META.talents[id] || 0; if (def) for (let i = 0; i < lvl; i++) refund += def.cost(i); }   // refund at base (no 9.3 surcharge)
    META.talents = {}; if (META.hub) META.hub.talentPurchases = 0; META.gold += Math.floor(refund); saveMeta(); this.feedback('天賦已重置，返還 ' + goldStr(Math.floor(refund)));
  },
  resetFacilities() {
    let refund = 0; for (const def of Facilities.all()) { const lvl = META.facilities[def.id] || 0; for (let i = 0; i < lvl; i++) refund += def.cost(i); }
    META.facilities = {}; if (META.hub) META.hub.facilityPurchases = 0; META.gold += Math.floor(refund); saveMeta(); this.feedback('設施已重置，返還 ' + goldStr(Math.floor(refund)));
  },
  resetForge() {
    let refund = 0; for (const id in (META.forge || {})) { const f = META.forge[id] || {}; for (let i = 0; i < (f.level || 0); i++) refund += forgeLevelCostBase(i); const eff = (f.effects || []).length; for (let i = 0; i < eff; i++) refund += forgeEffectCostBase(i); }   // base refund
    META.forge = {}; if (META.hub) META.hub.forgePurchases = 0; META.gold += Math.floor(refund); saveMeta(); this.feedback('鍛造已重置，返還 ' + goldStr(Math.floor(refund)));
  },

  // ---- NPC dialogue (5-1) --------------------------------------------------
  openDialogue(npc) {
    const def = npc.def;
    if (markMet(META, def.id)) saveMeta();
    const rw = talkAffinity(META, def.id);   // R18/B11: +1 affinity per local day; returns reward on a level-up
    if (rw) {
      saveMeta();
      let msg = '❤ ' + def.name + ' 好感 Lv' + rw.level + '！+' + rw.gold + ' 金幣';
      if (rw.decor) { const dd = decorById(rw.decor); msg += '，獲贈「' + (dd ? dd.name : '裝飾') + '」'; this.injectRoomDecor(); }
      if (rw.qol) msg += '（解鎖專屬優待）';
      this.feedback(msg);
    }
    this.dialogue = { npc: def, sprite: def.sprite, lines: npcScript(def, META), page: 0 };
    Sfx.play('uiClick');
  },
  dialoguePrevRect() {
    const S = uiScale(); const w = Math.min(view.W * 0.8, 760 * S), h = 132 * S, x = (view.W - w) / 2, y = view.H - h - 22 * S;
    return { x: x + 14 * S, y: y + h - 28 * S, w: 78 * S, h: 20 * S };
  },
  closeDialogue() { const d = this.dialogue; this.dialogue = null; if (d && d.onClose) try { d.onClose(); } catch (e) { /* */ } },
  updateDialogue() {
    const d = this.dialogue;
    if (pressed('escape') || pressed('build')) { this.closeDialogue(); return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    // 2.2: go back a page (◀ button or ← key), only when not on the first page — tested
    // BEFORE the advance handler so clicking ◀ doesn't also advance.
    if (d.page > 0 && (pressed('left') || (mouse.justDown && inside(mx, my, this.dialoguePrevRect())))) { d.page--; Sfx.play('uiClick'); return; }
    const advance = pressed('interact') || pressed('enter') || pressed('space') || mouse.justDown;
    if (!advance) return;
    if (d.page < d.lines.length - 1) { d.page++; Sfx.play('uiClick'); return; }
    // on the last line: keeper NPCs open their panel, others just close
    const st = d.npc.station;
    this.closeDialogue();
    if (st) this.openPanel(st);
  },
  // 6.1 新手教學：城鎮引導（蕾恩，6 頁，看過一次後不再；舊存檔升級也會觸發）
  // R17/10.1: force=true（ESC 選單「📖 新手指南」）無視 tutorialDone 隨時重播
  triggerTutorial(force = false) {
    if ((!force && META.tutorialDone) || this.dialogue || this.panel) return;
    const guide = NPCS.find((n) => n.id === 'guide') || { name: '蕾恩', title: '城鎮嚮導', color: P.greenL, sprite: 'npc_guide' };
    const lines = [
      { text: '你醒了……終於。我是蕾恩，城鎮的嚮導。' },
      { text: '這裡是魂晶之鎮，獵手們在戰場闖蕩後回來的避風港。' },
      { text: '傳送門就在廣場中央——走進去，選好英雄和生態，出發狩獵！' },
      { text: '回來後，把賺來的金幣花在各個房間，讓自己越來越強。' },
      { text: '每通關一個生態與難度，就會解鎖下一個生態、更高難度——通關過的生態還能挑戰「無盡」！' },   // R17/10.2
      { text: '其他居民也可以交談，他們各有各的故事……準備好了嗎？' },
    ];
    this.dialogue = { npc: { ...guide, station: null }, sprite: guide.sprite, lines, page: 0, onClose: () => { META.tutorialDone = true; saveMeta(); } };
    Sfx.play('uiClick');
  },
  drawDialogue() {
    const S = uiScale(); const d = this.dialogue; const line = d.lines[d.page] || { who: '', text: '' };
    const w = Math.min(view.W * 0.8, 760 * S), h = 132 * S, x = (view.W - w) / 2, y = view.H - h - 22 * S;
    uiRect(x, y, w, h, withAlpha('#0d1024', 0.95), { radius: 12 * S, stroke: withAlpha(d.npc.color || P.shardL, 0.8), lw: 2 });
    // portrait
    uiRect(x + 12 * S, y + 12 * S, 64 * S, 64 * S, withAlpha('#1b2138', 0.96), { radius: 8 * S, stroke: P.ink2, lw: 2 });
    const sp = getSprite(d.sprite); const sc = (58 * S) / sp.h;
    drawSpriteUI(sp.frames[Math.floor(this.t * 3) % sp.frames.length], x + 12 * S + (64 * S - sp.w * sc) / 2, y + 14 * S, sc);
    uiText(d.npc.name + ' · ' + d.npc.title, x + 88 * S, y + 26 * S, { size: 15 * S, color: d.npc.color || P.shardL, weight: '900' });
    // 2.1: 主角頭像（右側鏡像）+ 英雄名
    const cid = META.selectedCharacter || 'hunter';
    const heroSp = getSprite(this.heroSprite || skinnedSprite(META, cid) || 'player');
    const hpx = x + w - 12 * S - 64 * S;
    uiRect(hpx, y + 12 * S, 64 * S, 64 * S, withAlpha('#1b2138', 0.96), { radius: 8 * S, stroke: P.ink2, lw: 2 });
    const hsc = (58 * S) / heroSp.h;
    drawSpriteUI(heroSp.frames[Math.floor(this.t * 3) % heroSp.frames.length], hpx + (64 * S - heroSp.w * hsc) / 2, y + 14 * S, hsc);
    uiText((Characters.get(cid) || {}).name || cid, hpx + 32 * S, y + 88 * S, { size: 10 * S, align: 'center', color: '#e8e0c0', weight: '800' });
    // text (wrap) — reserve the right portrait column so lines never run under it
    const tx = x + 88 * S, maxw = w - 104 * S - 84 * S; let yy = y + 48 * S, cur = '', size = 13.5 * S;
    const isAsk = line.ask;
    for (const ch of (line.text || '')) { if (textWidth(cur + ch, size, '600') > maxw && cur) { uiText((isAsk ? '「' : '') + cur, tx, yy, { size, color: isAsk ? P.gray3 : '#f0f2ff', weight: isAsk ? '600' : '700' }); cur = ch; yy += 18 * S; } else cur += ch; }
    if (cur) uiText((isAsk ? '「' : '') + cur + (isAsk ? '」' : ''), tx, yy, { size, color: isAsk ? P.gray3 : '#f0f2ff', weight: isAsk ? '600' : '700' });
    // footer
    const last = d.page >= d.lines.length - 1;
    const hint = last ? (d.npc.station ? '▸ 進入「' + this.panelTitle(d.npc.station) + '」 (E)　·　Esc 離開' : '▸ 結束 (E)') : '▸ 繼續 (E / 空白 / 點擊)　·　Esc 離開';
    uiText(hint, x + w - 16 * S, y + h - 12 * S, { size: 11 * S, align: 'right', color: withAlpha('#fff', 0.6 + 0.3 * Math.sin(this.t * 5)), weight: '700' });
    uiText(`${d.page + 1}/${d.lines.length}`, x + w / 2, y + h - 12 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    if (d.page > 0) {   // 2.2: 上一頁 button (only when not on the first page)
      const pr = this.dialoguePrevRect(), hov = inside(mouse.x * view.dpr, mouse.y * view.dpr, pr);
      uiRect(pr.x, pr.y, pr.w, pr.h, withAlpha(hov ? '#27306a' : '#161b34', 0.9), { radius: 6 * S, stroke: withAlpha(P.shardL, hov ? 0.9 : 0.5), lw: 1.5 });
      uiText('◀ 上一頁', pr.x + pr.w / 2, pr.y + pr.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
    }
  },
};
