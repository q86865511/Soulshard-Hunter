// Hub / TOWN scene (round-5 overhaul). A multi-room town: walk between the church
// (talents), guild (quests + rank), blacksmith (forge + facilities), clothing store
// (skins), achievement hall and your personal room, each populated with NPCs you can
// talk to. Interact with a building (or its keeper NPC) to open its panel, then sortie.
import { World, makeCamp, TS } from '../world.js';
import { refs } from './refs.js';
import { setScene } from '../scene.js';
import { newRun, META, saveMeta, WEAPONS } from '../state.js';
import { Talents, Facilities, Characters, Weapons } from '../content/registry.js';
import { TALENT_BRANCHES } from '../content/talents.js';
import { ACHIEVEMENTS, achievementProgress } from '../content/achievements.js';
import { STORY_QUESTS, chapterState, claimChapter, guildQuests, trackQuest, claimQuest, trackedQuestState, fmtQuestVal, questUnlocked, questLockedBy, isQuestTracked, trackedCount, MAX_TRACKED } from '../content/quests.js';
import { drawAchievementToasts } from '../hud.js';
import { SKINS, skinnedSprite, skinSpriteName } from '../content/characters.js';
import { GUILD_RANKS, guildProgress, claimableRanks, claimGuildRank } from '../content/guild.js';
import { FORGE_EFFECTS, forgeEffect, FORGE_MAX_LEVEL, FORGE_MAX_EFFECTS, forgeLevelCost, forgeEffectCost, forgeLevelCostBase, forgeEffectCostBase, forgeOf, forgeableWeapons, buyForgeLevel, buyForgeEffect, forgeSummary } from '../content/forge.js';
import { BALANCE } from '../balance.js';   // round16/9.3 dynamic-pricing growth
import { ensureSkinOffers, rerollSkinShop, SKINSHOP_REROLL_COST, isOffered, skinShopCountdown } from '../content/skinshop.js';
import { NPCS, npcScript, markMet } from '../content/npcs.js';
import { BONDS } from '../content/bonds.js';
import { BIOMES } from '../../art/biomes.js';
import {
  camera, uiText, uiRect, uiScale, view, drawSprite, drawShadow, drawSpriteUI,
  worldToScreen, vignette, textWidth, glowWorld, uiBar, ctxRaw, goldStr,
} from '../../engine/renderer.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { moveAxis, pressed, mouse } from '../../engine/input.js';
import { dist, clamp } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';
import { Net } from '../../net/api.js';
import { openAuth, openLeaderboard, openAdmin, openFeedback, isModalOpen, netToast } from '../../net/ui.js';
import { openSocial } from '../../net/social.js';
import { Cheats } from '../cheats.js';
import { cheatUnlockAll } from '../content/unlocks.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
// NPC placement offsets within their room (tiles from room centre)
const NPC_POS = {
  priest: [-1, 3.5], guildmaster: [-3.5, 1], receptionist: [4, 3], blacksmith: [-3, 3.5],
  tailor: [-1.5, -1], curator: [0.5, 3.5], guide: [-4, 3], merchant: [0, 0.5], oldvet: [0, -1.5], child: [4, 4],
};
// task-6: a distinct colour per room so each region reads as its own space (not one flat hall)
const ROOM_THEME = {
  church: P.shardL, guild: P.goldL, blacksmith: P.emberL, clothing: P.purpleL,
  achievements: P.gold, personal: P.greenL, plaza: P.manaL, garden: P.toxic, market: P.bronze,
};

export const hubScene = {
  enter() {
    this.world = new World({});
    const camp = makeCamp();
    this.world.loadMap(camp);
    const R = this.rooms = camp.rooms;
    const plaza = R.plaza;
    this.hero = { x: plaza.cx, y: plaza.cy + 22, vx: 0, vy: 0, facing: 1, radius: 5, walkT: 0, moving: false };
    camera.x = camera.targetX = plaza.cx; camera.y = camera.targetY = plaza.cy;
    // interactive buildings (open a panel on E)
    this.stations = [
      { id: 'sortie', panel: 'sortie', sprite: 'portal', label: '出擊傳送門', color: P.manaL, x: plaza.cx, y: plaza.cy - 10 },
      { id: 'church', panel: 'talents', sprite: 'town_goddess', label: '女神像 · 天賦', color: P.shardL, x: R.church.cx, y: R.church.cy - 10 },
      { id: 'guild', panel: 'guild', sprite: 'town_board', label: '任務板 · 公會', color: P.goldL, x: R.guild.cx + 1.5 * TS, y: R.guild.cy - 11 },
      { id: 'smith', panel: 'smith', sprite: 'town_furnace', label: '鍛造爐 · 鐵匠鋪', color: P.emberL, x: R.blacksmith.cx + 1.5 * TS, y: R.blacksmith.cy - 9 },
      { id: 'wardrobe', panel: 'wardrobe', sprite: 'town_mannequin', label: '衣帽店', color: P.purpleL, x: R.clothing.cx + 1.5 * TS, y: R.clothing.cy - 9 },
      { id: 'achievements', panel: 'achievements', sprite: 'town_trophyshelf', label: '成就殿堂', color: P.gold, x: R.achievements.cx, y: R.achievements.cy - 9 },
      { id: 'personal', panel: 'personal', sprite: 'town_bed', label: '個人小屋', color: P.greenL, x: R.personal.cx + 3 * TS, y: R.personal.cy - 1 * TS },
    ];
    // NPCs (open a dialogue on E; keeper NPCs route to their panel)
    this.npcs = NPCS.map((n) => { const rm = R[n.room] || plaza, o = NPC_POS[n.id] || [0, 2]; return { def: n, x: rm.cx + o[0] * TS, y: rm.cy + o[1] * TS, facing: o[0] < 0 ? 1 : -1, t: (n.id.length % 6) }; });

    this.panel = null; this.tab = 0; this.near = null; this.t = 0;
    this.escMenu = false;
    this.dialogue = null;
    this.panelScroll = 0; this.panelMaxScroll = 0;
    this.flash = ''; this.flashT = 0;
    this.sortPage = 0; this.selBiome = null; this.selDiff = 1; this.selMode = 'normal';   // QA: init sortie mode (was undefined until first draw/click)
    this.forgeSel = null;
    this.heroSprite = skinnedSprite(META, META.selectedCharacter || 'hunter');
    ensureSkinOffers(META);
    Music.start('hub');
    if (!META.tutorialDone) setTimeout(() => this.triggerTutorial(), 1000);   // 6.1 first-visit town guide
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    for (const n of this.npcs) n.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.escMenu) { this.updateEscMenu(); return; }   // Esc menu owns input while open
    if (isModalOpen()) return;                            // a DOM net overlay (帳號/多人/排行榜) is up — freeze the town behind it
    if (this.dialogue) { this.updateDialogue(); return; }
    if (this.panel) { this.updatePanel(); return; }
    if (Cheats.enabled && mouse.justDown && this.hubCheatInput()) return;   // dev panel (Konami ↑↑↓↓←→←→BA) now works in the hub too
    if (pressed('escape')) { this.escMenu = true; Sfx.play('uiClick'); return; }   // Esc opens the town menu (帳號/多人/排行榜/設定/返回主畫面) — pick an option to open its page

    const ax = moveAxis(); const h = this.hero;
    h.moving = !!(ax.x || ax.y);
    const sp = 96;
    h.vx += (ax.x * sp - h.vx) * Math.min(1, 14 * dt);
    h.vy += (ax.y * sp - h.vy) * Math.min(1, 14 * dt);
    if (Math.abs(h.vx) > 2) h.facing = h.vx < 0 ? -1 : 1;
    this.world.moveActor(h, h.vx * dt, h.vy * dt);
    if (h.moving) h.walkT += dt;
    camera.targetX = h.x; camera.targetY = h.y - 6;
    this.world.particles.update(dt);

    // nearest interactable (station building OR npc)
    this.near = null; this.nearKind = null; let bd = 34;
    for (const s of this.stations) { const d = dist(h.x, h.y, s.x, s.y); if (d < bd) { bd = d; this.near = s; this.nearKind = 'station'; } }
    for (const n of this.npcs) { const d = dist(h.x, h.y, n.x, n.y); if (d < bd) { bd = d; this.near = n; this.nearKind = 'npc'; } }

    let act = null;
    if (this.near && (pressed('interact') || pressed('enter'))) act = this.near;
    if (mouse.justDown) {
      const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
      for (const s of this.stations) { const ss = worldToScreen(s.x, s.y - 10); if (dist(mx, my, ss.x, ss.y) < 46 * view.dpr) { act = s; this.nearKind = 'station'; } }
      for (const n of this.npcs) { const ss = worldToScreen(n.x, n.y - 10); if (dist(mx, my, ss.x, ss.y) < 40 * view.dpr) { act = n; this.nearKind = 'npc'; } }
    }
    // panel hotkeys
    if (pressed('slot1')) act = this.stations.find((s) => s.id === 'church');
    if (pressed('slot2')) act = this.stations.find((s) => s.id === 'smith');
    if (pressed('slot3')) act = this.stations.find((s) => s.id === 'achievements');
    if (pressed('slot4')) act = this.stations.find((s) => s.id === 'guild');
    if (pressed('space')) act = this.stations.find((s) => s.id === 'sortie');
    if (!act) return;
    if (act.def) this.openDialogue(act);          // an NPC
    else this.openPanel(act.panel);               // a building
  },

  // ---- town Esc menu (round-15): a small option menu first; each option opens its page ----
  escMenuItems() {
    const u = Net.currentUser() || {};
    const items = [
      { id: 'resume', label: '繼續遊戲', col: P.greenL },
      { id: 'account', label: Net.isLoggedIn() ? ('☁ ' + (u.username || '帳號')) : '☁ 登入 / 註冊', col: P.shardL },
      { id: 'multi', label: '👥 多人連線', col: P.shardL },
      { id: 'leaderboard', label: '🏆 排行榜', col: P.shardL },
    ];
    if (Net.isAdmin()) items.push({ id: 'admin', label: '🛠 管理主控台', col: P.manaL });
    items.push({ id: 'feedback', label: '⚑ 回報問題', col: P.goldL });
    items.push({ id: 'settings', label: '⚙ 設定', col: P.shardL });
    items.push({ id: 'title', label: '🏠 返回主畫面', col: P.goldL });
    return items;
  },
  escMenuLayout() {
    const S = uiScale(); const items = this.escMenuItems();
    const w = 300 * S, h = 46 * S, gap = 10 * S, x = view.W / 2 - w / 2;
    // 1.7: center the WHOLE group (title + buttons) — the「選 單」title floats ~44px above
    // the first button, so offset the buttons down by half the title block to centre the set.
    const titleH = 44 * S;
    const total = items.length * h + (items.length - 1) * gap;
    const y0 = view.H / 2 - (titleH + total) / 2 + titleH;
    items.forEach((it, i) => { it.r = { x, y: y0 + i * (h + gap), w, h }; });
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
    else if (id === 'admin') openAdmin();
    else if (id === 'feedback') openFeedback();
    else if (id === 'settings') { this.escMenu = false; settingsUI.show(); }
    else if (id === 'title') { this.escMenu = false; saveMeta(); setScene(refs.title, {}); }
  },
  drawEscMenu() {
    const S = uiScale(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.72));
    const items = this.escMenuLayout();
    uiText('選 單', view.W / 2, items[0].r.y - 30 * S, { size: 26 * S, align: 'center', color: '#fff', weight: '900' });
    for (const it of items) {
      const hov = inside(mx, my, it.r);
      uiRect(it.r.x, it.r.y, it.r.w, it.r.h, withAlpha(hov ? '#27306a' : '#161b34', 0.96), { radius: 9 * S, stroke: hov ? it.col : withAlpha(it.col, 0.4), lw: hov ? 3 : 2 });
      uiText(it.label, it.r.x + it.r.w / 2, it.r.y + it.r.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: hov ? '#fff' : '#cfe0ff', weight: '800' });
    }
  },

  openPanel(id) { this.panel = id; this.tab = 0; this.personalTab = 0; this.panelScroll = 0; this.panelMaxScroll = 0; if (id === 'wardrobe') ensureSkinOffers(META); if (id === 'smith' && !this.forgeSel) this.forgeSel = (forgeableWeapons(META)[0] || {}).id || null; Sfx.play('uiClick'); },
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
    uiText('持有 ' + goldStr(META.gold), c.x + c.w / 2, c.y + 112 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    const hy = inside(mx, my, c.yes); uiRect(c.yes.x, c.yes.y, c.yes.w, c.yes.h, withAlpha(hy ? '#2a6a3a' : '#1f5030', 0.98), { radius: 7 * S, stroke: P.greenL, lw: 2 }); uiText('確 定', c.yes.x + c.yes.w / 2, c.yes.y + c.yes.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800' });
    const hn = inside(mx, my, c.no); uiRect(c.no.x, c.no.y, c.no.w, c.no.h, withAlpha(hn ? '#3a2030' : '#2a2030', 0.98), { radius: 7 * S, stroke: P.redD, lw: 2 }); uiText('取 消', c.no.x + c.no.w / 2, c.no.y + c.no.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '800' });
  },
  // which upgrade category the current panel/tab can reset (each separate)
  resetTarget() {
    if (this.panel === 'talents') return { label: '重置天賦', fn: () => this.resetTalents() };
    if (this.panel === 'smith' && this.tab === 0) return { label: '重置鍛造', fn: () => this.resetForge() };
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
  // 6.1 新手教學：城鎮引導（蕾恩，5 頁，看過一次後不再；舊存檔升級也會觸發）
  triggerTutorial() {
    if (META.tutorialDone || this.dialogue || this.panel) return;
    const guide = NPCS.find((n) => n.id === 'guide') || { name: '蕾恩', title: '城鎮嚮導', color: P.greenL, sprite: 'npc_guide' };
    const lines = [
      { text: '你醒了……終於。我是蕾恩，城鎮的嚮導。' },
      { text: '這裡是魂晶之鎮，獵手們在戰場闖蕩後回來的避風港。' },
      { text: '傳送門就在廣場中央——走進去，選好英雄和生態，出發狩獵！' },
      { text: '回來後，把賺來的金幣花在各個房間，讓自己越來越強。' },
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
  panelTitle(id) { return { talents: '教堂 · 天賦', smith: '鐵匠鋪', guild: '獵人公會', wardrobe: '衣帽店', achievements: '成就殿堂', personal: '個人小屋', sortie: '出擊' }[id] || id; },
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
    if (pressed('escape') || pressed('build')) { this.panel = null; return; }
    const frame = this.panelFrame();
    if (this.handleScrollbar(mx, my, frame)) return;
    const rt = this.resetTarget();   // task 8: per-category reset button
    if (rt && mouse.justDown && inside(mx, my, this.resetBtnRect(frame))) { this.ask(rt.label + '？', '清除此分頁的升級並返還已花費金幣', rt.fn); return; }
    if (mouse.justDown) {
      if (inside(mx, my, frame.close)) { this.panel = null; return; }
      if (!inside(mx, my, frame)) { this.panel = null; return; }
    }
    // tab switching for smith / guild
    if ((this.panel === 'smith' || this.panel === 'guild' || this.panel === 'wardrobe') && mouse.justDown) {
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
    }
  },
  personalTabRects(f) {
    const S = f.S, w = 96 * S, h = 24 * S, gap = 8 * S, tw = w * 2 + gap;
    const x0 = f.x + f.w / 2 - tw / 2, y = f.y + 13 * S;
    return ['生涯戰績', '羈絆圖鑑'].map((name, i) => ({ name, i, x: x0 + i * (w + gap), y, w, h }));
  },
  tabRects(f) {
    const S = f.S; const tabs = this.panel === 'smith' ? ['鍛造', '營地設施'] : this.panel === 'wardrobe' ? ['我的造型', '造型商店'] : ['任務委託', '公會等級'];
    return tabs.map((name, i) => ({ name, i, x: f.x + 20 * S + i * 130 * S, y: f.y + 46 * S, w: 122 * S, h: 26 * S }));
  },
  drawTabs(f) {
    const S = f.S;
    for (const tb of this.tabRects(f)) {
      const on = this.tab === tb.i;
      uiRect(tb.x, tb.y, tb.w, tb.h, withAlpha(on ? '#243a5a' : '#161a30', 0.96), { radius: 6 * S, stroke: on ? P.shardL : P.ink2, lw: on ? 2 : 1 });
      uiText(tb.name, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray3, weight: '800' });
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
    if (def.requires) for (const r of def.requires) if (!(META.talents[r] > 0)) return 'locked';
    return META.gold >= this.hubCost(def.cost(cur), 'talentPurchases') ? 'ok' : 'poor';
  },
  buyTalent(def) {
    if (this.talentState(def) !== 'ok') return;
    const cur = META.talents[def.id] || 0;
    META.gold -= this.hubCost(def.cost(cur), 'talentPurchases'); META.talents[def.id] = cur + 1;
    META.hub.talentPurchases = (META.hub.talentPurchases || 0) + 1; saveMeta();
    this.feedback(def.name + ' Lv.' + (cur + 1));
  },
  facilityState(def) {
    const cur = META.facilities[def.id] || 0;
    if (cur >= def.maxLevel) return 'max';
    return META.gold >= this.hubCost(def.cost(cur), 'facilityPurchases') ? 'ok' : 'poor';
  },
  buyFacility(def) {
    if (this.facilityState(def) !== 'ok') return;
    const cur = META.facilities[def.id] || 0;
    META.gold -= this.hubCost(def.cost(cur), 'facilityPurchases'); META.facilities[def.id] = cur + 1;
    META.hub.facilityPurchases = (META.hub.facilityPurchases || 0) + 1;
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

  talentNodes() {
    const f = this.panelFrame(); const S = f.S;
    const cols = TALENT_BRANCHES.length; const colW = f.w / cols;
    const nodes = [];
    TALENT_BRANCHES.forEach((br, ci) => {
      const list = Talents.filter((t) => t.branch === br.id).sort((a, b) => (a.row || 0) - (b.row || 0));
      list.forEach((def, ri) => {
        const nodeW = Math.min(colW - 22 * S, 168 * S);
        const nodeH = 66 * S;
        const x = f.x + ci * colW + (colW - nodeW) / 2;
        const y = f.y + 92 * S + ri * (nodeH + 12 * S) - (this.panelScroll || 0);
        nodes.push({ def, x, y, w: nodeW, h: nodeH, color: br.color });
      });
    });
    return { f, nodes };
  },
  updateTalents(mx, my) {
    if (!mouse.justDown) return;
    const { nodes } = this.talentNodes();
    for (const n of nodes) if (inside(mx, my, n)) { const def = n.def, cur = META.talents[def.id] || 0; if (this.talentState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'talentPurchases')), () => this.buyTalent(def)); else { const st = this.talentState(def); this.feedback(st === 'locked' ? '需先解鎖前置天賦' : st === 'max' ? '已達滿級' : '金幣不足'); } return; }
  },

  facilityCards() {
    const f = this.panelFrame(); const S = f.S;
    const list = Facilities.all();
    const cols = 3; const cardW = (f.w - 40 * S - (cols - 1) * 16 * S) / cols; const cardH = 92 * S;
    const top = this.bodyTop(f) + 12 * S;
    const cards = list.map((def, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return { def, x: f.x + 20 * S + c * (cardW + 16 * S), y: top + r * (cardH + 14 * S) - (this.panelScroll || 0), w: cardW, h: cardH };
    });
    return { f, cards };
  },
  updateFacilities(mx, my) {
    if (!mouse.justDown) return;
    const { cards } = this.facilityCards();
    for (const c of cards) if (inside(mx, my, c)) { const def = c.def, cur = META.facilities[def.id] || 0; if (this.facilityState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'facilityPurchases')), () => this.buyFacility(def)); else { const st = this.facilityState(def); this.feedback(st === 'max' ? '已達滿級' : '金幣不足'); } return; }
  },

  // ---- forge (5-5) ---------------------------------------------------------
  forgeLayout() {
    const f = this.panelFrame(); const S = f.S;
    const list = forgeableWeapons(META);
    const listW = 200 * S, top = this.bodyTop(f) + 12 * S, rowH = 34 * S;
    const rows = list.map((w, i) => ({ w, x: f.x + 20 * S, y: top + i * (rowH + 4 * S) - (this.panelScroll || 0), wd: listW, h: rowH }));
    const detail = { x: f.x + 20 * S + listW + 18 * S, y: top, w: f.w - (40 * S + listW + 18 * S), h: f.h - 100 * S };
    return { f, rows, detail, list, rowH };
  },
  updateForge(mx, my) {
    const L = this.forgeLayout();
    if (!mouse.justDown) return;
    for (const r of L.rows) if (mx >= r.x && mx <= r.x + r.wd && my >= r.y && my <= r.y + r.h) { this.forgeSel = r.w.id; this.panelScroll = this.panelScroll || 0; Sfx.play('uiClick'); return; }   // r.wd, NOT inside()'s r.w (which is the weapon def)
    const sel = this.forgeSel; if (!sel) return;
    // level button + effect buttons in the detail pane
    const b = this.forgeButtons(L.detail);
    const wname = (Weapons.get(sel) || {}).name || sel;
    if (b.level && inside(mx, my, b.level)) { const cost = forgeLevelCost(forgeOf(META, sel).level); if (META.gold >= cost) this.ask('強化「' + wname + '」鍛造等級？', goldStr(cost), () => { if (buyForgeLevel(META, sel)) { saveMeta(); this.feedback('鍛造強化 +1'); } }); else this.feedback('金幣不足或已滿級'); return; }
    for (const eb of b.effects) if (inside(mx, my, eb)) { if (eb.owned || eb.full) { this.feedback(eb.owned ? '已鑲嵌' : '特效欄已滿'); return; } const cost = forgeEffectCost(forgeOf(META, sel).effects.length); if (META.gold >= cost) this.ask('在「' + wname + '」鑲嵌特效：' + eb.name + '？', goldStr(cost), () => { if (buyForgeEffect(META, sel, eb.id)) { saveMeta(); this.feedback('鑲嵌特效：' + eb.name); } }); else this.feedback('金幣不足'); return; }
  },
  forgeButtons(d) {
    const S = uiScale(); const sel = this.forgeSel; const f = sel ? forgeOf(META, sel) : { level: 0, effects: [] };
    const level = f.level < FORGE_MAX_LEVEL ? { x: d.x + 14 * S, y: d.y + 92 * S, w: d.w - 28 * S, h: 32 * S } : null;
    const effects = FORGE_EFFECTS.map((e, i) => ({ ...e, owned: f.effects.includes(e.id), full: f.effects.length >= FORGE_MAX_EFFECTS, x: d.x + 14 * S, y: d.y + 150 * S + i * 38 * S, w: d.w - 28 * S, h: 32 * S }));
    return { level, effects };
  },

  // ---- guild rank (5-3) ----------------------------------------------------
  guildRankRows() {
    const f = this.panelFrame(); const S = f.S;
    const top = this.bodyTop(f) + 60 * S, rowH = 34 * S;
    const rows = GUILD_RANKS.map((rk, i) => ({ rk, i, x: f.x + 20 * S, y: top + i * (rowH + 5 * S) - (this.panelScroll || 0), w: f.w - 40 * S, h: rowH, claim: { x: f.x + f.w - 132 * S, y: top + i * (rowH + 5 * S) + 4 * S - (this.panelScroll || 0), w: 92 * S, h: 26 * S } }));
    return { f, rows };
  },
  updateGuildRank(mx, my) {
    if (!mouse.justDown) return;
    const claimable = new Set(claimableRanks(META).map((c) => c.i));
    for (const r of this.guildRankRows().rows) if (claimable.has(r.i) && inside(mx, my, r.claim)) { const rk = claimGuildRank(META, r.i); if (rk) { saveMeta(); this.feedback('晉升「' + rk.name + '」'); } return; }
  },

  // ---- sortie --------------------------------------------------------------
  sortieLayout() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all();
    const perPage = 6, cols = 3;
    const pages = Math.max(1, Math.ceil(chars.length / perPage));
    if (this.sortPage >= pages) this.sortPage = pages - 1;
    if (this.sortPage < 0) this.sortPage = 0;
    const start = { x: f.x + f.w / 2 - 110 * S, y: f.y + f.h - 52 * S, w: 220 * S, h: 40 * S };
    const dY = start.y - 44 * S;
    const dPrev = { x: f.x + f.w / 2 - 96 * S, y: dY, w: 30 * S, h: 26 * S };
    const dNext = { x: f.x + f.w / 2 + 66 * S, y: dY, w: 30 * S, h: 26 * S };
    const modeBtn = { x: f.x + f.w / 2 + 104 * S, y: dY, w: Math.max(72 * S, f.x + f.w - 24 * S - (f.x + f.w / 2 + 104 * S)), h: 26 * S };   // 6.6 無盡 toggle (right of difficulty)
    const lvlY = dY - 44 * S;
    const levels = BIOMES.slice(0, Math.min(BIOMES.length, (META.levels && META.levels.unlocked) || 1));
    const lbW = Math.min(116 * S, (f.w - 48 * S) / Math.max(1, levels.length) - 8 * S);
    const lvlButtons = levels.map((b, i) => ({ b, x: f.x + 24 * S + i * (lbW + 8 * S), y: lvlY, w: lbW, h: 30 * S }));
    const pgY = lvlY - 34 * S;
    const prev = { x: f.x + f.w / 2 - 116 * S, y: pgY, w: 34 * S, h: 22 * S };
    const next = { x: f.x + f.w / 2 + 82 * S, y: pgY, w: 34 * S, h: 22 * S };
    const top = f.y + 58 * S;
    const cw = (f.w - 40 * S - (cols - 1) * 12 * S) / cols;
    const chh = Math.max(60 * S, Math.min(92 * S, (pgY - 8 * S - top) / 2 - 8 * S));
    const pageChars = chars.slice(this.sortPage * perPage, this.sortPage * perPage + perPage);
    const cards = pageChars.map((c, i) => ({ c, x: f.x + 20 * S + (i % cols) * (cw + 12 * S), y: top + Math.floor(i / cols) * (chh + 8 * S), w: cw, h: chh }));
    return { f, cards, prev, next, pages, pgY, levels, lvlButtons, lvlY, dPrev, dNext, dY, modeBtn, start };
  },
  curBiome(L) { return this.selBiome || (L.levels.length ? L.levels[L.levels.length - 1].id : BIOMES[0].id); },
  maxDiff(biomeId) { return ((META.levels && META.levels.diff && META.levels.diff[biomeId]) || 0) + 1; },
  selectChar(c) {
    if (META.unlocked.characters.includes(c.id)) { META.selectedCharacter = c.id; this.heroSprite = skinnedSprite(META, c.id); saveMeta(); Sfx.play('uiClick'); }
    else if (c.unlock.type === 'gold') {
      if (META.gold >= c.unlock.cost) { META.gold -= c.unlock.cost; META.unlocked.characters.push(c.id); META.selectedCharacter = c.id; this.heroSprite = skinnedSprite(META, c.id); saveMeta(); this.feedback('解鎖 ' + c.name); }
      else this.feedback('金幣不足');
    } else this.feedback(c.unlock.hint || '尚未解鎖');
  },
  updateSortie(mx, my) {
    const L = this.sortieLayout();
    if (mouse.wheel) this.sortPage = Math.max(0, Math.min(L.pages - 1, this.sortPage + (mouse.wheel > 0 ? 1 : -1)));
    if (!mouse.justDown) return;
    for (const card of L.cards) if (inside(mx, my, card)) { this.selectChar(card.c); return; }
    if (inside(mx, my, L.prev)) { this.sortPage = Math.max(0, this.sortPage - 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.next)) { this.sortPage = Math.min(L.pages - 1, this.sortPage + 1); Sfx.play('uiClick'); return; }
    for (const lb of L.lvlButtons) if (inside(mx, my, lb)) { this.selBiome = lb.b.id; this.selDiff = 1; Sfx.play('uiClick'); return; }
    const maxD = this.maxDiff(this.curBiome(L));
    const endlessUnlocked = ((META.stats && META.stats.clears) || 0) > 0;   // 6.6: 無盡挑戰 unlocks after a first clear
    if (endlessUnlocked && inside(mx, my, L.modeBtn)) { this.selMode = (this.selMode === 'endless') ? 'normal' : 'endless'; Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.dPrev)) { this.selDiff = Math.max(0, this.selDiff - 1); Sfx.play('uiClick'); return; }   // 6.5: 0 = 劇情難度
    if (inside(mx, my, L.dNext)) { this.selDiff = Math.min(maxD, this.selDiff + 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.start)) { const b = this.curBiome(L); const d = Math.min(this.maxDiff(b), Math.max(0, this.selDiff)); const mode = (endlessUnlocked && this.selMode === 'endless') ? 'endless' : 'normal'; Sfx.play('portal'); saveMeta(); setScene(refs.run, { run: newRun({ biomeId: b, difficulty: d, mode }) }); }
  },

  // ---- quests (guild tab 0) ------------------------------------------------
  questLayout() {
    const f = this.panelFrame(); const S = f.S; const t0 = this.bodyTop(f);
    const mainClaim = { x: f.x + 24 * S, y: t0 + 58 * S, w: 150 * S, h: 30 * S };
    const mainTrack = { x: f.x + 182 * S, y: t0 + 58 * S, w: 112 * S, h: 30 * S };
    const list = guildQuests(META).slice(0, 6);
    const rowH = 38 * S, top = t0 + 134 * S;
    const rows = list.map((q, i) => { const y = top + i * (rowH + 6 * S); return { q, y, h: rowH, track: { x: f.x + f.w - 196 * S, y: y + 6 * S, w: 84 * S, h: 26 * S }, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    return { f, mainClaim, mainTrack, rows, t0 };
  },
  updateQuests(mx, my) {
    if (!mouse.justDown) return;
    const L = this.questLayout();
    const cur = chapterState(META, META.questIndex || 0);
    if (cur && cur.done && inside(mx, my, L.mainClaim)) { const q = claimChapter(META); if (q) { saveMeta(); this.feedback('完成 ' + q.title); } return; }
    if (inside(mx, my, L.mainTrack)) { const res = trackQuest(META, 'story'); Sfx.play('uiClick'); if (res === 'full') { this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); } else { saveMeta(); this.feedback(res === 'added' ? '追蹤主線' : '取消追蹤主線'); } return; }
    for (const r of L.rows) {
      const lockedBy = questLockedBy(META, r.q);   // 5.5: locked rows hide their buttons; clicking the row hints the prerequisite
      if (lockedBy) { if (inside(mx, my, { x: L.f.x, y: r.y, w: L.f.w, h: r.h })) { this.feedback('🔒 需先完成：' + lockedBy); return; } continue; }
      if (inside(mx, my, r.track)) { const res = trackQuest(META, r.q.id); if (res === 'added' || res === 'removed') { saveMeta(); this.feedback((res === 'added' ? '追蹤：' : '取消追蹤：') + r.q.title); } else if (res === 'full') this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); Sfx.play('uiClick'); return; }
      if (inside(mx, my, r.claim)) { if (claimQuest(META, r.q.id)) { saveMeta(); this.feedback('領取：' + r.q.title); } else this.feedback('尚未達成'); return; }
    }
  },

  // ---- wardrobe / clothing store (5-6) -------------------------------------
  // tab 0 — 我的造型: every unlocked hero, its owned skins as clickable chips (task-10)
  wardrobeOwnedLayout() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all().filter((c) => (META.unlocked.characters || []).includes(c.id));
    const top = this.bodyTop(f) + 6 * S, rowH = 52 * S, chip = 38 * S, cgap = 6 * S, chipX0 = f.x + 150 * S;
    const rows = chars.map((c, i) => {
      const y = top + i * (rowH + 6 * S) - (this.panelScroll || 0);
      const ownedIds = SKINS.filter((sk) => (META.ownedSkins || []).includes(c.id + ':' + sk.id)).map((sk) => sk.id);
      const chips = [null, ...ownedIds].map((sid, j) => ({ sid, x: chipX0 + j * (chip + cgap), y: y + (rowH - chip) / 2, w: chip, h: chip }));
      return { c, y, h: rowH, chips };
    });
    return { f, rows, rowH };
  },
  updateWardrobeOwned(mx, my) {
    if (!mouse.justDown) return;
    const L = this.wardrobeOwnedLayout();
    for (const r of L.rows) for (const ch of r.chips) if (inside(mx, my, ch)) {
      if (ch.sid) META.skins[r.c.id] = ch.sid; else delete META.skins[r.c.id];
      if (r.c.id === (META.selectedCharacter || 'hunter')) this.heroSprite = skinnedSprite(META, r.c.id);
      saveMeta(); Sfx.play('uiClick'); this.feedback('套用造型：' + (ch.sid ? (SKINS.find((s) => s.id === ch.sid) || {}).name : '原色'));
      return;
    }
  },
  // tab 1 — 造型商店: the rotating shop (4 offers + 原色, 30-min refresh + paid reroll)
  wardrobeShopLayout() {
    const f = this.panelFrame(); const S = f.S;
    const offers = ensureSkinOffers(META);
    const seen = new Set();
    const entries = [{ id: null, name: '原色', price: 0, kind: 'base' }];
    for (const id of offers) { if (seen.has(id)) continue; seen.add(id); const sk = SKINS.find((s) => s.id === id); if (sk) entries.push({ id: sk.id, name: sk.name, price: sk.price, kind: 'offer', hidden: !!sk.hidden }); }
    const cols = 4, cw = Math.min(132 * S, (f.w - 48 * S) / cols - 10 * S), ch = 110 * S, gap = 14 * S;
    const top = this.bodyTop(f) + 48 * S;
    const cards = entries.map((o, i) => ({ o, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
    const reroll = { x: f.x + f.w - 172 * S, y: this.bodyTop(f) + 6 * S, w: 154 * S, h: 28 * S };
    return { f, cards, reroll };
  },
  updateWardrobe(mx, my) { if (this.tab === 0) this.updateWardrobeOwned(mx, my); else this.updateWardrobeShop(mx, my); },
  updateWardrobeShop(mx, my) {
    if (!mouse.justDown) return;
    const cid = META.selectedCharacter || 'hunter';
    const L = this.wardrobeShopLayout();
    if (inside(mx, my, L.reroll)) { if (META.gold >= SKINSHOP_REROLL_COST) this.ask('花費 ' + goldStr(SKINSHOP_REROLL_COST) + ' 重新進貨？', '立即刷新 4 個造型', () => { if (rerollSkinShop(META)) { saveMeta(); this.feedback('衣帽店已換新貨'); } }); else this.feedback('金幣不足'); return; }
    for (const c of L.cards) if (inside(mx, my, c)) { this.pickSkin(cid, c.o); return; }
  },
  pickSkin(cid, o) {
    const key = o.id ? cid + ':' + o.id : null;
    const owned = !o.id || (META.ownedSkins || []).includes(key);
    if (owned) { if (o.id) META.skins[cid] = o.id; else delete META.skins[cid]; this.heroSprite = skinnedSprite(META, cid); saveMeta(); Sfx.play('uiClick'); this.feedback('套用造型：' + o.name); return; }
    if (!isOffered(META, o.id)) { this.feedback('本期未上架（可重新進貨）'); return; }
    if (META.gold >= o.price) this.ask('購買造型「' + o.name + '」？', goldStr(o.price) + (o.hidden ? '　·　隱藏造型！' : ''), () => { if (META.gold >= o.price) { META.gold -= o.price; (META.ownedSkins = META.ownedSkins || []).push(key); META.skins[cid] = o.id; this.heroSprite = skinnedSprite(META, cid); saveMeta(); this.feedback('購買造型：' + o.name); } });
    else this.feedback('金幣不足');
  },

  // ---- render --------------------------------------------------------------
  render() {
    const S = uiScale();
    this.world.draw();
    // task-6: a gentle themed wash per room so each region reads as its own space.
    // Kept subtle (low-alpha rect + a broad soft glow) so the polished flagstone shows
    // through as ambient lighting rather than a flat colour slab over a grid.
    for (const id in this.rooms) {
      const rm = this.rooms[id]; const col = ROOM_THEME[id]; if (!col) continue;
      const a = worldToScreen(rm.x0 + TS, rm.y0 + TS), b = worldToScreen(rm.x1 - TS, rm.y1 - TS);
      uiRect(a.x, a.y, b.x - a.x, b.y - a.y, withAlpha(col, 0.05));
      glowWorld(rm.cx, rm.cy, 130, col, 0.05);
    }
    // stations + hero + npcs
    for (const s of this.stations) {
      const sp = getSprite(s.sprite);
      const bob = s.id === 'sortie' ? Math.sin(this.t * 2) : 0;
      glowWorld(s.x, s.y - 8, 16, s.color, 0.14 + (this.near === s ? 0.16 : 0));
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
    // labels
    for (const s of this.stations) {
      const sp = getSprite(s.sprite); const ss = worldToScreen(s.x, s.y - sp.h - 6);
      uiText(s.label, ss.x, ss.y, { size: 12 * S, align: 'center', color: s.color, weight: '800' });
      if (this.near === s) { const sp2 = worldToScreen(s.x, s.y + 8); uiText('【E】進入', sp2.x, sp2.y, { size: 12 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
    for (const n of this.npcs) {
      const sp = getSprite(n.def.sprite); const ss = worldToScreen(n.x, n.y - sp.h - 4);
      const isNew = !(META.npc && META.npc.met && META.npc.met[n.def.id]);
      uiText(n.def.name, ss.x, ss.y, { size: 11 * S, align: 'center', color: n.def.color, weight: '800' });
      if (isNew) this.drawNewBadge(ss.x, ss.y - 24 * S, S);   // 2.3: 「新」徽章 — 黃圈白驚嘆號於名字正上方（上移避免壓到名字）
      if (this.near === n) { const sp2 = worldToScreen(n.x, n.y + 8); uiText('【E】交談', sp2.x, sp2.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
    this.world.particles.drawText();
    vignette(0.45);

    // top bar
    uiText('魂 晶 之 鎮', view.W / 2, 28 * S, { size: 20 * S, align: 'center', color: '#fff', weight: '900' });
    const csp = getSprite('coin');
    drawSpriteUI(csp.frames[0], view.W - 110 * S, 12 * S, 2.2 * S);
    uiText(String(META.gold), view.W - 84 * S, 30 * S, { size: 18 * S, color: P.goldL, weight: '800' });
    uiText('1 教堂　2 鐵匠　3 成就　4 公會　空白 出擊　靠近 NPC 或建築按【E】互動　Esc 設定', view.W / 2, view.H - 16 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    if (this.flashT > 0) uiText(this.flash, view.W / 2, view.H * 0.78, { size: 18 * S, align: 'center', color: withAlpha(P.goldL, Math.min(1, this.flashT)), weight: '800' });
    if (!this.panel && !this.dialogue) this.drawQuestTracker();

    if (this.panel === 'talents') this.drawTalents();
    else if (this.panel === 'sortie') this.drawSortie();
    else if (this.panel === 'achievements') this.drawAchievements();
    else if (this.panel === 'wardrobe') this.drawWardrobe();
    else if (this.panel === 'smith') this.drawSmith();
    else if (this.panel === 'guild') this.drawGuild();
    else if (this.panel === 'personal') this.drawPersonal();

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
    uiText(title, f.x + 22 * S, f.y + 32 * S, { size: 20 * S, color: '#fff', weight: '900' });
    if (sub) uiText(sub, f.x + 22 * S + textWidth(title, 20 * S, '900') + 12 * S, f.y + 32 * S, { size: 12 * S, color: P.gray3, weight: '600' });
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
      const label = st === 'max' ? '已滿級' : st === 'locked' ? '需先解鎖前置' : goldStr(this.hubCost(def.cost(cur), 'talentPurchases'));
      const col = st === 'max' ? P.greenL : st === 'locked' ? P.gray3 : st === 'poor' ? P.redL : P.goldL;
      uiText(label, n.x + n.w - 8 * S, n.y + n.h - 9 * S, { size: 11 * S, align: 'right', color: col, weight: '800' });
    }
    ctx.restore();
    this.drawScrollbar(f);
    uiText('點擊節點升級　·　' + this.hubPriceHint('talentPurchases') + '　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  // ---- blacksmith: forge + facilities tabs ---------------------------------
  drawSmith() {
    const f = this.drawPanelFrame('鐵 匠 鋪', '鍛造武器 · 升級營地設施');
    this.drawTabs(f);
    if (this.tab === 0) this.drawForge(f); else this.drawFacilities(f);
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
      this.clip1(r.w.name, r.x + 32 * S, r.y + 14 * S, r.wd - 38 * S, 11.5 * S, '#fff', '700');
      if (sum) uiText(sum, r.x + r.wd - 6 * S, r.y + 25 * S, { size: 9 * S, align: 'right', color: P.emberL, weight: '700' });
    }
    ctx.restore();
    this.drawScrollbar(f);
    // detail pane
    const d = L.detail, sel = this.forgeSel;
    uiRect(d.x, d.y, d.w, d.h, withAlpha('#12152a', 0.9), { radius: 8 * S, stroke: P.ink2, lw: 1.5 });
    if (!sel) { uiText('選擇左側武器進行鍛造', d.x + d.w / 2, d.y + d.h / 2, { size: 12 * S, align: 'center', baseline: 'middle', color: P.gray3 }); return; }
    const wdef = Weapons.get(sel); const fdata = forgeOf(META, sel);
    const isp = getSprite(iconOr('weapon_' + sel, 'weapon_w_soulbolt'));
    drawSpriteUI(isp.frames[0], d.x + 14 * S, d.y + 12 * S, (34 * S) / isp.w);
    uiText(wdef ? wdef.name : sel, d.x + 56 * S, d.y + 24 * S, { size: 15 * S, color: '#fff', weight: '900' });
    uiText('鍛造等級 ' + fdata.level + '/' + FORGE_MAX_LEVEL + '（每級傷害 +8%）', d.x + 56 * S, d.y + 42 * S, { size: 11 * S, color: P.emberL, weight: '700' });
    for (let i = 0; i < FORGE_MAX_LEVEL; i++) uiRect(d.x + 56 * S + i * 12 * S, d.y + 50 * S, 9 * S, 6 * S, i < fdata.level ? P.ember : '#333a55', { radius: 1 });
    const b = this.forgeButtons(d);
    if (b.level) { const can = META.gold >= forgeLevelCost(fdata.level), hov = inside(mx, my, b.level); uiRect(b.level.x, b.level.y, b.level.w, b.level.h, withAlpha(can ? (hov ? '#3a5a2a' : '#26401c') : '#2a2030', 0.96), { radius: 6 * S, stroke: can ? P.greenL : P.gray1, lw: 2 }); uiText('強化等級　' + goldStr(forgeLevelCost(fdata.level)), b.level.x + b.level.w / 2, b.level.y + b.level.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: can ? '#fff' : P.gray3, weight: '800' }); }
    else uiText('★ 鍛造等級已滿', d.x + 14 * S, d.y + 110 * S, { size: 12 * S, color: P.greenL, weight: '800' });
    uiText('特效（最多 ' + FORGE_MAX_EFFECTS + ' 種，已鑲 ' + fdata.effects.length + '）', d.x + 14 * S, d.y + 144 * S, { size: 11 * S, color: P.shardL, weight: '800' });
    for (const eb of b.effects) {
      const hov = inside(mx, my, eb); const afford = META.gold >= forgeEffectCost(fdata.effects.length);
      const state = eb.owned ? 'owned' : eb.full ? 'full' : afford ? 'ok' : 'poor';
      const bg = state === 'owned' ? '#1c2c1c' : state === 'ok' ? (hov ? '#243a5a' : '#1b2138') : '#201a26';
      uiRect(eb.x, eb.y, eb.w, eb.h, withAlpha(bg, 0.96), { radius: 6 * S, stroke: state === 'owned' ? P.greenL : (hov && state === 'ok' ? eb.color : P.ink2), lw: 2 });
      uiText(eb.name, eb.x + 10 * S, eb.y + 13 * S, { size: 12 * S, color: eb.color, weight: '800' });
      this.clip1(eb.desc, eb.x + 52 * S, eb.y + 13 * S, eb.w - 130 * S, 9.5 * S, P.gray4);
      const lab = state === 'owned' ? '已鑲嵌' : state === 'full' ? '欄位已滿' : goldStr(forgeEffectCost(fdata.effects.length));
      uiText(lab, eb.x + eb.w - 10 * S, eb.y + eb.h - 10 * S, { size: 11 * S, align: 'right', color: state === 'owned' ? P.greenL : afford ? P.goldL : P.gray3, weight: '800' });
    }
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
      uiText('Lv.' + cur + '/' + def.maxLevel, c.x + c.w - 9 * S, c.y + 20 * S, { size: 11 * S, align: 'right', color: P.emberL, weight: '800' });
      this.wrap(def.desc, c.x + 10 * S, c.y + 42 * S, c.w - 20 * S, 10.5 * S);
      const label = st === 'max' ? '已滿級' : goldStr(this.hubCost(def.cost(cur), 'facilityPurchases'));
      const col = st === 'max' ? P.greenL : st === 'poor' ? P.redL : P.goldL;
      uiText(label, c.x + c.w - 10 * S, c.y + c.h - 10 * S, { size: 12 * S, align: 'right', color: col, weight: '800' });
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
      uiText(can ? ('領取　' + goldStr(cur.q.reward)) : '尚未達成', L.mainClaim.x + L.mainClaim.w / 2, L.mainClaim.y + L.mainClaim.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: can ? '#fff' : P.gray3, weight: '800' });
      const trk = isQuestTracked(META, 'story'), th = inside(mx, my, L.mainTrack);
      uiRect(L.mainTrack.x, L.mainTrack.y, L.mainTrack.w, L.mainTrack.h, withAlpha(trk || th ? '#243a5a' : '#1b2138', 0.96), { radius: 7 * S, stroke: trk ? P.shardL : P.ink2, lw: trk ? 3 : 2 });
      uiText(trk ? '✓ 追蹤中' : '＋ 追蹤主線', L.mainTrack.x + L.mainTrack.w / 2, L.mainTrack.y + L.mainTrack.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: trk ? P.shardL : '#fff', weight: '800' });
    } else uiText('主線已全數完成 — 你已成為魂晶之主。', f.x + 24 * S, t0 + 40 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    uiText('懸賞委託（可同時追蹤 · 已追蹤 ' + trackedCount(META) + '/' + MAX_TRACKED + '）', f.x + 24 * S, t0 + 118 * S, { size: 12 * S, color: P.shardL, weight: '800' });
    if (!L.rows.length) uiText('目前沒有可接的委託（達成條件可解鎖隱藏委託）', f.x + 24 * S, t0 + 140 * S, { size: 11 * S, color: P.gray3 });
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
        uiText(done ? ('領 ' + goldStr(q.reward)) : '進行中', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: done ? '#fff' : P.gray3, weight: '700' });
      }
    }
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
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, t0 + 56 * S, f.w, f.h - 96 * S); ctx.clip();
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

  // ---- achievement hall ----------------------------------------------------
  // 3.5-B: filter chips (全部 / 已達成 / 未達成) so the 200+ list is browsable.
  achFilterRects(f) {
    const S = f.S, y = f.y + 60 * S, w = 78 * S, h = 22 * S, gap = 8 * S, x0 = f.x + 24 * S;
    return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h, i }));
  },
  updateAchievements(mx, my) {
    if (!mouse.justDown) return;
    for (const r of this.achFilterRects(this.panelFrame())) if (inside(mx, my, r)) { if ((this.achFilter || 0) !== r.i) { this.achFilter = r.i; this.panelScroll = 0; } Sfx.play('uiClick'); return; }
  },
  drawAchievements() {
    const f = this.drawPanelFrame('成 就 殿 堂', '達成成就 · 解鎖更多內容');
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const got = META.achievements || [];
    // 3.5-B filter tabs
    const FILTERS = ['全部', '已達成', '未達成']; const fl = this.achFilter || 0;
    this.achFilterRects(f).forEach((r) => {
      const on = fl === r.i, hov = inside(mx, my, r);
      uiRect(r.x, r.y, r.w, r.h, withAlpha(on ? '#243a5a' : (hov ? '#1f2740' : '#1b2138'), 0.96), { radius: 6 * S, stroke: on ? P.shardL : P.ink2, lw: on ? 2 : 1 });
      uiText(FILTERS[r.i], r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: on ? P.shardL : P.gray3, weight: '800' });
    });
    const list = ACHIEVEMENTS.filter((a) => fl === 0 ? true : fl === 1 ? got.includes(a.id) : !got.includes(a.id));
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
      const name = (a.hidden && !done) ? '？？？' : (a.realName || a.name);
      let desc = (a.hidden && !done) ? '隱藏成就 — 達成後揭曉' : a.desc;
      if (!done && !a.hidden && a.prog) { const pg = a.prog(META.stats || {}, META); desc += `（${Math.min(pg[0], pg[1])}/${pg[1]}）`; }
      uiRect(x, y, cardW, cardH, withAlpha(done ? '#1d2c1d' : '#1b2138', 0.96), { radius: 7 * S, stroke: done ? P.goldL : P.ink2, lw: 2 });
      uiText(done ? '★' : '☆', x + 12 * S, y + 23 * S, { size: 17 * S, color: done ? P.goldL : P.gray2, weight: '900' });
      uiText(name, x + 34 * S, y + 20 * S, { size: 12.5 * S, color: done ? '#fff' : P.gray3, weight: '800' });
      this.clip1(desc, x + 34 * S, y + 38 * S, cardW - 42 * S, 10 * S, done ? P.gray4 : P.gray2);
      if (a.rewardLabel) this.clip1((done ? '✓ 已解鎖：' : '✦ 解鎖：') + a.rewardLabel, x + 34 * S, y + 53 * S, cardW - 42 * S, 9.5 * S, done ? P.greenL : P.shardL, '700');
    });
    ctx.restore();
    this.drawScrollbar(f);
    const prog = achievementProgress(META);
    uiText(`已解鎖 ${prog.unlocked} / ${prog.total}　·　▲▼ 滾輪捲動　·　Esc 關閉`, f.x + f.w / 2, f.y + f.h - 14 * S, { size: 12 * S, align: 'center', color: P.goldL, weight: '700' });
  },

  // ---- clothing store ------------------------------------------------------
  drawWardrobe() {
    const f = this.drawPanelFrame('衣 帽 店', this.tab === 0 ? '我的造型 · 各英雄已擁有' : '造型商店 · 每 30 分鐘換新貨 · 購買後不可退款');   // 3.9
    this.drawTabs(f);
    if (this.tab === 0) this.drawWardrobeOwned(f); else this.drawWardrobeShop(f);
  },
  drawWardrobeOwned(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.wardrobeOwnedLayout();
    let bottom = this.bodyTop(f);
    for (const r of L.rows) bottom = Math.max(bottom, r.y + r.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, this.bodyTop(f) - 2 * S, f.w, f.h - 96 * S); ctx.clip();
    for (const r of L.rows) {
      const c = r.c; const eq = META.skins[c.id] || null;
      uiRect(f.x + 16 * S, r.y, f.w - 32 * S, r.h, withAlpha('#1b2138', 0.6), { radius: 7 * S, stroke: P.ink2, lw: 1 });
      const psp = getSprite(skinnedSprite(META, c.id)), sc = 2.0 * S;
      drawSpriteUI(psp.frames[0], f.x + 26 * S, r.y + (r.h - psp.h * sc) / 2, sc);
      uiText(c.name, f.x + 60 * S, r.y + r.h / 2 - 4 * S, { size: 12 * S, color: '#fff', weight: '800' });
      const eqName = eq ? ((SKINS.find((s) => s.id === eq) || {}).name || '原色') : '原色';
      uiText('使用中 · ' + eqName, f.x + 60 * S, r.y + r.h / 2 + 11 * S, { size: 9.5 * S, color: P.shardL, weight: '700' });
      for (const ch of r.chips) {
        const equipped = (ch.sid || null) === eq; const hov = inside(mx, my, ch);
        uiRect(ch.x, ch.y, ch.w, ch.h, withAlpha(equipped ? '#243a5a' : '#12152a', 0.95), { radius: 5 * S, stroke: equipped ? P.shardL : (hov ? P.gray3 : P.ink2), lw: equipped ? 2 : 1 });
        const sp = getSprite(skinSpriteName(c.id, ch.sid)), ss = Math.min((ch.w - 6 * S) / sp.w, (ch.h - 6 * S) / sp.h);
        drawSpriteUI(sp.frames[0], ch.x + (ch.w - sp.w * ss) / 2, ch.y + (ch.h - sp.h * ss) / 2, ss);
      }
    }
    ctx.restore();
    this.drawScrollbar(f);
    uiText('點任一造型即為該英雄套用　·　滾輪捲動　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },
  drawWardrobeShop(f) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const cid = META.selectedCharacter || 'hunter'; const chDef = Characters.get(cid);
    const L = this.wardrobeShopLayout();
    uiText('套用於：' + (chDef ? chDef.name : cid), f.x + 24 * S, this.bodyTop(f) + 20 * S, { size: 12 * S, color: P.gray3, weight: '700' });
    const can = META.gold >= SKINSHOP_REROLL_COST, hov = inside(mx, my, L.reroll);
    uiRect(L.reroll.x, L.reroll.y, L.reroll.w, L.reroll.h, withAlpha(can ? (hov ? '#3a5a2a' : '#26401c') : '#2a2030', 0.96), { radius: 6 * S, stroke: can ? P.greenL : P.gray1, lw: 2 });
    uiText('↻ 重新進貨　' + goldStr(SKINSHOP_REROLL_COST), L.reroll.x + L.reroll.w / 2, L.reroll.y + L.reroll.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: can ? '#fff' : P.gray3, weight: '800' });
    const ms = skinShopCountdown(META), mm = Math.floor(ms / 60000), ssec = Math.floor((ms % 60000) / 1000);
    uiText('下次免費換新 ' + mm + ':' + String(ssec).padStart(2, '0'), L.reroll.x + L.reroll.w / 2, L.reroll.y + L.reroll.h + 12 * S, { size: 9.5 * S, align: 'center', color: P.gray3 });
    for (const c of L.cards) {
      const o = c.o, key = o.id ? cid + ':' + o.id : null;
      const owned = !o.id || (META.ownedSkins || []).includes(key);
      const equipped = (o.id || null) === (META.skins[cid] || null);
      const hover = inside(mx, my, c);
      const stroke = equipped ? P.shardL : (o.hidden && !owned) ? P.purpleL : !owned ? P.goldL : hover ? P.gray3 : P.ink2;
      uiRect(c.x, c.y, c.w, c.h, withAlpha(equipped ? '#243a5a' : (o.hidden && !owned) ? '#221833' : '#1b2138', 0.96), { radius: 7 * S, stroke, lw: equipped ? 3 : 2 });
      const sp = getSprite(skinSpriteName(cid, o.id)), sc = 2.8 * S;
      drawSpriteUI(sp.frames[0], c.x + c.w / 2 - sp.w * sc / 2, c.y + 8 * S, sc, { alpha: owned ? 1 : 0.5 });
      uiText(o.name, c.x + c.w / 2, c.y + c.h - 24 * S, { size: 12 * S, align: 'center', color: owned ? '#fff' : P.gray3, weight: '800' });
      const lab = equipped ? '● 使用中' : owned ? '套用' : ('🛒 ' + goldStr(o.price));
      const col = equipped ? P.shardL : owned ? P.gray3 : (META.gold >= o.price ? P.goldL : P.gray3);
      uiText(lab, c.x + c.w / 2, c.y + c.h - 8 * S, { size: 9.5 * S, align: 'center', color: col, weight: '700' });
      if (o.hidden && !owned) uiText('★隱藏', c.x + c.w - 6 * S, c.y + 12 * S, { size: 8 * S, align: 'right', color: P.purpleL, weight: '900' });
    }
  },

  // ---- personal room (5-7) -------------------------------------------------
  drawPersonal() {
    const f = this.drawPanelFrame('個 人 小 屋', '你的戰績與收藏'); const S = f.S;
    // 8.2-D: header tab toggle — 生涯戰績 / 羈絆圖鑑
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const tb of this.personalTabRects(f)) {
      const on = (this.personalTab || 0) === tb.i; const hov = inside(mx, my, tb);
      uiRect(tb.x, tb.y, tb.w, tb.h, withAlpha(on ? '#243a5a' : (hov ? '#1f2542' : '#12152a'), 0.96), { radius: 6 * S, stroke: on ? P.shardL : P.ink2, lw: on ? 2 : 1 });
      uiText(tb.name, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray3, weight: '800' });
    }
    if ((this.personalTab || 0) === 1) { this.drawBondCodex(f); return; }
    this.panelMaxScroll = 0;
    const s = META.stats || {}; const cid = META.selectedCharacter || 'hunter'; const ch = Characters.get(cid);
    // displayed hero
    const psp = getSprite(skinnedSprite(META, cid)), sc = 4 * S;
    uiRect(f.x + 20 * S, f.y + 64 * S, 150 * S, 150 * S, withAlpha('#12152a', 0.9), { radius: 8 * S, stroke: P.ink2, lw: 1.5 });
    drawSpriteUI(psp.frames[Math.floor(this.t * 4) % psp.frames.length], f.x + 20 * S + 75 * S - psp.w * sc / 2, f.y + 92 * S, sc);
    uiText(ch ? ch.name : cid, f.x + 95 * S, f.y + 200 * S, { size: 14 * S, align: 'center', color: '#fff', weight: '900' });
    const gp = guildProgress(META);
    uiText(gp.name, f.x + 95 * S, f.y + 216 * S, { size: 10 * S, align: 'center', color: P.gold, weight: '700' });
    // stat columns
    const sx = f.x + 200 * S, sw = f.w - 220 * S;
    const fmtT = (v) => Math.floor(v / 60) + ':' + String(Math.floor(v % 60)).padStart(2, '0');
    const stats = [
      ['出擊次數', s.runs || 0], ['累計擊殺', s.kills || 0], ['通關次數', s.clears || 0],
      ['擊敗首領', s.bossKills || 0], ['擊殺死神', s.reaperKills || 0], ['最佳分數', s.bestScore || 0],
      ['最長存活', fmtT(s.bestTime || 0)], ['最高威脅', s.bestStage || 0], ['最高角色等級', s.bestCharLevel || 0],
      ['無傷通關', s.noDmgClears || 0], ['鍛造強化', s.forgeUpgrades || 0], ['結識居民', s.npcTalks || 0],
    ];
    uiText('生涯戰績', sx, f.y + 76 * S, { size: 13 * S, color: P.shardL, weight: '800' });
    const cols = 2, cw = sw / cols;
    stats.forEach((st, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = sx + c * cw, y = f.y + 96 * S + r * 26 * S;
      uiText(st[0], x, y, { size: 11 * S, color: P.gray3, weight: '600' });
      uiText(String(st[1]), x + cw - 20 * S, y, { size: 12 * S, align: 'right', color: '#fff', weight: '800' });
    });
    // collection
    const col = [
      ['英雄', (META.unlocked.characters || []).length, Characters.all().length],
      ['武器', (META.unlocked.weapons || []).length],
      ['被動', (META.unlocked.abilities || []).length],
      ['裝備', (META.unlocked.equipment || []).length],
      ['造型', (META.ownedSkins || []).length, SKINS.length],
      ['成就', (META.achievements || []).length, ACHIEVEMENTS.length],
    ];
    uiText('收藏', sx, f.y + 96 * S + 6 * 26 * S + 8 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    col.forEach((cc, i) => {
      const c = i % 3, r = Math.floor(i / 3);
      const x = sx + c * (sw / 3), y = f.y + 96 * S + 6 * 26 * S + 30 * S + r * 24 * S;
      uiText(cc[0] + ' ' + cc[1] + (cc[2] ? '/' + cc[2] : ''), x, y, { size: 11 * S, color: P.gray4, weight: '700' });
    });
    uiText('在此休憩，凝視你一路走來的足跡。　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  // 8.2-D 羈絆圖鑑：列出全部羈絆＋每階需求與效果；曾達成過的(META.bondsSeen)標亮供事前規劃。
  drawBondCodex(f) {
    const S = f.S; const seen = new Set(META.bondsSeen || []);
    const left = f.x + 22 * S, right = f.x + f.w - 22 * S, colW = right - left;
    const topY = f.y + 60 * S;
    uiText('共 ' + BONDS.length + ' 種羈絆　·　湊齊特定武器／被動組合即可逐階啟動，效果持續整場探索', left, topY, { size: 11 * S, color: P.gray3, weight: '600' });
    const seenCount = BONDS.filter((b) => seen.has(b.id)).length;
    uiText('已解鎖 ' + seenCount + ' / ' + BONDS.length, right, topY, { size: 11 * S, align: 'right', color: P.goldL, weight: '800' });
    const viewTop = topY + 16 * S, viewBot = f.y + f.h - 16 * S, viewH = viewBot - viewTop;
    const rowH = (b) => 47 * S + b.tiers.length * 15 * S + 9 * S;
    let total = 0; for (const b of BONDS) total += rowH(b);
    this.panelMaxScroll = Math.max(0, total - viewH);
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x + 14 * S, viewTop - 2 * S, f.w - 28 * S, viewH + 4 * S); ctx.clip();
    let y = viewTop - (this.panelScroll || 0);
    for (const b of BONDS) {
      const isSeen = seen.has(b.id); const h = rowH(b);
      if (y + h >= viewTop - 4 * S && y <= viewBot + 4 * S) {
        uiRect(left - 6 * S, y, colW + 12 * S, h - 7 * S, withAlpha(isSeen ? '#1c2238' : '#141726', 0.92), { radius: 6 * S, stroke: isSeen ? withAlpha(P.goldL, 0.6) : P.ink2, lw: 1.5 });
        uiRect(left + 2 * S, y + 6 * S, 18 * S, 18 * S, withAlpha(isSeen ? P.gold : '#2a2f4a', 0.95), { radius: 5 * S });
        uiText(b.tag, left + 11 * S, y + 15 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: isSeen ? '#1a1404' : P.gray3, weight: '900' });
        uiText(b.name, left + 26 * S, y + 17 * S, { size: 13 * S, color: isSeen ? P.goldL : '#c8cfe8', weight: '900' });
        uiText(isSeen ? '✓ 已解鎖' : '未解鎖', right - 4 * S, y + 17 * S, { size: 10 * S, align: 'right', color: isSeen ? P.greenL : P.gray2, weight: '700' });
        uiText('需求：' + b.goal, left + 26 * S, y + 32 * S, { size: 10 * S, color: P.gray3, weight: '600' });
        b.tiers.forEach((t, k) => {
          const ty = y + 47 * S + k * 15 * S;
          uiText('第 ' + (k + 1) + ' 階（達成 ' + t.at + '）', left + 26 * S, ty, { size: 10 * S, color: isSeen ? '#dfe6ff' : P.gray3, weight: '700' });
          uiText(t.bonusDesc, left + 156 * S, ty, { size: 10 * S, color: isSeen ? P.emberL : P.gray2, weight: '700' });
        });
      }
      y += h;
    }
    ctx.restore();
  },

  // ---- sortie (出擊): pick hero / biome / difficulty, then launch ----------
  drawSortie() {
    const f = this.drawPanelFrame('出 擊 · 選 角 / 關 卡 / 難 度');
    const S = f.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.sortieLayout();
    // character cards (paged — 滾輪/箭頭翻頁)
    for (const card of L.cards) {
      const c = card.c;
      const unlocked = META.unlocked.characters.includes(c.id);
      const selected = META.selectedCharacter === c.id;
      const hover = inside(mx, my, card);
      uiRect(card.x, card.y, card.w, card.h, withAlpha(selected ? '#243a5a' : unlocked ? '#1b2138' : '#201622', 0.96), { radius: 7 * S, stroke: selected ? P.shardL : hover ? P.gray3 : P.ink2, lw: selected ? 3 : 2 });
      const sp = getSprite(selected ? (this.heroSprite || c.sprite) : c.sprite); const sc = 2.4 * S;
      drawSpriteUI(sp.frames[0], card.x + card.w / 2 - sp.w * sc / 2, card.y + 6 * S, sc, { alpha: unlocked ? 1 : 0.3 });
      uiText(c.name, card.x + card.w / 2, card.y + card.h - 22 * S, { size: 12 * S, align: 'center', color: unlocked ? '#fff' : P.gray3, weight: '800' });
      if (!unlocked) {
        const label = c.unlock.type === 'gold' ? goldStr(c.unlock.cost) : '成就解鎖';
        const afford = c.unlock.type === 'gold' && META.gold >= c.unlock.cost;
        uiText('🔒 ' + label, card.x + card.w / 2, card.y + card.h - 7 * S, { size: 9 * S, align: 'center', color: afford ? P.goldL : P.gray3, weight: '700' });
      } else if (selected) uiText('● 已選', card.x + card.w / 2, card.y + card.h - 7 * S, { size: 9 * S, align: 'center', color: P.shardL, weight: '800' });
    }
    // hovered (or selected) hero info — ability / description + starting weapon
    let infoC = Characters.get(META.selectedCharacter);
    for (const card of L.cards) if (inside(mx, my, card)) { infoC = card.c; break; }
    if (infoC) {
      const iy = L.pgY - 56 * S, wpn = Weapons.get(infoC.startWeapon);
      const ulocked = META.unlocked.characters.includes(infoC.id);
      uiText('▸ ' + infoC.name + (ulocked ? '' : '（未解鎖）'), f.x + 24 * S, iy, { size: 13 * S, color: P.shardL, weight: '800' });
      // 3.6: starting weapon on its OWN line below the name (was right-aligned on the same
      // baseline → long hero names + long weapon names overlapped).
      uiText('起始武器：' + (wpn ? wpn.name : infoC.startWeapon), f.x + 24 * S, iy + 15 * S, { size: 11 * S, color: P.goldL, weight: '700' });
      let line = '', yy = iy + 31 * S, lines = 0; const maxw = f.w - 48 * S, size = 11 * S;
      for (const ch of (infoC.desc || '')) { if (textWidth(line + ch, size, '500') > maxw && line) { uiText(line, f.x + 24 * S, yy, { size, color: P.gray4, weight: '500' }); line = ch; yy += 14 * S; if (++lines >= 2) { line = ''; break; } } else line += ch; }
      if (line) uiText(line, f.x + 24 * S, yy, { size, color: P.gray4, weight: '500' });
    }
    const arrow = (r, t, on) => { uiRect(r.x, r.y, r.w, r.h, withAlpha('#1b2138', 0.96), { radius: 5 * S, stroke: on ? P.gray3 : P.ink2, lw: 2 }); uiText(t, r.x + r.w / 2, r.y + r.h / 2 + 1 * S, { size: 14 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray2, weight: '900' }); };
    arrow(L.prev, '‹', this.sortPage > 0);
    arrow(L.next, '›', this.sortPage < L.pages - 1);
    uiText(`${this.sortPage + 1} / ${L.pages}`, f.x + f.w / 2, L.pgY + 16 * S, { size: 12 * S, align: 'center', color: P.gray3, weight: '700' });
    // level row
    const sel = this.curBiome(L);
    uiText('關卡', f.x + 24 * S, L.lvlY - 6 * S, { size: 11 * S, color: P.gray3, weight: '700' });
    for (const lb of L.lvlButtons) {
      const on = lb.b.id === sel; const cleared = (META.levels.diff && META.levels.diff[lb.b.id]) || 0;
      uiRect(lb.x, lb.y, lb.w, lb.h, withAlpha(on ? '#243a5a' : '#1b2138', 0.96), { radius: 6 * S, stroke: on ? P.shardL : P.ink2, lw: on ? 3 : 2 });
      uiText(lb.b.name, lb.x + lb.w / 2, lb.y + lb.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray4, weight: '700' });
      if (cleared > 0) uiText('✓' + cleared, lb.x + lb.w - 5 * S, lb.y + 10 * S, { size: 8 * S, align: 'right', color: P.greenL, weight: '800' });
    }
    // difficulty row
    const maxD = this.maxDiff(sel);
    this.selDiff = Math.min(maxD, Math.max(0, this.selDiff == null ? 1 : this.selDiff));   // 6.5: allow 0 (劇情)
    const isStory = this.selDiff <= 0;
    uiText('難度', f.x + 24 * S, L.dY + 17 * S, { size: 11 * S, color: P.gray3, weight: '700' });
    arrow(L.dPrev, '−', this.selDiff > 0);
    arrow(L.dNext, '+', this.selDiff < maxD);
    uiText(isStory ? '劇情' : ('難度 ' + this.selDiff + (this.selDiff >= maxD ? ' · 最高可玩' : '')), f.x + f.w / 2, L.dY + 17 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: isStory ? P.shardL : P.emberL, weight: '800' });
    // 6.6: 無盡挑戰 toggle chip (unlocked after a first clear), right of the difficulty row
    const endlessUnlocked = ((META.stats && META.stats.clears) || 0) > 0;
    if (endlessUnlocked) {
      const mb = L.modeBtn, on = this.selMode === 'endless', mh = inside(mx, my, mb);
      uiRect(mb.x, mb.y, mb.w, mb.h, withAlpha(on ? '#3a2d12' : (mh ? '#243a5a' : '#1b2138'), 0.96), { radius: 6 * S, stroke: on ? P.goldL : P.ink2, lw: on ? 2 : 1 });
      uiText(on ? '♾ 無盡挑戰' : '模式：普通', mb.x + mb.w / 2, mb.y + mb.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: on ? P.goldL : P.gray3, weight: '700' });
    } else { this.selMode = 'normal'; }
    // 6.4 / 6.5 / 6.6: one-line difficulty / mode explanation (new-player guidance)
    const DIFF_DESC = {
      0: '劇情 · 敵人極弱、掉落豐厚，幾乎必過（不列入排行榜）',
      1: '入門 · 敵人較少、節奏輕鬆，適合熟悉操作',
      2: '普通 · 敵潮變密，開始出現包圍與狀態威脅',
      3: '困難 · 高壓追殺，中後期考驗 build 與走位',
      4: '專家 · 敵更兇猛、遠程更多，容錯極低',
      5: '夢魘 · 極限挑戰，僅為最強的獵手準備',
    };
    const descTxt = (endlessUnlocked && this.selMode === 'endless') ? '無盡挑戰 · 無時限、首領每 180 秒一波、威脅持續攀升（不列入標準排行榜）' : (DIFF_DESC[this.selDiff] || '');
    uiText(descTxt, f.x + f.w / 2, L.dY + 33 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: P.gray3 });
    // start
    const hovS = inside(mx, my, L.start);
    uiRect(L.start.x, L.start.y, L.start.w, L.start.h, withAlpha(hovS ? '#2a6a3a' : '#1f5030', 0.98), { radius: 9 * S, stroke: P.greenL, lw: hovS ? 3 : 2 });
    uiText('出 擊 狩 獵', L.start.x + L.start.w / 2, L.start.y + L.start.h / 2 + 1 * S, { size: 18 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900' });
  },

  // ---- text helpers --------------------------------------------------------
  clip1(str, x, y, maxw, size, color, weight) {
    let s = str;
    while (s.length > 1 && textWidth(s, size, weight || '600') > maxw) s = s.slice(0, -1);
    if (s.length < str.length && s.length > 1) s = s.slice(0, -1) + '…';
    uiText(s, x, y, { size, color: color || P.gray4, weight: weight || '600' });
  },
  wrap(str, x, y, maxw, size) {
    let line = '', yy = y;
    for (const ch of str) {
      if (textWidth(line + ch, size, '600') > maxw && line) { uiText(line, x, yy, { size, color: P.gray4 }); line = ch; yy += size + 2; }
      else line += ch;
    }
    if (line) uiText(line, x, yy, { size, color: P.gray4 });
  },
};

refs.hub = hubScene;
