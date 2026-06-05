// Hub / camp scene: spend gold on permanent talents & facilities, choose a
// loadout, then sortie. This is the meta-progression core.
import { World, makeCamp, TS } from '../world.js';
import { refs } from './refs.js';
import { setScene } from '../scene.js';
import { newRun, META, saveMeta, WEAPONS } from '../state.js';
import { Talents, Facilities, Characters, Weapons } from '../content/registry.js';
import { TALENT_BRANCHES } from '../content/talents.js';
import { ACHIEVEMENTS, achievementProgress } from '../content/achievements.js';
import { STORY_QUESTS, chapterState, claimChapter, guildQuests, trackQuest, claimQuest, trackedQuestState, fmtQuestVal } from '../content/quests.js';
import { SKINS, skinnedSprite, skinSpriteName } from '../content/characters.js';
import { BIOMES } from '../../art/biomes.js';
import {
  camera, uiText, uiRect, uiScale, view, drawSprite, drawShadow, drawSpriteUI,
  worldToScreen, vignette, textWidth, glowWorld, uiBar, ctxRaw,
} from '../../engine/renderer.js';
import { getSprite, frameAt, iconOr } from '../../engine/sprites.js';
import { moveAxis, pressed, mouse } from '../../engine/input.js';
import { dist, clamp } from '../../engine/math.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Sfx, Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;

export const hubScene = {
  enter() {
    const CW = 34, CH = 22;
    this.world = new World({});
    this.world.loadMap(makeCamp(CW, CH));
    const cx = this.world.pxW / 2, cy = this.world.pxH / 2;
    this.hero = { x: cx, y: cy + 34, vx: 0, vy: 0, facing: 1, radius: 5, walkT: 0, moving: false };
    camera.x = camera.targetX = cx; camera.y = camera.targetY = cy;
    this.stations = [
      { id: 'talents', sprite: 'hub_altar', label: '天賦祭壇', color: P.shardL, x: 8 * TS, y: cy },
      { id: 'quests', sprite: 'hub_quests', label: '任務公會', color: P.goldL, x: 10 * TS, y: 6 * TS },
      { id: 'sortie', sprite: 'portal', label: '出擊傳送門', color: P.manaL, x: cx, y: 5 * TS },
      { id: 'achievements', sprite: 'hub_trophy', label: '成就殿堂', color: P.goldL, x: (CW - 10) * TS, y: 6 * TS },
      { id: 'facilities', sprite: 'hub_forge', label: '設施工坊', color: P.emberL, x: (CW - 8) * TS, y: cy },
      { id: 'wardrobe', sprite: 'npc_smith', label: '造型坊', color: P.purpleL, x: cx + 4 * TS, y: cy + 3 * TS },
    ];
    this.panel = null; this.near = null; this.t = 0;
    this.panelScroll = 0; this.panelMaxScroll = 0;
    this.flash = ''; this.flashT = 0;
    this.sortPage = 0; this.selBiome = null; this.selDiff = 1;   // sortie: char page + level + difficulty
    this.heroSprite = skinnedSprite(META, META.selectedCharacter || 'hunter');
    Music.start('hub');
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.panel) { this.updatePanel(); return; }
    if (pressed('escape')) { settingsUI.show(); return; }

    const ax = moveAxis(); const h = this.hero;
    h.moving = !!(ax.x || ax.y);
    const sp = 92;
    h.vx += (ax.x * sp - h.vx) * Math.min(1, 14 * dt);
    h.vy += (ax.y * sp - h.vy) * Math.min(1, 14 * dt);
    if (Math.abs(h.vx) > 2) h.facing = h.vx < 0 ? -1 : 1;
    this.world.moveActor(h, h.vx * dt, h.vy * dt);
    if (h.moving) h.walkT += dt;
    camera.targetX = h.x; camera.targetY = h.y - 6;
    this.world.particles.update(dt);

    this.near = null; let bd = 30;
    for (const s of this.stations) { const d = dist(h.x, h.y, s.x, s.y); if (d < bd) { bd = d; this.near = s; } }

    let open = null;
    if (this.near && (pressed('interact') || pressed('enter'))) open = this.near.id;
    if (mouse.justDown) {
      const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
      for (const s of this.stations) { const ss = worldToScreen(s.x, s.y - 10); if (dist(mx, my, ss.x, ss.y) < 46 * view.dpr) open = s.id; }
    }
    if (pressed('slot1')) open = 'talents';
    if (pressed('slot2')) open = 'facilities';
    if (pressed('slot3')) open = 'achievements';
    if (pressed('slot4')) open = 'quests';
    if (pressed('space')) open = 'sortie';
    if (open) { this.panel = open; this.panelScroll = 0; this.panelMaxScroll = 0; Sfx.play('uiClick'); }
  },

  feedback(msg) { this.flash = msg; this.flashT = 1.4; Sfx.play('buy'); },

  updatePanel() {
    if (pressed('escape') || pressed('map')) { this.panel = null; return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const frame = this.panelFrame();
    // 原#19: draggable vertical scrollbar takes priority over card clicks
    if (this.handleScrollbar(mx, my, frame)) return;
    // close button / click outside
    if (mouse.justDown) {
      if (inside(mx, my, frame.close)) { this.panel = null; return; }
      if (!inside(mx, my, frame)) { this.panel = null; return; }
    }
    // wheel scrolling for the fixed-grid panels (sortie pages itself; quests is short)
    if (mouse.wheel && (this.panel === 'talents' || this.panel === 'facilities' || this.panel === 'achievements')) {
      this.panelScroll = clamp((this.panelScroll || 0) + mouse.wheel * 0.5, 0, this.panelMaxScroll || 0);
    }
    if (this.panel === 'talents') this.updateTalents(mx, my);
    else if (this.panel === 'facilities') this.updateFacilities(mx, my);
    else if (this.panel === 'sortie') this.updateSortie(mx, my);
    else if (this.panel === 'quests') this.updateQuests(mx, my);
    else if (this.panel === 'wardrobe') this.updateWardrobe(mx, my);
  },

  // ---- scrollbar (原#19): a draggable vertical bar for the long scrollable panels --
  scrollbarGeom(f) {
    const S = f.S;
    const x = f.x + f.w - 14 * S, y = f.y + 60 * S, h = f.h - 78 * S, w = 8 * S;
    const max = this.panelMaxScroll || 0;
    const content = h + max;
    const thumbH = Math.max(26 * S, h * (h / Math.max(h, content)));
    const thumbY = max > 0 ? y + (h - thumbH) * ((this.panelScroll || 0) / max) : y;
    return { x, y, h, w, thumbH, thumbY, max, S };
  },
  handleScrollbar(mx, my, f) {
    if (!(this.panelMaxScroll > 0)) { this.scrollDrag = null; return false; }
    const g = this.scrollbarGeom(f);
    if (this.scrollDrag) {                         // continue an active drag
      if (!mouse.down) { this.scrollDrag = null; return false; }
      const trackH = g.h - g.thumbH;
      this.panelScroll = clamp(this.scrollDrag.s + (trackH > 0 ? (my - this.scrollDrag.y) / trackH * g.max : 0), 0, g.max);
      return true;
    }
    if (mouse.justDown && mx >= g.x - 6 * g.S && mx <= g.x + g.w + 6 * g.S && my >= g.y && my <= g.y + g.h) {
      if (my < g.thumbY || my > g.thumbY + g.thumbH) {   // click track: centre the thumb on the cursor
        const trackH = g.h - g.thumbH;
        this.panelScroll = clamp((my - g.y - g.thumbH / 2) / Math.max(1, trackH) * g.max, 0, g.max);
      }
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

  // ---- purchase logic ------------------------------------------------------
  talentState(def) {
    const cur = META.talents[def.id] || 0;
    if (cur >= def.maxLevel) return 'max';
    if (def.requires) for (const r of def.requires) if (!(META.talents[r] > 0)) return 'locked';
    return META.gold >= def.cost(cur) ? 'ok' : 'poor';
  },
  buyTalent(def) {
    if (this.talentState(def) !== 'ok') return;
    const cur = META.talents[def.id] || 0;
    META.gold -= def.cost(cur);
    META.talents[def.id] = cur + 1;
    saveMeta();
    this.feedback(def.name + ' Lv.' + (cur + 1));
  },
  facilityState(def) {
    const cur = META.facilities[def.id] || 0;
    if (cur >= def.maxLevel) return 'max';
    return META.gold >= def.cost(cur) ? 'ok' : 'poor';
  },
  buyFacility(def) {
    if (this.facilityState(def) !== 'ok') return;
    const cur = META.facilities[def.id] || 0;
    META.gold -= def.cost(cur);
    META.facilities[def.id] = cur + 1;
    if (def.onPurchase) try { def.onPurchase(META, cur + 1); } catch (e) { /* ignore */ }
    saveMeta();
    this.feedback(def.name + ' Lv.' + (cur + 1));
  },

  // ---- layout --------------------------------------------------------------
  panelFrame() {
    const S = uiScale();
    const pw = Math.min(view.W * 0.82, 880 * S);
    const ph = Math.min(view.H * 0.84, 600 * S);
    const x = (view.W - pw) / 2, y = (view.H - ph) / 2;
    return { x, y, w: pw, h: ph, S, close: { x: x + pw - 38 * S, y: y + 10 * S, w: 28 * S, h: 28 * S } };
  },

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
        const y = f.y + 84 * S + ri * (nodeH + 12 * S) - (this.panelScroll || 0);
        nodes.push({ def, x, y, w: nodeW, h: nodeH, color: br.color });
      });
    });
    return { f, nodes };
  },
  updateTalents(mx, my) {
    if (!mouse.justDown) return;
    const { nodes } = this.talentNodes();
    for (const n of nodes) if (inside(mx, my, n)) { this.buyTalent(n.def); return; }
  },

  facilityCards() {
    const f = this.panelFrame(); const S = f.S;
    const list = Facilities.all();
    const cols = 3; const cardW = (f.w - 40 * S - (cols - 1) * 16 * S) / cols; const cardH = 92 * S;
    const cards = list.map((def, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      return { def, x: f.x + 20 * S + c * (cardW + 16 * S), y: f.y + 70 * S + r * (cardH + 14 * S) - (this.panelScroll || 0), w: cardW, h: cardH };
    });
    return { f, cards };
  },
  updateFacilities(mx, my) {
    if (!mouse.justDown) return;
    const { cards } = this.facilityCards();
    for (const c of cards) if (inside(mx, my, c)) { this.buyFacility(c.def); return; }
  },

  sortieLayout() {
    const f = this.panelFrame(); const S = f.S;
    const chars = Characters.all();
    const perPage = 6, cols = 3;
    const pages = Math.max(1, Math.ceil(chars.length / perPage));
    if (this.sortPage >= pages) this.sortPage = pages - 1;
    if (this.sortPage < 0) this.sortPage = 0;
    // lay out bottom-up so the controls never collide with the start button
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
    const top = f.y + 58 * S;
    const cw = (f.w - 40 * S - (cols - 1) * 12 * S) / cols;
    const chh = Math.max(60 * S, Math.min(92 * S, (pgY - 8 * S - top) / 2 - 8 * S));
    const pageChars = chars.slice(this.sortPage * perPage, this.sortPage * perPage + perPage);
    const cards = pageChars.map((c, i) => ({ c, x: f.x + 20 * S + (i % cols) * (cw + 12 * S), y: top + Math.floor(i / cols) * (chh + 8 * S), w: cw, h: chh }));
    return { f, cards, prev, next, pages, pgY, levels, lvlButtons, lvlY, dPrev, dNext, dY, start };
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
    if (inside(mx, my, L.dPrev)) { this.selDiff = Math.max(1, this.selDiff - 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.dNext)) { this.selDiff = Math.min(maxD, this.selDiff + 1); Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.start)) { const b = this.curBiome(L); const d = Math.min(this.maxDiff(b), Math.max(1, this.selDiff)); Sfx.play('portal'); saveMeta(); setScene(refs.run, { run: newRun({ biomeId: b, difficulty: d }) }); }
  },

  // ---- render --------------------------------------------------------------
  render() {
    const S = uiScale();
    this.world.draw();
    // stations + hero
    for (const s of this.stations) {
      const sp = getSprite(s.sprite);
      const bob = s.id === 'sortie' ? Math.sin(this.t * 2) : 0;
      glowWorld(s.x, s.y - 8, 16, s.color, 0.16 + (this.near === s ? 0.14 : 0));
      drawShadow(s.x, s.y, sp.w * 0.3);
      drawSprite(frameAt(sp, this.t), s.x, s.y + bob, { ax: sp.ax, ay: sp.ay });
    }
    const h = this.hero; const psp = getSprite(this.heroSprite || 'player');
    drawShadow(h.x, h.y, h.radius + 1.5);
    drawSprite(h.moving ? frameAt(psp, h.walkT) : frameAt(psp, this.t * 0.4), h.x, h.y, { ax: psp.ax, ay: psp.ay, flipX: h.facing < 0 });
    // station labels
    for (const s of this.stations) {
      const sp = getSprite(s.sprite);
      const ss = worldToScreen(s.x, s.y - sp.h - 6);
      uiText(s.label, ss.x, ss.y, { size: 13 * S, align: 'center', color: s.color, weight: '800' });
      if (this.near === s) {
        const sp2 = worldToScreen(s.x, s.y + 8);
        uiText('按 E', sp2.x, sp2.y, { size: 12 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' });
      }
    }
    this.world.particles.drawText();
    vignette(0.45);

    // top bar
    uiText('城 鎮', view.W / 2, 28 * S, { size: 20 * S, align: 'center', color: '#fff', weight: '900' });
    const csp = getSprite('coin');
    drawSpriteUI(csp.frames[0], view.W - 110 * S, 12 * S, 2.2 * S);
    uiText(String(META.gold), view.W - 84 * S, 30 * S, { size: 18 * S, color: P.goldL, weight: '800' });
    uiText('1 天賦　2 設施　3 成就　4 任務　空白 出擊　Esc 設定', view.W / 2, view.H - 16 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    if (this.flashT > 0) uiText(this.flash, view.W / 2, view.H * 0.8, { size: 18 * S, align: 'center', color: withAlpha(P.goldL, Math.min(1, this.flashT)), weight: '800' });
    if (!this.panel) this.drawQuestTracker();   // #2 persistent left-side tracker

    if (this.panel === 'talents') this.drawTalents();
    else if (this.panel === 'facilities') this.drawFacilities();
    else if (this.panel === 'sortie') this.drawSortie();
    else if (this.panel === 'achievements') this.drawAchievements();
    else if (this.panel === 'quests') this.drawQuests();
    else if (this.panel === 'wardrobe') this.drawWardrobe();
    settingsUI.draw();
  },

  // #2: persistent tracked-quest panel (top-left of the hub)
  drawQuestTracker() {
    const S = uiScale(); const q = trackedQuestState(META); if (!q) return;
    const x = 12 * S, y = 12 * S, w = 200 * S, h = 50 * S;
    uiRect(x, y, w, h, withAlpha('#0b0d1a', 0.66), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.6), lw: 1.5 });
    uiText('追蹤任務 · ' + q.title, x + 8 * S, y + 16 * S, { size: 11 * S, color: P.goldL, weight: '800' });
    if (q.sub) uiText(q.sub, x + 8 * S, y + 30 * S, { size: 9.5 * S, color: P.gray3 });
    uiBar(x + 8 * S, y + 37 * S, w - 16 * S, 5 * S, q.frac || 0, { fg: q.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
    if (q.goal) uiText(fmtQuestVal(q.prog, q.fmt) + '/' + fmtQuestVal(q.goal, q.fmt), x + w - 8 * S, y + 34 * S, { size: 9 * S, align: 'right', color: P.gray3 });
  },

  // ---- 造型坊 wardrobe (#5): buy + equip alternate skins for the selected hero --
  wardrobeLayout() {
    const f = this.panelFrame(); const S = f.S;
    const opts = [{ id: null, name: '原色', price: 0 }, ...SKINS];
    const cols = 3, cw = Math.min(130 * S, (f.w - 48 * S) / cols - 10 * S), ch = 96 * S, gap = 12 * S;
    const top = f.y + 150 * S;
    const cards = opts.map((o, i) => ({ o, x: f.x + 24 * S + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (ch + gap), w: cw, h: ch }));
    return { f, cards };
  },
  updateWardrobe(mx, my) {
    if (!mouse.justDown) return;
    const cid = META.selectedCharacter || 'hunter';
    for (const c of this.wardrobeLayout().cards) if (inside(mx, my, c)) { this.pickSkin(cid, c.o); return; }
  },
  pickSkin(cid, o) {
    const key = o.id ? cid + ':' + o.id : null;
    const owned = !o.id || (META.ownedSkins || []).includes(key);
    if (owned) { if (o.id) META.skins[cid] = o.id; else delete META.skins[cid]; this.heroSprite = skinnedSprite(META, cid); saveMeta(); Sfx.play('uiClick'); this.feedback('套用造型：' + o.name); }
    else if (META.gold >= o.price) { META.gold -= o.price; (META.ownedSkins = META.ownedSkins || []).push(key); META.skins[cid] = o.id; this.heroSprite = skinnedSprite(META, cid); saveMeta(); this.feedback('購買造型：' + o.name); }
    else this.feedback('金幣不足');
  },
  drawWardrobe() {
    const f = this.drawPanelFrame('造 型 坊'); const S = f.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const cid = META.selectedCharacter || 'hunter'; const ch = Characters.get(cid);
    uiText('角色：' + (ch ? ch.name : cid) + '　·　以金幣購買並套用同一英雄的不同外觀', f.x + f.w / 2, f.y + 50 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    const psp = getSprite(skinnedSprite(META, cid)), pscale = 4 * S;
    drawSpriteUI(psp.frames[0], f.x + f.w / 2 - psp.w * pscale / 2, f.y + 64 * S, pscale);
    for (const c of this.wardrobeLayout().cards) {
      const o = c.o, key = o.id ? cid + ':' + o.id : null;
      const owned = !o.id || (META.ownedSkins || []).includes(key);
      const equipped = (o.id || null) === (META.skins[cid] || null);
      const hover = inside(mx, my, c);
      uiRect(c.x, c.y, c.w, c.h, withAlpha(equipped ? '#243a5a' : '#1b2138', 0.96), { radius: 7 * S, stroke: equipped ? P.shardL : hover ? P.gray3 : P.ink2, lw: equipped ? 3 : 2 });
      const sp = getSprite(skinSpriteName(cid, o.id)), sc = 2.6 * S;
      drawSpriteUI(sp.frames[0], c.x + c.w / 2 - sp.w * sc / 2, c.y + 8 * S, sc, { alpha: owned ? 1 : 0.4 });
      uiText(o.name, c.x + c.w / 2, c.y + c.h - 22 * S, { size: 12 * S, align: 'center', color: owned ? '#fff' : P.gray3, weight: '800' });
      uiText(equipped ? '● 使用中' : owned ? '套用' : ('🔒 ' + o.price + ' 金'), c.x + c.w / 2, c.y + c.h - 7 * S, { size: 9 * S, align: 'center', color: equipped ? P.shardL : owned ? P.gray3 : (META.gold >= o.price ? P.goldL : P.gray3), weight: '700' });
    }
  },

  drawPanelFrame(title) {
    const f = this.panelFrame(); const S = f.S;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.74));
    uiRect(f.x, f.y, f.w, f.h, withAlpha('#161a30', 0.98), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(f.x, f.y, f.w, 50 * S, withAlpha('#1f2542', 0.96), { radius: 12 * S });
    uiText(title, f.x + 22 * S, f.y + 32 * S, { size: 20 * S, color: '#fff', weight: '900' });
    const csp = getSprite('coin');
    drawSpriteUI(csp.frames[0], f.x + f.w - 150 * S, f.y + 14 * S, 2 * S);
    uiText(String(META.gold), f.x + f.w - 128 * S, f.y + 32 * S, { size: 17 * S, color: P.goldL, weight: '800' });
    uiRect(f.close.x, f.close.y, f.close.w, f.close.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', f.close.x + f.close.w / 2, f.close.y + f.close.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    return f;
  },

  drawTalents() {
    const f = this.drawPanelFrame('天 賦 樹');
    const S = f.S;
    const cols = TALENT_BRANCHES.length; const colW = f.w / cols;
    TALENT_BRANCHES.forEach((br, ci) => {
      uiText(br.name, f.x + ci * colW + colW / 2, f.y + 70 * S, { size: 15 * S, align: 'center', color: br.color, weight: '800' });
    });
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const { nodes } = this.talentNodes();
    // content bottom (un-clamped) → derive scroll range for this panel
    let bottom = f.y + 84 * S;
    for (const n of nodes) bottom = Math.max(bottom, n.y + n.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y + 58 * S, f.w, f.h - 74 * S); ctx.clip();
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
      // level pips
      for (let i = 0; i < def.maxLevel; i++) {
        uiRect(n.x + 40 * S + i * 9 * S, n.y + 42 * S, 7 * S, 5 * S, i < cur ? n.color : '#333a55', { radius: 1 });
      }
      const label = st === 'max' ? '已滿級' : st === 'locked' ? '需先解鎖前置' : (def.cost(cur) + ' 金幣');
      const col = st === 'max' ? P.greenL : st === 'locked' ? P.gray3 : st === 'poor' ? P.redL : P.goldL;
      uiText(label, n.x + n.w - 8 * S, n.y + n.h - 9 * S, { size: 11 * S, align: 'right', color: col, weight: '800' });
    }
    ctx.restore();
    this.drawScrollbar(f);   // 原#19
    const hint = this.panelMaxScroll > 0 ? '點擊節點花費金幣升級　·　拖曳右側捲軸　·　Esc 關閉' : '點擊節點花費金幣升級　·　Esc 關閉';
    uiText(hint, f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  drawFacilities() {
    const f = this.drawPanelFrame('營 地 設 施');
    const S = f.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const { cards } = this.facilityCards();
    let bottom = f.y + 70 * S;
    for (const c of cards) bottom = Math.max(bottom, c.y + c.h + (this.panelScroll || 0));
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y + 58 * S, f.w, f.h - 74 * S); ctx.clip();
    for (const c of cards) {
      const def = c.def; const cur = META.facilities[def.id] || 0; const st = this.facilityState(def);
      const hover = inside(mx, my, c);
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover && st === 'ok' ? P.emberL : P.ink2, lw: hover ? 3 : 2 });
      const isp = getSprite(iconOr(def.icon, 'facility_f_forge'));
      drawSpriteUI(isp.frames[0], c.x + 8 * S, c.y + 8 * S, (30 * S) / isp.w);
      this.clip1(def.name, c.x + 46 * S, c.y + 20 * S, c.w - 92 * S, 13 * S, '#fff', '800');
      uiText('Lv.' + cur + '/' + def.maxLevel, c.x + c.w - 9 * S, c.y + 20 * S, { size: 11 * S, align: 'right', color: P.emberL, weight: '800' });
      this.wrap(def.desc, c.x + 10 * S, c.y + 42 * S, c.w - 20 * S, 10.5 * S);
      const label = st === 'max' ? '已滿級' : (def.cost(cur) + ' 金幣');
      const col = st === 'max' ? P.greenL : st === 'poor' ? P.redL : P.goldL;
      uiText(label, c.x + c.w - 10 * S, c.y + c.h - 10 * S, { size: 12 * S, align: 'right', color: col, weight: '800' });
    }
    ctx.restore();
    this.drawScrollbar(f);   // 原#19
    const hint = this.panelMaxScroll > 0 ? '點擊設施花費金幣建造/升級　·　拖曳右側捲軸　·　Esc 關閉' : '點擊設施花費金幣建造/升級　·　Esc 關閉';
    uiText(hint, f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  drawSortie() {
    const f = this.drawPanelFrame('出 擊 · 選 角 / 關 卡 / 難 度');
    const S = f.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.sortieLayout();
    // character cards (paged —滾輪/箭頭翻頁)
    for (const card of L.cards) {
      const c = card.c;
      const unlocked = META.unlocked.characters.includes(c.id);
      const selected = META.selectedCharacter === c.id;
      const hover = inside(mx, my, card);
      uiRect(card.x, card.y, card.w, card.h, withAlpha(selected ? '#243a5a' : unlocked ? '#1b2138' : '#201622', 0.96), { radius: 7 * S, stroke: selected ? P.shardL : hover ? P.gray3 : P.ink2, lw: selected ? 3 : 2 });
      const sp = getSprite(c.sprite); const sc = 2.4 * S;
      drawSpriteUI(sp.frames[0], card.x + card.w / 2 - sp.w * sc / 2, card.y + 6 * S, sc, { alpha: unlocked ? 1 : 0.3 });
      uiText(c.name, card.x + card.w / 2, card.y + card.h - 22 * S, { size: 12 * S, align: 'center', color: unlocked ? '#fff' : P.gray3, weight: '800' });
      if (!unlocked) {
        const label = c.unlock.type === 'gold' ? (c.unlock.cost + ' 金') : '成就解鎖';
        const afford = c.unlock.type === 'gold' && META.gold >= c.unlock.cost;
        uiText('🔒 ' + label, card.x + card.w / 2, card.y + card.h - 7 * S, { size: 9 * S, align: 'center', color: afford ? P.goldL : P.gray3, weight: '700' });
      } else if (selected) uiText('● 已選', card.x + card.w / 2, card.y + card.h - 7 * S, { size: 9 * S, align: 'center', color: P.shardL, weight: '800' });
    }
    // #1: hovered (or selected) hero info — ability / difference + starting weapon
    let infoC = Characters.get(META.selectedCharacter);
    for (const card of L.cards) if (inside(mx, my, card)) { infoC = card.c; break; }
    if (infoC) {
      const iy = L.pgY - 52 * S, wpn = Weapons.get(infoC.startWeapon);
      const ulocked = META.unlocked.characters.includes(infoC.id);
      uiText('▸ ' + infoC.name + (ulocked ? '' : '（未解鎖）'), f.x + 24 * S, iy, { size: 13 * S, color: P.shardL, weight: '800' });
      uiText('起始武器：' + (wpn ? wpn.name : infoC.startWeapon), f.x + f.w - 24 * S, iy, { size: 11 * S, align: 'right', color: P.goldL, weight: '700' });
      let line = '', yy = iy + 16 * S, lines = 0; const maxw = f.w - 48 * S, size = 11 * S;
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
    this.selDiff = Math.min(maxD, Math.max(1, this.selDiff || 1));
    uiText('難度', f.x + 24 * S, L.dY + 17 * S, { size: 11 * S, color: P.gray3, weight: '700' });
    arrow(L.dPrev, '−', this.selDiff > 1);
    arrow(L.dNext, '+', this.selDiff < maxD);
    uiText('難度 ' + this.selDiff + (this.selDiff >= maxD ? ' · 最高可玩' : ''), f.x + f.w / 2, L.dY + 17 * S, { size: 13 * S, align: 'center', baseline: 'middle', color: P.emberL, weight: '800' });
    // start
    const hovS = inside(mx, my, L.start);
    uiRect(L.start.x, L.start.y, L.start.w, L.start.h, withAlpha(hovS ? '#2a6a3a' : '#1f5030', 0.98), { radius: 9 * S, stroke: P.greenL, lw: hovS ? 3 : 2 });
    uiText('出 擊 狩 獵', L.start.x + L.start.w / 2, L.start.y + L.start.h / 2 + 1 * S, { size: 18 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '900' });
  },

  questLayout() {
    const f = this.panelFrame(); const S = f.S;
    const mainClaim = { x: f.x + 24 * S, y: f.y + 116 * S, w: 150 * S, h: 30 * S };
    const mainTrack = { x: f.x + 182 * S, y: f.y + 116 * S, w: 112 * S, h: 30 * S };
    const list = guildQuests(META).slice(0, 7);   // fit without scrolling
    const rowH = 38 * S, top = f.y + 192 * S;
    const rows = list.map((q, i) => { const y = top + i * (rowH + 6 * S); return { q, y, h: rowH, track: { x: f.x + f.w - 196 * S, y: y + 6 * S, w: 84 * S, h: 26 * S }, claim: { x: f.x + f.w - 104 * S, y: y + 6 * S, w: 84 * S, h: 26 * S } }; });
    return { f, mainClaim, mainTrack, rows };
  },
  updateQuests(mx, my) {
    if (!mouse.justDown) return;
    const L = this.questLayout();
    const cur = chapterState(META, META.questIndex || 0);
    if (cur && cur.done && inside(mx, my, L.mainClaim)) { const q = claimChapter(META); if (q) { saveMeta(); this.feedback('完成 ' + q.title); } return; }
    if (inside(mx, my, L.mainTrack)) { trackQuest(META, 'story'); saveMeta(); Sfx.play('uiClick'); return; }
    for (const r of L.rows) {
      if (inside(mx, my, r.track)) { trackQuest(META, r.q.id); saveMeta(); this.feedback('追蹤：' + r.q.title); return; }
      if (inside(mx, my, r.claim)) { if (claimQuest(META, r.q.id)) { saveMeta(); this.feedback('領取：' + r.q.title); } else this.feedback('尚未達成'); return; }
    }
  },
  drawQuests() {
    const f = this.drawPanelFrame('故 事 · 任 務'); const S = f.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr; const L = this.questLayout();
    // mainline (claim + track)
    uiText('主線', f.x + 24 * S, f.y + 52 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    const cur = chapterState(META, META.questIndex || 0);
    if (cur) {
      uiText(cur.q.title, f.x + 24 * S, f.y + 72 * S, { size: 15 * S, color: '#fff', weight: '900' });
      uiText('目標：' + cur.q.desc, f.x + 24 * S, f.y + 90 * S, { size: 11 * S, color: P.shardL, weight: '700' });
      uiBar(f.x + 24 * S, f.y + 98 * S, f.w - 48 * S, 8 * S, cur.goal ? cur.prog / cur.goal : 1, { fg: cur.done ? P.greenL : P.shardL, bg: '#16183a', border: P.ink });
      const can = cur.done, hov = inside(mx, my, L.mainClaim);
      uiRect(L.mainClaim.x, L.mainClaim.y, L.mainClaim.w, L.mainClaim.h, withAlpha(can ? (hov ? '#2a6a3a' : '#1f5030') : '#2a2030', 0.96), { radius: 7 * S, stroke: can ? P.greenL : P.gray1, lw: 2 });
      uiText(can ? ('領取　+' + cur.q.reward + ' 金') : '尚未達成', L.mainClaim.x + L.mainClaim.w / 2, L.mainClaim.y + L.mainClaim.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: can ? '#fff' : P.gray3, weight: '800' });
      const trk = (META.trackedQuest || 'story') === 'story', th = inside(mx, my, L.mainTrack);
      uiRect(L.mainTrack.x, L.mainTrack.y, L.mainTrack.w, L.mainTrack.h, withAlpha(trk || th ? '#243a5a' : '#1b2138', 0.96), { radius: 7 * S, stroke: trk ? P.shardL : P.ink2, lw: trk ? 3 : 2 });
      uiText(trk ? '● 追蹤中' : '追蹤主線', L.mainTrack.x + L.mainTrack.w / 2, L.mainTrack.y + L.mainTrack.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: trk ? P.shardL : '#fff', weight: '800' });
    } else uiText('主線已全數完成 — 你已成為魂晶之主。', f.x + 24 * S, f.y + 80 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    // guild bounties (side + triggered hidden)
    uiText('任務公會 · 一般／隱藏任務（點選追蹤同步至左側）', f.x + 24 * S, f.y + 176 * S, { size: 12 * S, color: P.shardL, weight: '800' });
    if (!L.rows.length) uiText('目前沒有可接的任務（達成特定條件可解鎖隱藏任務）', f.x + 24 * S, f.y + 200 * S, { size: 11 * S, color: P.gray3 });
    for (const r of L.rows) {
      const q = r.q, p = Math.min(q.goal, q.prog(META.stats || {})), done = p >= q.goal;
      const trk = META.trackedQuest === q.id, hidden = q.id[0] === 'h';
      uiRect(f.x + 24 * S, r.y, f.w - 48 * S, r.h, withAlpha(trk ? '#243a5a' : '#1b2138', 0.95), { radius: 6 * S, stroke: trk ? P.shardL : (hidden ? P.purpleL : P.ink2), lw: trk ? 2 : 1 });
      uiText(q.title, f.x + 34 * S, r.y + 15 * S, { size: 12 * S, color: hidden ? P.purpleL : '#fff', weight: '800' });
      uiText(q.desc + '（' + fmtQuestVal(p, q.fmt) + '/' + fmtQuestVal(q.goal, q.fmt) + '）', f.x + 34 * S, r.y + 30 * S, { size: 10 * S, color: done ? P.greenL : P.gray4 });
      const tH = inside(mx, my, r.track);
      uiRect(r.track.x, r.track.y, r.track.w, r.track.h, withAlpha(trk || tH ? '#243a5a' : '#1b2138', 0.96), { radius: 5 * S, stroke: trk ? P.shardL : P.ink2, lw: 1 });
      uiText(trk ? '● 追蹤' : '追蹤', r.track.x + r.track.w / 2, r.track.y + r.track.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: trk ? P.shardL : '#fff', weight: '700' });
      const cH = inside(mx, my, r.claim);
      uiRect(r.claim.x, r.claim.y, r.claim.w, r.claim.h, withAlpha(done ? (cH ? '#2a6a3a' : '#1f5030') : '#2a2030', 0.96), { radius: 5 * S, stroke: done ? P.greenL : P.gray1, lw: 1 });
      uiText(done ? ('領 +' + q.reward) : '進行中', r.claim.x + r.claim.w / 2, r.claim.y + r.claim.h / 2 + 1 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: done ? '#fff' : P.gray3, weight: '700' });
    }
  },

  drawAchievements() {
    const f = this.drawPanelFrame('成 就 殿 堂');
    const S = f.S;
    const cols = 2;
    const cardW = (f.w - 40 * S - (cols - 1) * 14 * S) / cols, cardH = 62 * S;
    const got = META.achievements || [];
    const rows = Math.ceil(ACHIEVEMENTS.length / cols);
    const bottom = f.y + 72 * S + rows * (cardH + 9 * S);
    this.panelMaxScroll = Math.max(0, bottom - (f.y + f.h - 24 * S));
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, f.y + 58 * S, f.w, f.h - 74 * S); ctx.clip();
    ACHIEVEMENTS.forEach((a, i) => {
      const c = i % cols, r = Math.floor(i / cols);
      const x = f.x + 20 * S + c * (cardW + 14 * S), y = f.y + 72 * S + r * (cardH + 9 * S) - (this.panelScroll || 0);
      const done = got.includes(a.id);
      const name = (a.hidden && !done) ? '？？？' : (a.realName || a.name);
      let desc = (a.hidden && !done) ? '隱藏成就 — 達成後揭曉' : a.desc;
      if (!done && !a.hidden && a.prog) { const pg = a.prog(META.stats || {}, META); desc += `（${Math.min(pg[0], pg[1])}/${pg[1]}）`; }   // live progress (A2)
      uiRect(x, y, cardW, cardH, withAlpha(done ? '#1d2c1d' : '#1b2138', 0.96), { radius: 7 * S, stroke: done ? P.goldL : P.ink2, lw: 2 });
      uiText(done ? '★' : '☆', x + 12 * S, y + 23 * S, { size: 17 * S, color: done ? P.goldL : P.gray2, weight: '900' });
      uiText(name, x + 34 * S, y + 20 * S, { size: 12.5 * S, color: done ? '#fff' : P.gray3, weight: '800' });
      this.clip1(desc, x + 34 * S, y + 38 * S, cardW - 42 * S, 10 * S, done ? P.gray4 : P.gray2);
      if (a.rewardLabel) this.clip1((done ? '✓ 已解鎖：' : '✦ 解鎖：') + a.rewardLabel, x + 34 * S, y + 53 * S, cardW - 42 * S, 9.5 * S, done ? P.greenL : P.shardL, '700');   // unlock target (A2)
    });
    ctx.restore();
    this.drawScrollbar(f);   // 原#19
    const prog = achievementProgress(META);
    const tail = this.panelMaxScroll > 0 ? '　·　▲▼ 滾輪捲動' : '';
    uiText(`已解鎖 ${prog.unlocked} / ${prog.total}${tail}　·　Esc 關閉`, f.x + f.w / 2, f.y + f.h - 14 * S, { size: 12 * S, align: 'center', color: P.goldL, weight: '700' });
  },

  centerWrap(str, cx, y, maxw, size, color) {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '600') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.slice(0, 3).forEach((l, i) => uiText(l, cx, y + i * (size + 2), { size, align: 'center', color: color || P.gray4, weight: '600' }));
  },

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
