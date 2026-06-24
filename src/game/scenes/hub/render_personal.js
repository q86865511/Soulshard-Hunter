// hub/render_personal.js — render_personal methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { BIOMES } from '../../../art/biomes.js';
import { mouse } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { ctxRaw, drawSpriteUI, textWidth, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite } from '../../../engine/sprites.js';
import { ACHIEVEMENTS } from '../../content/achievements.js';
import { BONDS } from '../../content/bonds.js';
import { SKINS, skinnedSprite } from '../../content/characters.js';
import { dailyChallenge, mutatorById } from '../../content/daily.js';
import { guildProgress } from '../../content/guild.js';
import { Characters, Weapons } from '../../content/registry.js';
import { META } from '../../state.js';
import { goldLabel } from '../../ui/gold.js';
import { inside } from './shared.js';

export const renderPersonalMixin = {

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
    if ((this.personalTab || 0) === 2) { this.drawRoomTab(f); return; }   // R18/B10
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
    this.drawScrollbar(f);   // QA B12: bond codex set panelMaxScroll but never drew the scrollbar
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
