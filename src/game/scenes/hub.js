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
import { STORY_QUESTS, chapterState, claimChapter, guildQuests, trackQuest, claimQuest, trackedQuestState, fmtQuestVal, questUnlocked, questLockedBy, isQuestTracked, trackedCount, MAX_TRACKED, weeklyQuests, weeklyState, claimWeekly, ensureWeekly } from '../content/quests.js';
import { dailyChallenge, mutatorById, dateKey } from '../content/daily.js';   // R18/B9 每日挑戰
import { drawAchievementToasts } from '../hud.js';
import { SKINS, skinnedSprite, skinSpriteName, ownsSkin } from '../content/characters.js';
import { GUILD_RANKS, guildProgress, claimableRanks, claimGuildRank } from '../content/guild.js';
import { FORGE_EFFECTS, forgeEffect, FORGE_MAX_LEVEL, FORGE_MAX_EFFECTS, forgeLevelCost, forgeEffectCost, forgeLevelCostBase, forgeEffectCostBase, forgeOf, forgeableWeapons, buyForgeLevel, buyForgeEffect, forgeSummary } from '../content/forge.js';
import { BALANCE } from '../balance.js';   // round16/9.3 dynamic-pricing growth
import { bankLimit, bankState, bankBorrow, BANK_INTEREST, BANK_MIN } from '../content/bank.js';   // round16/7.2 魂晶銀行
import { ensureSkinOffers, skinPrice, skinTier, ensureSale, rerollSkinShop, skinShopCountdown, skinPoolDry, SKINSHOP_REROLL_COST } from '../content/skinshop.js';   // R16/3.8 → R17/3.2 8-slot pair shop
import { NPCS, npcScript, markMet } from '../content/npcs.js';
import { BONDS } from '../content/bonds.js';
import { BIOMES } from '../../art/biomes.js';
import {
  camera, uiText, uiRect, uiScale, view, drawSprite, drawShadow, drawSpriteUI,
  worldToScreen, vignette, textWidth, glowWorld, uiBar, ctxRaw, goldStr, UI, uiClipRound,
} from '../../engine/renderer.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { moveAxis, pressed, mouse } from '../../engine/input.js';
import { dist, clamp } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';
import { goldLabel } from '../ui/gold.js';   // R17/2.1: coin sprite + amount (the 🪙 emoji renders as □)
import { Net } from '../../net/api.js';
import { openAuth, openLeaderboard, openAdmin, openFeedback, isModalOpen, netToast } from '../../net/ui.js';
import { openSocial } from '../../net/social.js';
import { Cheats } from '../cheats.js';
import { cheatUnlockAll } from '../content/unlocks.js';
import { gate, facilityGate, gateProgress } from '../content/town_gates.js';   // R17/9.1 mixed progression gates

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
    this.sortPage = 0; this.selBiome = null; this.selDiff = 1;   // R17/4.2: selMode gone — endless is the stepper's final step
    this.forgeSel = null;
    this.heroSprite = skinnedSprite(META, META.selectedCharacter || 'hunter');
    ensureSkinOffers(META);
    ensureWeekly(META);   // R18/B9: re-snapshot weekly bounty base on ISO-week rollover
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
    this.ambientFx(dt);   // R18/B2: drifting petals over the field + fireflies by the garden
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

  // R18/B2: light ambient particles for the open-air town — blossom petals drifting across
  // the visible field + a few fireflies hovering over the garden. Spawned near the camera so
  // they're always on-screen; capped by the particle system's own ring buffer.
  ambientFx(dt) {
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT > 0) return;
    this.ambT = 0.18;
    const pr = this.world.particles, vw = view.W / camera.zoom, vh = view.H / camera.zoom;
    // a blossom petal entering from the top of the view, drifting down + sideways
    const px = camera.x + (Math.random() - 0.5) * vw, py = camera.y - vh / 2 - 8;
    pr.spawn({ x: px, y: py, vx: 8 + Math.random() * 10, vy: 14 + Math.random() * 10, life: 4.5, size: 2, color: Math.random() < 0.5 ? P.sakura : P.sakuraL, grav: 4, drag: 0.995, glow: false, fade: true });
    // occasional firefly twinkle near the garden well
    if (Math.random() < 0.5 && this.rooms.garden) {
      const g = this.rooms.garden;
      pr.spawn({ x: g.cx + (Math.random() - 0.5) * 90, y: g.cy + (Math.random() - 0.5) * 70, vx: (Math.random() - 0.5) * 12, vy: -6 - Math.random() * 8, life: 1.6, size: 1.5, color: P.holyL, glow: true });
    }
  },

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
    const S = f.S, w = 96 * S, h = 24 * S, gap = 8 * S, tw = w * 2 + gap;
    const x0 = f.x + f.w / 2 - tw / 2, y = f.y + 13 * S;
    return ['生涯戰績', '羈絆圖鑑'].map((name, i) => ({ name, i, x: x0 + i * (w + gap), y, w, h }));
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
    for (const n of nodes) if (inside(mx, my, n)) { const def = n.def, cur = META.talents[def.id] || 0; if (this.talentState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'talentPurchases')), () => this.buyTalent(def)); else { const st = this.talentState(def); this.feedback(st === 'gated' ? ('🔒 ' + gate(META, 'talentRow2')) : st === 'locked' ? '需先解鎖前置天賦' : st === 'max' ? '已達滿級' : '金幣不足'); } return; }
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
    for (const c of cards) if (inside(mx, my, c)) { const def = c.def, cur = META.facilities[def.id] || 0; if (this.facilityState(def) === 'ok') this.ask('升級「' + def.name + '」 Lv.' + (cur + 1) + '？', goldStr(this.hubCost(def.cost(cur), 'facilityPurchases')), () => this.buyFacility(def)); else { const st = this.facilityState(def); this.feedback(st === 'gated' ? ('🔒 ' + facilityGate(META, def.id, cur + 1)) : st === 'max' ? '已達滿級' : '金幣不足'); } return; }
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
    if (gate(META, 'forge')) return;   // R17/9.1: gated until the first biome clear
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
    // R17 UI-sweep: compress the effect-row pitch when the (viewport-capped) detail pane can't
    // fit all rows at 38S — at uiScale 1.5 the last rows used to paint past the panel bottom.
    const pitch = Math.max(26 * S, Math.min(38 * S, (d.h - 150 * S - 8 * S) / Math.max(1, FORGE_EFFECTS.length)));
    const rowH = Math.min(32 * S, pitch - 4 * S);
    const effects = FORGE_EFFECTS.map((e, i) => ({ ...e, owned: f.effects.includes(e.id), full: f.effects.length >= FORGE_MAX_EFFECTS, x: d.x + 14 * S, y: d.y + 150 * S + i * pitch, w: d.w - 28 * S, h: rowH }));
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
    // R17/4.1: 9 heroes per page (3×3); the bottom hero-info block is gone — each card now
    // carries its own info (left: sprite+name, right: starting weapon + effect lines).
    const perPage = 9, cols = 3;
    const pages = Math.max(1, Math.ceil(chars.length / perPage));
    if (this.sortPage >= pages) this.sortPage = pages - 1;
    if (this.sortPage < 0) this.sortPage = 0;
    const start = { x: f.x + f.w / 2 - 110 * S, y: f.y + f.h - 52 * S, w: 220 * S, h: 40 * S };
    const dY = start.y - 44 * S;
    const dPrev = { x: f.x + f.w / 2 - 96 * S, y: dY, w: 30 * S, h: 26 * S };
    const dNext = { x: f.x + f.w / 2 + 66 * S, y: dY, w: 30 * S, h: 26 * S };
    const lvlY = dY - 44 * S;
    const levels = BIOMES.slice(0, Math.min(BIOMES.length, (META.levels && META.levels.unlocked) || 1));
    const lbW = Math.min(116 * S, (f.w - 48 * S) / Math.max(1, levels.length) - 8 * S);
    const lvlButtons = levels.map((b, i) => ({ b, x: f.x + 24 * S + i * (lbW + 8 * S), y: lvlY, w: lbW, h: 30 * S }));
    const pgY = lvlY - 34 * S;
    const prev = { x: f.x + f.w / 2 - 116 * S, y: pgY, w: 34 * S, h: 22 * S };
    const next = { x: f.x + f.w / 2 + 82 * S, y: pgY, w: 34 * S, h: 22 * S };
    const dailyBar = { x: f.x + 20 * S, y: f.y + 52 * S, w: f.w - 40 * S, h: 28 * S };   // R18/B9 每日挑戰 entry
    const top = f.y + 88 * S;
    const cw = (f.w - 40 * S - (cols - 1) * 12 * S) / cols;
    // R17 B15: NO hard floor — at high uiScale a 56S floor pushed the grid over the page/level
    // rows. Tight space instead switches the cards into a compact mode (drawSortie reads card.h).
    const chh = Math.max(34 * S, Math.min(86 * S, (pgY - 8 * S - top) / 3 - 8 * S));
    const pageChars = chars.slice(this.sortPage * perPage, this.sortPage * perPage + perPage);
    const cards = pageChars.map((c, i) => ({ c, x: f.x + 20 * S + (i % cols) * (cw + 12 * S), y: top + Math.floor(i / cols) * (chh + 8 * S), w: cw, h: chh }));
    return { f, cards, prev, next, pages, pgY, levels, lvlButtons, lvlY, dPrev, dNext, dY, start, dailyBar };
  },
  // R18/B9: launch today's daily challenge — a closed showcase run (borrowed biome+hero,
  // fixed difficulty 3, deterministic mutators). No unlocks are written (clearLevel/hub guard).
  launchDaily() {
    const dc = dailyChallenge();
    Sfx.play('portal'); saveMeta();
    setScene(refs.run, { run: newRun({ biomeId: dc.biomeId, characterId: dc.characterId, difficulty: 3, mode: 'daily', challengeKey: dc.key, dailyMutators: dc.mutators }) });
  },
  curBiome(L) { return this.selBiome || (L.levels.length ? L.levels[L.levels.length - 1].id : BIOMES[0].id); },
  maxDiff(biomeId) { return ((META.levels && META.levels.diff && META.levels.diff[biomeId]) || 0) + 1; },
  // R17/4.2: 無盡 unlocks PER BIOME — clearing it once (any difficulty incl. 劇情 writes ≥1)
  biomeCleared(biomeId) { return ((META.levels && META.levels.diff && META.levels.diff[biomeId]) || 0) >= 1; },
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
    if (inside(mx, my, L.dailyBar)) { this.launchDaily(); return; }   // R18/B9 每日挑戰
    for (const card of L.cards) if (inside(mx, my, card)) { this.selectChar(card.c); return; }
    if (inside(mx, my, L.prev)) { this.sortPage = Math.max(0, this.sortPage - 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.next)) { this.sortPage = Math.min(L.pages - 1, this.sortPage + 1); Sfx.play('uiClick'); return; }
    for (const lb of L.lvlButtons) if (inside(mx, my, lb)) { this.selBiome = lb.b.id; this.selDiff = 1; Sfx.play('uiClick'); return; }
    // R17/4.2: the difficulty stepper IS the mode picker now — 劇情(0) → 1..maxD → 無盡(maxD+1,
    // only on a biome that's been cleared once). The separate 模式 toggle button is gone.
    const b0 = this.curBiome(L);
    const maxD = this.maxDiff(b0);
    const topD = maxD + (this.biomeCleared(b0) ? 1 : 0);
    if (inside(mx, my, L.dPrev)) { this.selDiff = Math.max(0, this.selDiff - 1); Sfx.play('uiClick'); return; }   // 6.5: 0 = 劇情難度
    if (inside(mx, my, L.dNext)) { this.selDiff = Math.min(topD, this.selDiff + 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.start)) {
      const b = this.curBiome(L); const mD = this.maxDiff(b);
      const isEndless = this.biomeCleared(b) && this.selDiff > mD;
      const d = isEndless ? mD : Math.min(mD, Math.max(0, this.selDiff));   // endless runs at the biome's highest unlocked difficulty
      Sfx.play('portal'); saveMeta();
      setScene(refs.run, { run: newRun({ biomeId: b, difficulty: d, mode: isEndless ? 'endless' : 'normal' }) });
    }
  },

  // ---- quests (guild tab 0) ------------------------------------------------
  questLayout() {
    const f = this.panelFrame(); const S = f.S; const t0 = this.bodyTop(f);
    const mainClaim = { x: f.x + 24 * S, y: t0 + 58 * S, w: 150 * S, h: 30 * S };
    const mainTrack = { x: f.x + 182 * S, y: t0 + 58 * S, w: 112 * S, h: 30 * S };
    const list = guildQuests(META).slice(0, 6);
    const rowH = 38 * S, gap = 6 * S, scroll = this.panelScroll || 0;
    // R18/B9: weekly bounties ride at the top of the same scroll region (header + 3 rows),
    // then a「一般懸賞」sub-header and the regular tracked bounties below.
    const weeklies = weeklyQuests(META);
    const wTop = t0 + 134 * S + 22 * S;   // +22 leaves room for the「本週懸賞」label
    const weeklyRows = weeklies.map((q, i) => { const y = wTop + i * (rowH + gap) - scroll; return { q, y, h: rowH, weekly: true, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    const top = wTop + weeklies.length * (rowH + gap) + 30 * S;   // +30 for the「一般懸賞」label
    // R17 UI-sweep: rows scroll (at uiScale 1.5 rows 4-6 painted 145px past the panel bottom)
    const rows = list.map((q, i) => { const y = top + i * (rowH + gap) - scroll; return { q, y, h: rowH, track: { x: f.x + f.w - 196 * S, y: y + 6 * S, w: 84 * S, h: 26 * S }, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    return { f, mainClaim, mainTrack, rows, weeklyRows, wTop, t0, top, clipTop: t0 + 134 * S - 4 * S };
  },
  updateQuests(mx, my) {
    if (!mouse.justDown) return;
    const L = this.questLayout();
    const cur = chapterState(META, META.questIndex || 0);
    if (cur && cur.done && inside(mx, my, L.mainClaim)) { const q = claimChapter(META); if (q) { saveMeta(); this.feedback('完成 ' + q.title); } return; }
    if (inside(mx, my, L.mainTrack)) { const res = trackQuest(META, 'story'); Sfx.play('uiClick'); if (res === 'full') { this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); } else { saveMeta(); this.feedback(res === 'added' ? '追蹤主線' : '取消追蹤主線'); } return; }
    for (const r of L.weeklyRows) {   // R18/B9 weekly claim
      if (r.y + r.h < L.clipTop || r.y > L.f.y + L.f.h - 24 * L.f.S) continue;
      if (inside(mx, my, r.claim)) { if (claimWeekly(META, r.q.id)) { saveMeta(); this.feedback('領取週常：' + r.q.title); } else this.feedback('尚未達成或已領取'); return; }
    }
    for (const r of L.rows) {
      if (r.y + r.h < L.clipTop || r.y > L.f.y + L.f.h - 24 * L.f.S) continue;   // R17 UI-sweep: scrolled-out rows aren't clickable
      const lockedBy = questLockedBy(META, r.q);   // 5.5: locked rows hide their buttons; clicking the row hints the prerequisite
      if (lockedBy) { if (inside(mx, my, { x: L.f.x, y: r.y, w: L.f.w, h: r.h })) { this.feedback('🔒 需先完成：' + lockedBy); return; } continue; }
      if (inside(mx, my, r.track)) { const res = trackQuest(META, r.q.id); if (res === 'added' || res === 'removed') { saveMeta(); this.feedback((res === 'added' ? '追蹤：' : '取消追蹤：') + r.q.title); } else if (res === 'full') this.feedback('最多同時追蹤 ' + MAX_TRACKED + ' 個任務'); Sfx.play('uiClick'); return; }
      if (inside(mx, my, r.claim)) { if (claimQuest(META, r.q.id)) { saveMeta(); this.feedback('領取：' + r.q.title); } else this.feedback('尚未達成'); return; }
    }
  },

  // ---- wardrobe / clothing store (5-6 + R16/3.8 two-layer) -----------------
  // Layer 1: a grid of unlocked heroes (this.wardrobeChar == null). Layer 2: that hero's
  // skins, with two tabs — 我的造型 (owned → equip) / 造型商店 (ALL skins → buy, tier-priced).
  wardrobeCharCards() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all().filter((c) => (META.unlocked.characters || []).includes(c.id));
    const cols = 4, gap = 14 * S, cw = (f.w - 48 * S - (cols - 1) * gap) / cols, ch = 104 * S;
    const top = f.y + 64 * S;
    const cards = chars.map((c, i) => ({ c, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap) - (this.panelScroll || 0), w: cw, h: ch }));
    return { f, cards, top };
  },
  // R17/3.1: wardrobe entry — two big doors:「我的造型」(equip flow) /「造型商店」(8-slot rack)
  wardrobeEntryRects(f) {
    const S = f.S, w = Math.min(300 * S, (f.w - 72 * S) / 2), h = Math.min(170 * S, f.h * 0.42);
    const y = f.y + f.h / 2 - h / 2 - 8 * S, gap = 24 * S;
    const x0 = f.x + f.w / 2 - w - gap / 2;
    return { mine: { x: x0, y, w, h }, shop: { x: x0 + w + gap, y, w, h } };
  },
  updateWardrobeEntry(mx, my) {
    if (!mouse.justDown) return;
    const r = this.wardrobeEntryRects(this.panelFrame());
    if (inside(mx, my, r.mine)) { this.wardrobeView = 'mine'; this.wardrobeChar = null; this.panelScroll = 0; Sfx.play('uiClick'); }
    else if (inside(mx, my, r.shop)) { this.wardrobeView = 'shop'; this.panelScroll = 0; ensureSkinOffers(META); saveMeta(); Sfx.play('uiClick'); }
  },
  wardrobeBackRect(f) { const S = f.S; return { x: f.x + f.w - 96 * S, y: f.y + 48 * S, w: 78 * S, h: 26 * S }; },   // R17 B15: +2S — sat exactly on the header divider
  updateWardrobeChars(mx, my) {
    if (!mouse.justDown) return;
    if (inside(mx, my, this.wardrobeBackRect(this.panelFrame()))) { this.wardrobeView = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    for (const c of this.wardrobeCharCards().cards) if (inside(mx, my, c)) { this.wardrobeChar = c.c.id; this.panelScroll = 0; Sfx.play('uiClick'); return; }
  },
  wardrobeSkinLayout() {
    const f = this.panelFrame(); const S = f.S; const cid = this.wardrobeChar;
    // R17/3.1:「我的造型」lists OWNED skins only — buying moved entirely to the shop view
    const list = [{ id: null, base: true }, ...SKINS.filter((sk) => ownsSkin(META, cid, sk.id))];
    const rowH = 44 * S, top = this.bodyTop(f) + 6 * S;
    const rows = list.map((sk, i) => { const y = top + i * (rowH + 6 * S) - (this.panelScroll || 0); return { sk, y, h: rowH, btn: { x: f.x + f.w - 134 * S, y: y + 8 * S, w: 110 * S, h: 28 * S } }; });
    const back = this.wardrobeBackRect(f);
    return { f, cid, rows, top, back };
  },
  updateWardrobe(mx, my) {
    if (!this.wardrobeView) { this.updateWardrobeEntry(mx, my); return; }
    if (this.wardrobeView === 'shop') { this.updateSkinShop(mx, my); return; }
    if (this.wardrobeChar == null) { this.updateWardrobeChars(mx, my); return; }
    const L = this.wardrobeSkinLayout();
    const S = L.f.S;
    if (mouse.justDown && inside(mx, my, L.back)) { this.wardrobeChar = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    if (!mouse.justDown) return;
    for (const r of L.rows) if (inside(mx, my, r.btn) || inside(mx, my, { x: L.f.x + 16 * S, y: r.y, w: L.f.w - 32 * S, h: r.h })) { this.pickSkin(L.cid, r.sk); return; }
  },
  // R17/3.1: equip-only — every listed row is owned (the buy path lives in the shop view)
  pickSkin(cid, sk) {
    const id = sk.id || null;
    if (id && !ownsSkin(META, cid, id)) { this.feedback('尚未擁有此造型'); return; }
    if (id) META.skins[cid] = id; else delete META.skins[cid];
    if (cid === (META.selectedCharacter || 'hunter')) this.heroSprite = skinnedSprite(META, cid);
    saveMeta(); Sfx.play('uiClick'); this.feedback('套用造型：' + (id ? sk.name : '原色'));
  },
  // ---- R17/3.2 造型商店: 8-slot (char, skin) rack ---------------------------
  skinShopLayout(f) {
    const S = f.S, cols = 4, gap = 14 * S;
    const top = this.bodyTop(f) + 4 * S;
    const cw = (f.w - 48 * S - (cols - 1) * gap) / cols;
    const chh = Math.min(172 * S, (f.y + f.h - 40 * S - top - gap) / 2);
    const offers = ensureSkinOffers(META);
    const cards = offers.map((o, i) => ({ o, i, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (chh + gap), w: cw, h: chh }));
    const reroll = { x: f.x + f.w - 286 * S, y: f.y + 50 * S, w: 182 * S, h: 26 * S };   // R17 UI-sweep polish: clear of the 50S title divider
    return { f, cards, reroll, back: this.wardrobeBackRect(f), top };
  },
  updateSkinShop(mx, my) {
    if (!mouse.justDown) return;
    const L = this.skinShopLayout(this.panelFrame());
    if (inside(mx, my, L.back)) { this.wardrobeView = null; this.panelScroll = 0; Sfx.play('uiClick'); return; }
    if (!skinPoolDry(META) && inside(mx, my, L.reroll)) {   // R17 QA: pool exhausted — button is hidden, ignore the click
      this.ask('重新進貨？', goldStr(SKINSHOP_REROLL_COST) + '　·　立即更換 8 款上架造型', () => {
        if (rerollSkinShop(META)) { saveMeta(); this.feedback('已重新進貨'); }
        else this.feedback((META.gold || 0) < SKINSHOP_REROLL_COST ? '金幣不足' : '未進到新貨，金幣已退還');
      });
      return;
    }
    for (const cd of L.cards) if (inside(mx, my, cd)) { this.buySkinOffer(cd.o); return; }
  },
  buySkinOffer(o) {
    const sk = SKINS.find((s) => s.id === o.s); const c = Characters.get(o.c);
    if (!sk || !c) return;
    const key = o.c + ':' + o.s;
    if ((META.ownedSkins || []).includes(key)) { this.feedback('已擁有此造型'); return; }
    const pr = skinPrice(META, sk);
    if ((META.gold || 0) < pr.price) { this.feedback('金幣不足'); return; }
    this.ask('購買 ' + c.name + ' 造型「' + sk.name + '」？', goldStr(pr.price) + (pr.onSale ? '　·　特賣 8 折！' : '') + (sk.hidden ? '　·　★隱藏造型' : ''), () => {
      if ((META.gold || 0) < pr.price) { this.feedback('金幣不足'); return; }
      META.gold -= pr.price; (META.ownedSkins = META.ownedSkins || []).push(key); saveMeta();
      this.feedback('購買造型：' + c.name + '「' + sk.name + '」');
    });
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
      goldLabel(L.reroll.x + L.reroll.w / 2, L.reroll.y + L.reroll.h / 2 + 1 * S, SKINSHOP_REROLL_COST, { size: 11 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '800', prefix: '↺ 重新進貨 ' });
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
    uiText(gp.name, f.x + 95 * S, f.y + 230 * S, { size: 10 * S, align: 'center', color: P.gold, weight: '700' });   // R17 UI-sweep polish: cleanly BELOW the 150S portrait frame (was straddling its border at high S)
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
    // R18/B9: 每日挑戰 entry bar — borrowed biome+hero+mutators, click to launch directly.
    {
      const dc = dailyChallenge(); const db = L.dailyBar; const dhov = inside(mx, my, db);
      const bn = (BIOMES.find((b) => b.id === dc.biomeId) || {}).name || dc.biomeId;
      const hn = (Characters.get(dc.characterId) || {}).name || dc.characterId;
      const mutNames = dc.mutators.map((id) => (mutatorById(id) || {}).name || id).join('·');
      uiRect(db.x, db.y, db.w, db.h, withAlpha(dhov ? '#3a2f12' : '#28220e', 0.96), { radius: 7 * S, stroke: P.goldL, lw: dhov ? 3 : 2 });
      uiText('📅 每日挑戰', db.x + 12 * S, db.y + db.h / 2, { size: 12 * S, align: 'left', baseline: 'middle', color: P.goldL, weight: '800' });
      uiText(bn + ' · ' + hn + ' · ' + mutNames, db.x + 120 * S, db.y + db.h / 2, { size: 9 * S, align: 'left', baseline: 'middle', color: P.holyL, weight: '700' });
      const best = (META.daily && META.daily.key === dc.key) ? (META.daily.best || 0) : 0;
      uiText(best > 0 ? '最佳 ' + best : '未挑戰', db.x + db.w - 12 * S, db.y + db.h / 2, { size: 10 * S, align: 'right', baseline: 'middle', color: P.gold, weight: '800' });
    }
    // R17/4.1: character cards 3×3 — each card is self-contained:
    // left = sprite + name (+ state), right = starting weapon + effect lines.
    for (const card of L.cards) {
      const c = card.c;
      const unlocked = META.unlocked.characters.includes(c.id);
      const selected = META.selectedCharacter === c.id;
      const hover = inside(mx, my, card);
      uiRect(card.x, card.y, card.w, card.h, withAlpha(selected ? '#243a5a' : unlocked ? '#1b2138' : '#201622', 0.96), { radius: 7 * S, stroke: selected ? P.shardL : hover ? P.gray3 : P.ink2, lw: selected ? 3 : 2 });
      const lw2 = card.w * 0.36;
      const sp = getSprite(selected ? (this.heroSprite || c.sprite) : c.sprite);
      const sc = Math.min(2.1 * S, (card.h - 36 * S) / sp.h);
      drawSpriteUI(sp.frames[0], card.x + lw2 / 2 - sp.w * sc / 2, card.y + 5 * S, sc, { alpha: unlocked ? 1 : 0.3 });
      uiText(c.name, card.x + lw2 / 2, card.y + card.h - 18 * S, { size: 10.5 * S, align: 'center', color: unlocked ? '#fff' : P.gray3, weight: '800' });
      if (!unlocked) {
        const afford = c.unlock.type === 'gold' && META.gold >= c.unlock.cost;
        if (c.unlock.type === 'gold') goldLabel(card.x + lw2 / 2, card.y + card.h - 6 * S, c.unlock.cost, { size: 8.5 * S, align: 'center', color: afford ? P.goldL : P.gray3, weight: '700', prefix: '🔒 ' });
        else uiText('🔒 成就解鎖', card.x + lw2 / 2, card.y + card.h - 6 * S, { size: 8.5 * S, align: 'center', color: P.gray3, weight: '700' });
      } else if (selected) uiText('● 已選', card.x + lw2 / 2, card.y + card.h - 6 * S, { size: 8.5 * S, align: 'center', color: P.shardL, weight: '800' });
      // right column: starting weapon + up to 2 effect lines (clipped, CJK-safe)
      const rx = card.x + lw2 + 2 * S, rw = card.w - lw2 - 12 * S;
      const wpn = Weapons.get(c.startWeapon);
      this.clip1('起始武器：' + (wpn ? wpn.name : c.startWeapon), rx, card.y + 17 * S, rw, 9.5 * S, unlocked ? P.goldL : P.gray3, '700');
      // R17 B15: compact mode when the grid is squeezed (high uiScale / short panel) — the desc
      // lines are the first thing to go so the grid never overlaps the page/level rows below.
      const descLines = card.h >= 70 * S ? 2 : card.h >= 52 * S ? 1 : 0;
      // R17 B12: hero descs end with their own「起始武器：X。」sentence — the card already has a
      // dedicated line for it, so strip the duplicate before wrapping the effect text.
      const dsz = 8.5 * S; let rest = (c.desc || '').replace(/(?:^|。)?\s*起始武器：[^。]*。?\s*$/, (m) => (m.startsWith('。') ? '。' : ''));
      for (let li = 0; li < descLines && rest; li++) {
        let line = '';
        while (rest && textWidth(line + rest[0], dsz, '500') <= rw) { line += rest[0]; rest = rest.slice(1); }
        if (!line) break;   // a single glyph wider than rw (degenerate) — bail
        if (li === descLines - 1 && rest) { while (line.length > 1 && textWidth(line + '…', dsz, '500') > rw) line = line.slice(0, -1); line += '…'; rest = ''; }
        uiText(line, rx, card.y + 32 * S + li * 12 * S, { size: dsz, color: unlocked ? P.gray4 : P.gray2, weight: '500' });
      }
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
    // difficulty row — R17/4.2: the stepper now ends in 無盡 on a cleared biome (劇情 → 1..max → 無盡)
    const maxD = this.maxDiff(sel);
    const topD = maxD + (this.biomeCleared(sel) ? 1 : 0);
    this.selDiff = Math.min(topD, Math.max(0, this.selDiff == null ? 1 : this.selDiff));   // 6.5: allow 0 (劇情)
    const isStory = this.selDiff <= 0;
    const isEndless = this.selDiff > maxD;
    uiText('難度', f.x + 24 * S, L.dY + 17 * S, { size: 11 * S, color: P.gray3, weight: '700' });
    arrow(L.dPrev, '−', this.selDiff > 0);
    arrow(L.dNext, '+', this.selDiff < topD);
    uiText(isEndless ? '∞ 無盡挑戰' : isStory ? '劇情' : ('難度 ' + this.selDiff + (this.selDiff >= maxD ? ' · 最高可玩' : '')), f.x + f.w / 2, L.dY + 17 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: isEndless ? P.goldL : isStory ? P.shardL : P.emberL, weight: '800' });   // R17 B15: ∞ (U+221E math glyph, in the CJK font) — ♾ U+267E emoji-rendered as a blob
    // 6.4 / 6.5 / 6.6: one-line difficulty / mode explanation (new-player guidance)
    const DIFF_DESC = {
      0: '劇情 · 敵人極弱、掉落豐厚，幾乎必過（不列入排行榜）',
      1: '入門 · 敵人較少、節奏輕鬆，適合熟悉操作',
      2: '普通 · 敵潮變密，開始出現包圍與狀態威脅',
      3: '困難 · 高壓追殺，中後期考驗 build 與走位',
      4: '專家 · 敵更兇猛、遠程更多，容錯極低',
      5: '夢魘 · 極限挑戰，僅為最強的獵手準備',
    };
    const descTxt = isEndless ? '無盡挑戰 · 無時限、首領每 180 秒一波、威脅持續攀升（不列入標準排行榜）'
      : (DIFF_DESC[this.selDiff] || '') + (!this.biomeCleared(sel) ? '' : (this.selDiff >= maxD ? '　·　再按＋進入無盡' : ''));
    uiText(descTxt, f.x + f.w / 2, L.dY + 33 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: isEndless ? P.goldL : P.gray3 });
    // start
    const hovS = inside(mx, my, L.start);
    uiRect(L.start.x, L.start.y, L.start.w, L.start.h, withAlpha(hovS ? '#2a6a3a' : '#1f5030', 0.98), { radius: 9 * S, stroke: P.greenL, lw: hovS ? 3 : 2 });
    uiText('出 擊 狩 獵', L.start.x + L.start.w / 2, L.start.y + L.start.h / 2 + 1 * S, { size: 18 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900' });
  },

  // R17/10.2: first-open sortie walkthrough — three callouts teaching the unlock loop
  // (clear a biome → next biome; clear a difficulty → next step; cleared biomes get 無盡).
  drawSortieTut() {
    const S = uiScale(); const L = this.sortieLayout(); const f = L.f;
    uiRect(0, 0, view.W, view.H, withAlpha('#070912', 0.62));
    uiText('出 擊 指 南', view.W / 2, Math.max(20 * S, f.y - 12 * S), { size: 20 * S, align: 'center', color: P.goldL, weight: '900', shadowColor: withAlpha('#000', 0.8) });
    const ctx = ctxRaw();
    const callout = (tx, ty, bx, by, label) => {
      const tw = textWidth(label, 11.5 * S, '700') + 18 * S, bh = 24 * S;
      ctx.save(); ctx.strokeStyle = withAlpha('#fff', 0.7); ctx.lineWidth = 1.5 * S;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = withAlpha(P.goldL, 0.9); ctx.beginPath(); ctx.arc(tx, ty, 3.5 * S, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      uiRect(bx - tw / 2, by - bh / 2, tw, bh, withAlpha('#10142c', 0.97), { radius: 6 * S, stroke: P.goldL, lw: 1.5 });
      uiText(label, bx, by + 1 * S, { size: 11.5 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700' });
    };
    const lb = L.lvlButtons[0];
    if (lb) callout(lb.x + lb.w / 2, lb.y + 4 * S, Math.max(f.x + 150 * S, lb.x + lb.w / 2 + 70 * S), lb.y - 30 * S, '通關生態 → 解鎖下一個生態');
    callout(view.W / 2 + 80 * S, L.dY + 13 * S, Math.min(f.x + f.w - 160 * S, view.W / 2 + 180 * S), L.dY - 22 * S, '通關難度 → 解鎖更高難度與「無盡」');
    callout(L.start.x + L.start.w / 2 - 60 * S, L.start.y + 8 * S, L.start.x - 90 * S, L.start.y + 14 * S, '選好就出擊！');
    uiText('點擊任意處關閉（只出現一次，ESC 選單可重看新手指南）', view.W / 2, f.y + f.h + 18 * S > view.H ? view.H - 10 * S : f.y + f.h + 14 * S, { size: 11 * S, align: 'center', color: withAlpha(P.goldL, 0.7 + 0.3 * Math.sin(this.t * 5)), weight: '700', shadowColor: withAlpha('#000', 0.8) });
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
