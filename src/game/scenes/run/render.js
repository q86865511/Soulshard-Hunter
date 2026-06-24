// run/render.js — render methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { mouse } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { drawShadow, drawSprite, drawSpriteUI, glowWorld, textWidth, uiBar, uiRect, uiScale, uiText, view, vignette, worldToScreen } from '../../../engine/renderer.js';
import { frameAt, getSprite, iconOr } from '../../../engine/sprites.js';
import { BALANCE, weaponMaxLevel } from '../../balance.js';
import { BONDS, bondProgress } from '../../content/bonds.js';
import { petById } from '../../content/pets.js';
import { Abilities, Equipment, Weapons } from '../../content/registry.js';
import { drawAchievementToasts, drawHud, drawLowHpWarning, hudIcons } from '../../hud.js';
import { MAX_PASSIVES, MAX_WEAPONS, RARITY, rarityOf } from '../../progression.js';
import { META } from '../../state.js';
import { settingsUI } from '../../ui/settings.js';
import { LEVEL_TIME, inside } from './shared.js';

export const renderMixin = {

  render() {
    this.world.draw();
    if (this.petId && this.petState && this.petState.x != null && this.player && !this.player.dead) {   // R18/B10 cosmetic pet (local only)
      const pp = petById(this.petId), psp = pp && getSprite(pp.sprite);
      if (psp && !psp.missing) { drawShadow(this.petState.x, this.petState.y, 4); drawSprite(frameAt(psp, this.petState.t), this.petState.x, this.petState.y + (this.petState.bob || 0), { ax: psp.ax, ay: psp.ay, flipX: (this.player.facing || 1) < 0 }); }
    }
    if (this.shrinePos) this.drawShrine();
    this.drawNpcs();
    this.drawHiddenRooms();
    this.drawVaultPrompt();   // R17/7.3:【E】use-key confirm hint above the locked chest
    this.drawEvents();
    this.drawPickupRange();   // 4.20: V shows the pickup-range ring (world space)
    vignette(this.dailyFog ? 0.62 : 0.42);   // R18/B9 m_fog: 暗角加深 (QA B12 — flag was set but unread)
    drawLowHpWarning(this.player, this.t);
    this.world.particles.drawText();
    drawHud(this.run, this.player);
    this.drawKeyHud();        // 4.22: held vault keys
    this.drawPickupLog();     // 4.2: recent-pickup log
    this.drawStageHud();
    this.drawPatronHud();   // 4.14 persistent patron-buff strip
    this.drawMinimap();
    this.drawQuestTracker();
    this.drawBondTracker();
    this.drawBanner();
    this.drawBattleHint();   // 6.2 first-battle combat hints
    this.drawInfo();
    this.drawBigMinimap();
    if (this.story && this.story.t > 0) this.drawStory();
    if (this.challenge) this.drawChallenge();
    if (this.shopOpen) this.drawShopPanel();
    // level-up has input priority (update() resolves this.choice first), so it must also draw ON TOP —
    // show only the active one so the equip window never hides the level-up cards behind it
    if (this.choice) { if (this.peekBuild) this.drawChoicePeekBuild(); else this.drawChoice(); }   // 4.19: TAB peek
    else if (this.equipChoice) this.drawEquipChoice();
    if (this.eventChoice) this.drawEventChoice();
    if (this.curseChoice) this.drawCurseChoice();   // R18/B7
    if (this.coop) this.drawCoopTags();
    if (this.coop && this.coopPick && !this.coopMenu) this.drawCoopPick();
    if (this.dead) { if (this.won) this.drawWon(); else this.drawDeath(); }
    if (this.paused) this.drawPause();
    if (this.leaveConfirm && !this.dead) this.drawLeaveConfirm();   // R17/1.7
    if (this.hudTut) this.drawHudTut();   // 6.3A first-run HUD walkthrough (on top)
    if (this.hiddenPanel) this.drawHidden();
    if (this.coop && this.coopMenu) this.drawCoopMenu();
    drawAchievementToasts();   // round16/4.9-B: global unlock banners (above HUD/panels)
    settingsUI.draw();
    this.drawCheatPanel();   // F2 dev overlay (on top of everything)
  },

  // co-op: floating name + HP tag above each teammate's avatar so you can tell who's who
  drawCoopTags() {
    if (!this.coop) return; const S = uiScale();
    for (const slot of this.coop.players) {
      const pl = slot.player; if (!pl || pl.dead || slot.left) continue;
      const isSelf = slot.cid === this.coop.selfCid;
      const ns = worldToScreen(pl.x, pl.y - 20);
      uiText(slot.name + (isSelf ? '（你）' : ''), ns.x, ns.y, { size: 9.5 * S, align: 'center', color: isSelf ? P.shardL : '#cfe0ff', weight: '700', shadowColor: withAlpha('#000', 0.8) });
      const bw = 30 * S, bx = ns.x - bw / 2, by = ns.y + 3 * S;
      uiRect(bx, by, bw, 3.2 * S, withAlpha('#2a0e14', 0.9), { radius: 1.5 * S });
      uiRect(bx, by, bw * Math.max(0, Math.min(1, pl.hp / (pl.maxHp || 1))), 3.2 * S, isSelf ? P.greenL : P.red, { radius: 1.5 * S });
    }
  },

  drawShrine() {
    const p = this.shrinePos; if (!p) return; const S = uiScale();
    const sp = getSprite('hub_altar');
    const used = this.shrineUsed;
    glowWorld(p.x, p.y - 8, 14, used ? P.gray2 : P.shardL, used ? 0.08 : 0.22 + Math.sin(this.t * 3) * 0.06);
    drawShadow(p.x, p.y, sp.w * 0.3);
    drawSprite(frameAt(sp, this.t), p.x, p.y, { ax: sp.ax, ay: sp.ay, alpha: used ? 0.45 : 1 });
    if (used) return;
    const ns = worldToScreen(p.x, p.y - sp.h - 4);
    uiText('祝福神龕', ns.x, ns.y, { size: 11 * S, align: 'center', color: P.shardL, weight: '800' });
    if (this.nearShrine) { const ps = worldToScreen(p.x, p.y + 8); uiText('按 E 祈福', ps.x, ps.y, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
  },
  drawNpcs() {
    if (!this.npcs || !this.npcs.length) return;
    const S = uiScale();
    const KIND = {
      well:  { sprite: 'hub_well',  label: '祈願水井', color: P.shardL },
      soul:  { sprite: 'wisp',      label: '迷途之魂', color: P.manaL },
      shard: { sprite: 'shard',     label: '魂晶礦脈', color: P.shardL },
      forge: { sprite: 'npc_smith', label: '流浪鐵匠', color: P.emberL },
    };
    for (const n of this.npcs) {
      if (n.used) continue;
      const k = KIND[n.kind] || KIND.soul;
      const sp = getSprite(k.sprite);
      const scale = n.kind === 'shard' ? 1.6 : 1;
      if (n.fresh > 0) n.fresh -= 1 / 60;
      glowWorld(n.x, n.y - 6, 12 + (n.fresh > 0 ? 8 * n.fresh : 0), k.color, 0.16 + Math.sin(this.t * 3 + n.x * 0.1) * 0.05);
      drawShadow(n.x, n.y, sp.w * 0.28 * scale);
      drawSprite(frameAt(sp, this.t), n.x, n.y, { ax: sp.ax, ay: sp.ay, scale });
      const ns = worldToScreen(n.x, n.y - sp.h * scale - 2);
      uiText(k.label, ns.x, ns.y, { size: 10 * S, align: 'center', color: k.color, weight: '700' });
      if (this.nearNpc === n) { const ps = worldToScreen(n.x, n.y + 8); uiText('按 E', ps.x, ps.y, { size: 10 * S, align: 'center', color: withAlpha('#fff', 0.6 + Math.sin(this.t * 6) * 0.3), weight: '800' }); }
    }
  },
  drawShopPanel() {
    const L = this.shopLayout(); const S = L.S;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.66));
    uiRect(L.x, L.y, L.w, L.h, withAlpha('#161a30', 0.98), { radius: 10 * S, stroke: P.shardD, lw: 2 });
    uiText('魂 晶 商 店', L.x + 22 * S, L.y + 30 * S, { size: 18 * S, color: '#fff', weight: '900' });
    const ssp = getSprite('shard'); drawSpriteUI(ssp.frames[0], L.x + L.w - 156 * S, L.y + 12 * S, 2 * S);
    uiText(String(this.run.shards), L.x + L.w - 132 * S, L.y + 30 * S, { size: 16 * S, color: P.shardL, weight: '800' });
    uiRect(L.close.x, L.close.y, L.close.w, L.close.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', L.close.x + L.close.w / 2, L.close.y + L.close.h / 2 + 1 * S, { size: 16 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    uiText('裝備鐵砧（三選一）', L.gearX, L.top - 14 * S, { size: 13 * S, color: P.goldL, weight: '800' });
    uiText('能力值鐵砧（三選一）', L.anvilX, L.top - 14 * S, { size: 13 * S, color: P.shardL, weight: '800' });
    uiText('鍛造鐵砧後三選一：史詩/稜彩裝備，或能力值強化', L.x + L.w / 2, L.y + 56 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    const buyCard = (c, title, sub, price, accent) => {
      const hover = inside(mx, my, c), afford = this.run.shards >= price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover ? accent : P.ink2, lw: hover ? 3 : 2 });
      uiText(title, c.x + 10 * S, c.y + 22 * S, { size: 13 * S, color: '#fff', weight: '800' });
      uiText(sub, c.x + 10 * S, c.y + 40 * S, { size: 10 * S, color: P.gray4 });
      uiText('魂晶 ' + price, c.x + c.w - 10 * S, c.y + c.h - 9 * S, { size: 12 * S, align: 'right', color: afford ? accent : P.redL, weight: '800' });
    };
    buyCard(L.gearBuyCard, '鍛造裝備鐵砧', '三選一 史詩/稜彩裝備' + (this.gearBuys ? '　已鍛 ×' + this.gearBuys : ''), this.gearPrice(), P.goldL);
    buyCard(L.anvilBuyCard, '鍛造能力值鐵砧', '三選一 能力值強化' + (this.anvilBuys ? '　已鍛 ×' + this.anvilBuys : ''), this.anvilPrice(), P.shardL);
    uiText('點擊購買　·　B / Esc 關閉', L.x + L.w / 2, L.y + L.h - 13 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    if (this.shopFlashT > 0) { this.shopFlashT -= 1 / 60; uiText(this.shopFlash, L.x + L.w / 2, L.y + L.h - 30 * S, { size: 12 * S, align: 'center', color: P.redL, weight: '800' }); }
    // the paused 3-choice overlay — stat or gear (#3 / C1)
    if (this.shopChoice && L.choiceCards) {
      const gear = this.shopChoice.kind === 'gear';
      uiRect(L.x, L.y, L.w, L.h, withAlpha('#0b0d1a', 0.76), { radius: 10 * S });
      uiText(gear ? '選擇一件裝備' : '選擇一項能力值強化', view.W / 2, L.choiceCards[0].y - 22 * S, { size: 16 * S, align: 'center', color: gear ? P.goldL : P.shardL, weight: '900' });
      for (const c of L.choiceCards) {
        const hover = inside(mx, my, c); const o = c.opt;
        const rar = gear ? RARITY[rarityOf(o)].accent : P.shardL;   // R17/5.1: 白/藍/紫/黃
        uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2840', 0.98), { radius: 8 * S, stroke: hover ? rar : withAlpha(rar, 0.5), lw: hover ? 3 : 2 });
        if (gear) {
          const sp = getSprite(iconOr(o.icon, 'equip_leather_armor'));
          drawSpriteUI(sp.frames[0], c.x + c.w / 2 - 16 * S, c.y + 12 * S, (32 * S) / sp.w);
          const slotName = o.slot === 'weapon' ? '專武' : o.slot === 'armor' ? '護甲' : '飾品';
          uiText(o.name + ' · ' + slotName, c.x + c.w / 2, c.y + 56 * S, { size: 12.5 * S, align: 'center', color: rar, weight: '800' });
          const nLines = this.wrapText(o.desc || '', c.x + c.w / 2, c.y + 74 * S, c.w - 16 * S, 10.5 * S, P.gray4);
          // 原#1/#4: before/after diff vs the current item in this slot
          this.drawEquipDiff(c.x + 10 * S, c.y + 80 * S + nLines * 13 * S, c.w - 20 * S, o, S, { title: '替換後', lw: c.w - 78 * S, max: 5 });
        } else {
          uiText('⚒', c.x + c.w / 2, c.y + 24 * S, { size: 22 * S, align: 'center', color: P.shardL, weight: '900' });   // 4.18: stat-anvil emblem
          uiText(o.name, c.x + c.w / 2, c.y + 48 * S, { size: 13 * S, align: 'center', color: '#fff', weight: '800' });
          this.wrapText(o.desc, c.x + c.w / 2, c.y + 68 * S, c.w - 16 * S, 11 * S, P.emberL);
        }
      }
      // 4.18: skip the roll (Esc also works) — you keep nothing but aren't forced into a bad pick
      const sk = this.shopSkipRect(L), skh = inside(mx, my, sk);
      uiRect(sk.x, sk.y, sk.w, sk.h, withAlpha(skh ? '#3a2030' : '#241620', 0.96), { radius: 7 * S, stroke: skh ? P.redL : withAlpha(P.redL, 0.5), lw: 1.5 });
      uiText('跳過（放棄此次鍛造）', sk.x + sk.w / 2, sk.y + sk.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: skh ? '#fff' : P.gray3, weight: '700' });
    }
  },
  drawShopCard(c, kind, mx, my, S) {
    const hover = inside(mx, my, c);
    if (kind === 'gear') {
      const o = c.offer; const afford = this.run.shards >= o.price;
      const rar = RARITY[rarityOf(o.def)].accent;   // R17/5.1: 白/藍/紫/黃 (exclusive = 傳說金)
      uiRect(c.x, c.y, c.w, c.h, withAlpha(o.bought ? '#1c2c1c' : '#1b2138', 0.96), { radius: 7 * S, stroke: o.bought ? P.ink2 : hover ? rar : withAlpha(rar, 0.55), lw: hover ? 3 : 2 });
      const sp = getSprite(iconOr(o.def.icon, 'equip_leather_armor'));
      drawSpriteUI(sp.frames[0], c.x + 6 * S, c.y + 6 * S, (26 * S) / sp.w);
      uiText(o.def.name, c.x + 38 * S, c.y + 18 * S, { size: 12 * S, color: o.bought ? P.gray3 : rar, weight: '800' });
      this.clipShop(o.def.desc || '', c.x + 38 * S, c.y + 32 * S, c.w - 46 * S, 10 * S);
      uiText(o.bought ? '已購買' : ('魂晶 ' + o.price), c.x + c.w - 8 * S, c.y + c.h - 7 * S, { size: 11 * S, align: 'right', color: o.bought ? P.greenL : afford ? P.shardL : P.redL, weight: '800' });
    } else {
      const a = c.anvil; const price = Math.round(a.price * Math.pow(1.3, a.buys || 0)); const afford = this.run.shards >= price;
      uiRect(c.x, c.y, c.w, c.h, withAlpha('#1b2138', 0.96), { radius: 7 * S, stroke: hover ? P.shardL : P.ink2, lw: hover ? 3 : 2 });
      uiText(a.name + (a.buys ? ' ×' + a.buys : ''), c.x + 10 * S, c.y + 18 * S, { size: 12 * S, color: '#fff', weight: '800' });
      this.clipShop(a.desc, c.x + 10 * S, c.y + 32 * S, c.w - 18 * S, 10 * S);
      uiText('魂晶 ' + price, c.x + c.w - 8 * S, c.y + c.h - 7 * S, { size: 11 * S, align: 'right', color: afford ? P.shardL : P.redL, weight: '800' });
    }
  },
  clipShop(str, x, y, maxw, size) {
    let s = str; while (s.length > 1 && textWidth(s, size, '500') > maxw) s = s.slice(0, -1);
    if (s.length < str.length && s.length > 1) s = s.slice(0, -1) + '…';
    uiText(s, x, y, { size, color: P.gray4, weight: '500' });
  },

  drawStageHud() {
    const S = uiScale();
    const diffLabel = this.endless ? '無盡挑戰' : (this.storyMode ? '劇情' : '難度 ' + (this.run.difficulty || 1));   // 6.5/6.6
    const et = this.run.time || 0, em = Math.floor(et / 60), es = Math.floor(et % 60);   // 4.11: 已遊玩時間
    uiText(`${this.map.biome.name} · ${diffLabel} · 威脅 ${this.threat} · ⏱ ${em}:${es.toString().padStart(2, '0')}`, view.W / 2, 24 * S, { size: 15 * S, align: 'center', color: '#fff', weight: '800' });
    let label, hot = false;
    if (this.endless) {   // 6.6: wave count + next-boss countdown (no clear/Reaper)
      const wv = this.endlessWave + 1, nextAt = (this.endlessWave + 1) * BALANCE.ENDLESS_BOSS_INTERVAL;
      const r = Math.max(0, nextAt - this.run.time), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
      label = `第 ${wv} 波　·　距首領 ${mm}:${ss.toString().padStart(2, '0')}` + (this.curses.length ? `　·　☠×${this.curses.length}` : '');   // R18/B7 curse stack
      hot = this.boss;
    }
    else if (this.reaperRef && !this.reaperRef.dead) { label = '☠ 死神戰'; hot = true; }
    else if (this.cleared) { const rem = Math.max(0, Math.ceil(this.reaperAt - this.run.time)); label = this.reaperSpawned ? '☠ 死神戰' : `通關！死神 ${rem}s　·　按 E 離場`; hot = true; }
    else if (this.finalBoss) { label = '最終決戰！'; hot = true; }
    else {
      const nextMini = this.miniIdx < BALANCE.MINIBOSS_TIMES.length ? BALANCE.MINIBOSS_TIMES[this.miniIdx] : null;
      const tgt = nextMini != null ? nextMini : LEVEL_TIME;
      const r = Math.max(0, tgt - this.run.time), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
      label = (nextMini != null ? '距小王 ' : '距最終首領 ') + `${mm}:${ss.toString().padStart(2, '0')}`;
    }
    uiText(label, view.W / 2, 42 * S, { size: 13 * S, align: 'center', color: hot ? P.redL : P.gray3, weight: '700' });
    if (this.boss && this.bossRef && !this.bossRef.dead) {
      const bw = Math.min(360 * S, view.W * 0.5);
      uiText((this.reaperRef && this.bossRef === this.reaperRef ? '☠ ' : this.finalBoss ? '★ ' : '') + this.bossRef.def.name, view.W / 2, 56 * S, { size: 13 * S, align: 'center', color: P.redL, weight: '800' });
      uiBar(view.W / 2 - bw / 2, 64 * S, bw, 9 * S, this.bossRef.hp / this.bossRef.maxHp, { fg: P.red, bg: '#2a0e14', border: P.ink, glow: true });
    } else if (this.activeTypes && this.activeTypes.length) {
      uiText('當前敵潮：' + this.activeTypes.map((d) => d.name).join('、'), view.W / 2, 54 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    }
  },

  // ---- info: hover tooltips + Tab build panel (R11) ------------------------
  drawInfo() {
    if (this.choice || this.equipChoice || this.eventChoice || this.dead || this.paused || settingsUI.open) return;
    const S = uiScale();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    if (this.showBuild) {
      this.drawBuildPanel(S);
      let hb = null;
      for (const ic of (this.buildIcons || [])) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hb = ic;
      if (hb) this.drawTooltip(hb, mx, my, S);
      return;
    }
    let hov = null;
    for (const ic of hudIcons) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hov = ic;
    if (hov) { this.drawTooltip(hov, mx, my, S); return; }
    // 原#8: hover over a world interactable (chest / well / soul / shrine / ground loot) to see its name + effect
    const wi = this.hoverWorldInfo(mx, my, S);
    if (wi) this.drawWorldTip(wi, mx, my, S);
    else uiText('Tab：build　·　B：商店　·　M：放大地圖' + (this.fusionReady ? '　·　✦ 可合成' : ''), view.W - 12 * S, view.H - 10 * S, { size: 10 * S, align: 'right', color: withAlpha(this.fusionReady ? P.goldL : '#fff', this.fusionReady ? 0.7 : 0.28) });
  },
  // 原#8: nearest hoverable world interactable to the cursor (screen-space hit test)
  hoverWorldInfo(mx, my, S) {
    const cands = [];
    for (const n of (this.npcs || [])) if (!n.used) cands.push({ x: n.x, y: n.y, name: n.kind === 'well' ? '祈願水井' : n.kind === 'shard' ? '魂晶礦脈' : n.kind === 'forge' ? '流浪鐵匠' : '迷途之魂', desc: n.kind === 'well' ? '飲下祝福，永久獲得一項隨機能力提升。' : n.kind === 'shard' ? '敲取魂晶礦，獲得大量魂晶。' : n.kind === 'forge' ? '流浪鐵匠免費替你打造一件裝備。' : '回收散落的魂力：金幣、經驗與生命。', color: n.kind === 'well' ? P.shardL : n.kind === 'forge' ? P.emberL : P.manaL });
    if (this.shrinePos && !this.shrineUsed) cands.push({ x: this.shrinePos.x, y: this.shrinePos.y, name: '祝福神龕', desc: '一次性祈福：隨機能力提升並獲得魂晶。', color: P.shardL });
    for (const pk of this.world.pickups) {
      if (pk.dead) continue;
      if (pk.type === 'chest' && (!pk.hidden || pk.revealed)) cands.push({ x: pk.x, y: pk.y, name: '寶箱', desc: '開啟可得裝備、道具或魂晶。', color: P.goldL });
      else if (pk.type === 'equip' && pk.def) cands.push({ x: pk.x, y: pk.y, name: pk.def.name + '（裝備）', desc: pk.def.desc || '', color: P.goldL });
      else if (pk.type === 'item' && pk.def) cands.push({ x: pk.x, y: pk.y, name: pk.def.name + '（道具）', desc: pk.def.desc || '', color: P.emberL });
    }
    let best = null, bd = (26 * S) * (26 * S);
    for (const c of cands) { const ss = worldToScreen(c.x, c.y); const d = (ss.x - mx) ** 2 + (ss.y - my) ** 2; if (d < bd) { bd = d; best = c; } }
    return best;
  },
  drawWorldTip(info, mx, my, S) {
    const W = 196 * S; const lines = []; let line = '';
    for (const ch of (info.desc || '')) { if (textWidth(line + ch, 10.5 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    const H = (28 + lines.length * 13) * S;
    let x = mx + 16 * S, y = my + 10 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.96), { radius: 6 * S, stroke: info.color || P.shardL, lw: 2 });
    uiText(info.name, x + 8 * S, y + 17 * S, { size: 12 * S, color: '#fff', weight: '800' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 31 * S + i * 13 * S, { size: 10.5 * S, color: P.gray4, weight: '500' }));
  },
  // 8.2: a coloured tag badge that doubles as the 羈絆 icon (gold=achieved / blue=接近 / gray=未達成).
  drawBondBadge(x, y, sz, b, pg, S) {
    const achieved = pg.level >= 1, near = !achieved && pg.count >= 1;
    const bg = achieved ? withAlpha(P.gold, 0.92) : near ? withAlpha('#28304e', 0.95) : withAlpha('#191c2c', 0.9);
    uiRect(x, y, sz, sz, bg, { radius: 4 * S, stroke: achieved ? P.goldL : near ? P.shardL : P.ink2, lw: 1.5 });
    uiText(b.tag, x + sz / 2, y + sz / 2 + 0.5 * S, { size: sz * 0.5, align: 'center', baseline: 'middle', color: achieved ? '#1a1404' : near ? '#dfe6ff' : P.gray3, weight: '900' });
    if (achieved) uiText(String(pg.level), x + sz - 1.5 * S, y + sz - 0.5 * S, { size: sz * 0.34, align: 'right', color: '#2a1d00', weight: '900', shadow: false });
  },
  // 8.2: rich 羈絆 hover tooltip — name, 需求, and every tier's effect (reached = bright).
  drawBondTooltip(ic, mx, my, S) {
    const b = ic.bond, pg = ic.prog || bondProgress(b, this.run, this.player);
    const achieved = pg.level >= 1;
    const W = 236 * S, H = (50 + b.tiers.length * 14) * S;
    let x = mx + 14 * S, y = my + 6 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: achieved ? P.goldL : P.shardL, lw: 2 });
    const tagCY = y + 8 * S + 9 * S;   // #8: vertical centre of the 18×18 tag box — name & tier align to it
    uiRect(x + 8 * S, y + 8 * S, 18 * S, 18 * S, withAlpha(achieved ? P.gold : '#2a2f4a', 0.95), { radius: 4 * S });
    uiText(b.tag, x + 17 * S, tagCY, { size: 11 * S, align: 'center', baseline: 'middle', color: achieved ? '#1a1404' : P.gray3, weight: '900' });
    uiText(b.name, x + 32 * S, tagCY, { size: 13 * S, baseline: 'middle', color: '#fff', weight: '800' });
    uiText('第 ' + pg.level + ' / ' + pg.max + ' 階', x + W - 8 * S, tagCY, { size: 10 * S, align: 'right', baseline: 'middle', color: achieved ? P.goldL : P.gray3, weight: '700' });
    uiText('需求：' + b.goal, x + 8 * S, y + 36 * S, { size: 10 * S, color: P.gray3, weight: '600' });
    b.tiers.forEach((t, k) => {
      const reached = pg.level >= k + 1, ty = y + 50 * S + k * 14 * S;
      uiText((reached ? '✓ ' : '· ') + '第 ' + (k + 1) + ' 階（達成 ' + t.at + '）', x + 8 * S, ty, { size: 9.5 * S, color: reached ? '#dfe6ff' : P.gray3, weight: '700' });
      uiText(t.bonusDesc, x + W - 8 * S, ty, { size: 9.5 * S, align: 'right', color: reached ? P.emberL : P.gray2, weight: '700' });
    });
  },
  drawTooltip(ic, mx, my, S) {
    if (ic.kind === 'bond') return this.drawBondTooltip(ic, mx, my, S);
    if (ic.kind === 'pickup') return this.drawPickupTooltip(ic, mx, my, S);
    if (ic.kind === 'patron') return this.drawPatronTooltip(ic, mx, my, S);
    const def = ic.def; if (!def) return;
    const accent = ic.kind === 'weapon' ? P.shardL : ic.kind === 'ability' ? (def.cursed ? P.redL : P.manaL) : ic.kind === 'equip' ? P.goldL : P.emberL;
    const sub = ic.kind === 'weapon' ? (def.evolved ? '★ 進化武器' : '武器 Lv.' + ic.level)
      : ic.kind === 'ability' ? ((def.cursed ? '詛咒被動' : '被動') + ' Lv.' + ic.level)
      : ic.kind === 'equip' ? ('裝備 · ' + (def.slot === 'weapon' ? '專武' : def.slot === 'armor' ? '護甲' : '飾品'))
      : ('道具 ' + (ic.slot || ''));
    const desc = (ic.kind === 'weapon' && def.levelDesc) ? def.levelDesc(ic.level) : (def.desc || '');
    // 10.4 (hover): a weapon's evolution path is shown here, on hover, instead of an always-on line.
    let evo = null;
    if (ic.kind === 'weapon' && !def.evolved && def.evolveInto) {
      const target = Weapons.get(def.evolveInto), req = def.evolveReq;
      const hasReq = !req || (this.run.abilityLevels && this.run.abilityLevels[req] > 0);
      const maxed = (ic.level || 1) >= weaponMaxLevel(def);
      const reqName = req ? ((Abilities.get(req) && Abilities.get(req).name) || req) : null;
      const ready = maxed && hasReq;
      evo = { text: '↓ 進化：' + (target ? target.name : '???') + (reqName ? '（需 ' + reqName + ' ' + (hasReq ? '✓' : '✗') + '）' : '') + (ready ? '　★ 即將進化！' : (maxed ? '' : ' · 需滿級')), col: ready ? P.goldL : (hasReq ? P.shardL : P.gray3) };
    } else if (ic.kind === 'weapon' && !def.evolved) {
      evo = { text: '（此武器無進化路線）', col: P.gray2 };
    }
    let W = 210 * S; const lines = []; let line = '';
    for (const ch of desc) { if (textWidth(line + ch, 11 * S, '500') > W - 16 * S && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    if (evo) W = Math.max(W, textWidth(evo.text, 10 * S, '700') + 16 * S);   // widen for a long evolution line
    const H = (34 + lines.length * 14) * S + (evo ? 16 * S : 0);
    let x = mx + 14 * S, y = my + 6 * S;
    if (x + W > view.W) x = view.W - W - 6 * S;
    if (y + H > view.H) y = view.H - H - 6 * S;
    uiRect(x, y, W, H, withAlpha('#10121f', 0.97), { radius: 6 * S, stroke: accent, lw: 2 });
    uiText(def.name || ic.id || '?', x + 8 * S, y + 16 * S, { size: 13 * S, color: RARITY[rarityOf(def)].accent, weight: '800' });   // R17/5.1: name reads its rarity
    uiText(sub, x + W - 8 * S, y + 16 * S, { size: 10 * S, align: 'right', color: accent, weight: '700' });
    lines.forEach((l, i) => uiText(l, x + 8 * S, y + 32 * S + i * 14 * S, { size: 11 * S, color: P.gray4, weight: '500' }));
    if (evo) uiText(evo.text, x + 8 * S, y + 32 * S + lines.length * 14 * S, { size: 10 * S, color: evo.col, weight: '700' });
  },
  drawBuildPanel(S) {
    const w = Math.min(view.W * 0.9, 640 * S), h = Math.min(view.H * 0.86, 500 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const bandTop = y + h - 108 * S;   // 8.2: reserved area for the 羈絆 three-state band
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.66));
    uiRect(x, y, w, h, withAlpha('#161a30', 0.98), { radius: 10 * S, stroke: P.ink2, lw: 2 });
    uiText('當前 BUILD', x + w / 2, y + 26 * S, { size: 18 * S, align: 'center', color: '#fff', weight: '900' });
    uiText('Tab 關閉　·　滑鼠移到圖示看說明', x + w / 2, y + 44 * S, { size: 11 * S, align: 'center', color: P.gray3 });
    this.buildIcons = [];
    const sz = 30 * S, gap = 6 * S;
    const head = (t, xx, yy, c, extra, ecol) => { uiText(t, xx, yy, { size: 13 * S, color: c, weight: '800' }); if (extra) uiText(extra, xx + textWidth(t, 13 * S, '800') + 10 * S, yy, { size: 11 * S, color: ecol || P.gray3, weight: '700' }); };
    const cell = (bx, by, sp, stroke, badge, bcol) => { uiRect(bx, by, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke, lw: 2 }); drawSpriteUI(sp.frames[0], bx + 3 * S, by + 3 * S, (sz - 6 * S) / sp.w); if (badge) uiText(badge, bx + sz - 3 * S, by + sz - 3 * S, { size: 9 * S, align: 'right', color: bcol, weight: '800' }); };
    // left column: weapons + passives
    const colL = x + 24 * S; let yL = y + 70 * S;
    const wCount = this.player.weapons.filter((w) => !w.def.equipped).length;
    head('武器', colL, yL, P.shardL, wCount + ' / ' + MAX_WEAPONS, wCount >= MAX_WEAPONS ? P.redL : P.gray3); yL += 14 * S;
    this.player.weapons.forEach((inst, i) => {
      const bx = colL + i * (sz + gap);
      cell(bx, yL, getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt')), inst.def.evolved ? P.goldL : P.ink2, inst.def.evolved ? '★' : 'L' + inst.level, inst.def.evolved ? P.goldL : P.shardL);
      this.buildIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'weapon', def: inst.def, level: inst.level });
    });
    yL += sz + 18 * S;   // 10.4: per-weapon evolution path now shown in the hover tooltip (drawTooltip), not as an always-on line
    const abils = this.run.abilities || [];
    head('被動', colL, yL, P.manaL, abils.length + ' / ' + MAX_PASSIVES, abils.length >= MAX_PASSIVES ? P.redL : P.gray3); yL += 14 * S;
    const perRow = 7;
    abils.slice(0, MAX_PASSIVES).forEach((id, i) => {
      const bx = colL + (i % perRow) * (sz + gap), by = yL + Math.floor(i / perRow) * (sz + gap);
      const a = Abilities.get(id); const stk = this.run.abilityLevels?.[id] || 1;
      cell(bx, by, getSprite(iconOr('ability_' + id, 'ability_power')), a && a.cursed ? P.redL : P.ink2, stk > 1 ? '×' + stk : '', P.goldL);
      if (a) this.buildIcons.push({ x: bx, y: by, w: sz, h: sz, kind: 'ability', id, def: a, level: stk });
    });
    // right column: equipment + stats
    const colR = x + w * 0.56; let yR = y + 70 * S;
    head('裝備', colR, yR, P.goldL); yR += 16 * S;
    const eq = this.run.equipment || {};
    [['weapon', '專武'], ['armor', '護甲'], ['trinket', '飾品']].forEach(([slot, label], i) => {
      const bx = colR + i * (sz + 18 * S);
      const id = eq[slot]; const d = id && Equipment.get(id);
      if (d) { cell(bx, yR, getSprite(iconOr(d.icon, 'equip_leather_armor')), P.goldL, '', ''); this.buildIcons.push({ x: bx, y: yR, w: sz, h: sz, kind: 'equip', def: d }); }
      else { uiRect(bx, yR, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke: P.ink2, lw: 2 }); uiText('—', bx + sz / 2, yR + sz / 2 + 4 * S, { size: 12 * S, align: 'center', color: P.gray2 }); }
      uiText(label, bx + sz / 2, yR + sz + 11 * S, { size: 9 * S, align: 'center', color: P.gray3 });
    });
    yR += sz + 32 * S;
    head('數值', colR, yR, P.emberL); yR += 16 * S;
    const st = this.player.stats;
    const stats = [['生命', Math.round(this.player.hp) + ' / ' + this.player.maxHp], ['傷害', '×' + st.damageMult.toFixed(2)], ['射速', '×' + st.fireRateMult.toFixed(2)], ['暴擊', Math.round(st.critChance * 100) + '%'], ['暴傷', '×' + (st.critMult || 2).toFixed(1)], ['移速', Math.round(st.speed)], ['減傷', String(st.defense || 0)], ['閃避', Math.round((st.dodge || 0) * 100) + '%'], ['吸血', Math.round((st.lifesteal || 0) * 100) + '%'], ['幸運', (st.luck || 0).toFixed(2)]];
    // R17 UI-sweep: compress the row pitch when the height-clamped panel can't fit all 10 rows
    // at 15S each (uiScale 1.5 silently dropped 吸血/幸運) — pitch floors at 11S, font follows.
    const stride = Math.max(11 * S, Math.min(15 * S, (bandTop - 8 * S - yR) / stats.length));
    const sFont = Math.min(11.5 * S, stride * 0.74);
    for (const [k, v] of stats) { if (yR > bandTop - 8 * S) break; uiText(k, colR, yR, { size: sFont, color: P.gray3, weight: '500' }); uiText(v, x + w - 24 * S, yR, { size: sFont, align: 'right', color: '#fff', weight: '700' }); yR += stride; }
    // 8.2 羈絆可見化：底部全寬三態總覽（金=已達成含階級 / 白=接近 / 灰=未達成）
    uiRect(x + 18 * S, bandTop, w - 36 * S, Math.max(1, S), withAlpha(P.ink2, 0.9));
    const pgList = BONDS.map((b) => bondProgress(b, this.run, this.player));   // live → header count + grid glyphs always agree (checkBonds is throttled)
    const achieved = BONDS.map((b, i) => ({ b, pg: pgList[i] })).filter((o) => o.pg.level >= 1);   // Tab 只列「已達成」
    head('羈絆', colL, bandTop + 16 * S, P.goldL, achieved.length + ' / ' + BONDS.length, P.gray3);
    if (!achieved.length) { uiText('尚未觸發任何羈絆 — 湊齊特定武器／被動組合即可啟動', colL, bandTop + 38 * S, { size: 10 * S, color: P.gray2, weight: '600' }); }
    else {
      const cols = 3, cellW = (w - 48 * S) / cols, gy = bandTop + 36 * S, rowH = 18 * S, bsz = 15 * S;
      achieved.forEach((o, i) => {
        const b = o.b, pg = o.pg;
        const cx2 = colL + (i % cols) * cellW, ry = gy + Math.floor(i / cols) * rowH, by = ry - bsz + 2 * S;
        this.drawBondBadge(cx2, by, bsz, b, pg, S);
        let nm = b.name + ' ' + pg.level + '/' + pg.max + '階';
        while (nm.length > 1 && textWidth(nm, 10 * S, '700') > cellW - bsz - 10 * S) nm = nm.slice(0, -1);
        uiText(nm, cx2 + bsz + 5 * S, ry, { size: 10 * S, color: P.goldL, weight: '700' });
        this.buildIcons.push({ x: cx2, y: by, w: cellW - 4 * S, h: rowH, kind: 'bond', bond: b, prog: pg });
      });
    }
  },

  drawBanner() {
    if (this.bannerT <= 0) return;
    const S = uiScale(); const a = Math.min(1, this.bannerT);
    // R17 UI-sweep: keep the 28S banner clear of the boss HP bar (bottom 73S) + patron strip (80S)
    uiText(this.banner, view.W / 2, Math.max(view.H * 0.2, 118 * S), { size: 28 * S, align: 'center', color: withAlpha('#ffe9a0', a), weight: '900', shadowColor: withAlpha('#000', a * 0.8) });
  },
  // G3: a cinematic letterbox recounting the current story chapter at run start
  drawStory() {
    const S = uiScale(); const st = this.story;
    const a = Math.min(1, Math.min((st.dur - st.t) / 0.6, st.t / 1.0));   // fade in 0.6s / out 1s
    if (a <= 0) return;
    const bandH = view.H * 0.34, by = view.H * 0.5 - bandH / 2;
    uiRect(0, by, view.W, bandH, withAlpha('#05060c', 0.82 * a));
    uiRect(0, by, view.W, 2 * S, withAlpha(P.shardL, 0.5 * a));
    uiRect(0, by + bandH - 2 * S, view.W, 2 * S, withAlpha(P.shardL, 0.5 * a));
    uiText(st.chapter ? ('第 ' + ((META.questIndex || 0) + 1) + ' 章') : (st.who || '角色'), view.W / 2, by + 22 * S, { size: 12 * S, align: 'center', color: withAlpha(P.shardL, a), weight: '700' });
    uiText(st.title, view.W / 2, by + 44 * S, { size: 24 * S, align: 'center', color: withAlpha(P.goldL, a), weight: '900', shadowColor: withAlpha('#000', a) });
    const reveal = Math.floor(Math.min(st.text.length, (st.dur - st.t) / 0.03));   // typewriter reveal
    this.wrapText(st.text.slice(0, reveal), view.W / 2, by + 76 * S, view.W * 0.7, 14 * S, withAlpha('#d8e0f0', a));
    if (st.quote) uiText('「' + st.quote + '」　— ' + (st.who || ''), view.W / 2, by + bandH - 34 * S, { size: 12.5 * S, align: 'center', color: withAlpha(P.shardL, a * 0.95), weight: '700' });   // 角色劇情: signature battle quote
    uiText('按 空白鍵 跳過', view.W / 2, by + bandH - 14 * S, { size: 11 * S, align: 'center', color: withAlpha('#fff', 0.4 * a) });
  },
};
