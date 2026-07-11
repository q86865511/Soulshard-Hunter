// hub/render_codex.js — 內容圖鑑面板（P1）。城鎮「圖鑑石碑」站點開啟；5 個分頁
// 【目標｜武器｜被動｜Boss｜配方】。已發現的正常繪製，未發現顯示剪影＋取得提示。
// 資料層 API 全來自 content/codex.js + content/goals.js（本檔只讀不寫）。
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { ctxRaw, drawSpriteUI, textWidth, uiBar, uiRect, uiText, view } from '../../../engine/renderer.js';
import { frameAt, getSprite } from '../../../engine/sprites.js';
import { allRecipes, codexCounts, isSeen, unlockHintFor } from '../../content/codex.js';
import { goalsFor } from '../../content/goals.js';
import { Abilities, Enemies, Weapons } from '../../content/registry.js';
import { META } from '../../state.js';
import { RARITY, rarityOf } from '../../progression.js';
import { inside } from './shared.js';

// UI 尺寸常數（僅本面板用，不進 BALANCE）— 皆為設計基準，繪製時再 ×S
const CODEX_CELL = 46;      // 圖示格基準邊長
const CODEX_DETAIL = 74;    // 底部詳情帶高度
const SILHOUETTE = '#1a2333';   // 未發現條目剪影染色（暗魂晶藍）

export const renderCodexMixin = {

  // ---- tabs ----------------------------------------------------------------
  codexTabRects(f) {
    const S = f.S, c = codexCounts();
    const labels = ['目標', '武器 ' + c.w[0] + '/' + c.w[1], '被動 ' + c.a[0] + '/' + c.a[1], 'Boss ' + c.boss[0] + '/' + c.boss[1], '配方 ' + c.rec[0] + '/' + c.rec[1]];
    const y = f.y + 60 * S, h = 24 * S, gap = 6 * S; let x = f.x + 24 * S;
    return labels.map((label, i) => { const w = Math.max(58 * S, textWidth(label, 11 * S, '800') + 18 * S); const r = { label, i, x, y, w, h }; x += w + gap; return r; });
  },

  // ---- grid data (武器/被動/Boss) ------------------------------------------
  codexEntries(tab) {
    if (tab === 1) return Weapons.all().map((d) => ({ kind: 'w', id: d.id, def: d, icon: 'weapon_' + d.id }));   // 含進化武器
    if (tab === 2) return Abilities.all().map((d) => ({ kind: 'a', id: d.id, def: d, icon: 'ability_' + d.id }));
    if (tab === 3) return Enemies.all().filter((d) => d.boss).map((d) => ({ kind: 'boss', id: d.id, def: d, icon: d.sprite }));
    return [];
  },
  codexGrid(f, tab) {
    const S = f.S;
    const top = f.y + 92 * S;
    const detailH = CODEX_DETAIL * S;
    const gridBot = f.y + f.h - detailH - 16 * S;
    const padX = 24 * S, gap = 8 * S, cell = CODEX_CELL * S;
    const avail = f.w - padX * 2;
    const cols = Math.max(6, Math.min(10, Math.floor((avail + gap) / (cell + gap))));
    const cw = (avail - gap * (cols - 1)) / cols;   // stretch to fill the row
    const entries = this.codexEntries(tab);
    const cells = entries.map((e, i) => ({ ...e, i, x: f.x + padX + (i % cols) * (cw + gap), y: top + Math.floor(i / cols) * (cw + gap) - (this.panelScroll || 0), w: cw, h: cw }));
    const rows = Math.ceil(entries.length / cols) || 1;
    const bottom = top + rows * (cw + gap);
    return { cells, top, gridBot, detailH, cols, cw, bottom };
  },

  // ---- update --------------------------------------------------------------
  updateCodex(mx, my) {
    const f = this.panelFrame();
    if (mouse.justDown) {
      for (const tb of this.codexTabRects(f)) if (inside(mx, my, tb)) { if ((this.codexTab || 0) !== tb.i) { this.codexTab = tb.i; this.panelScroll = 0; this.codexSel = null; } Sfx.play('uiClick'); return; }
    }
    const tab = this.codexTab || 0;
    if (tab >= 1 && tab <= 3 && mouse.justDown) {
      const L = this.codexGrid(f, tab);
      for (const c of L.cells) { if (c.y + c.h < L.top - 6 * f.S || c.y > L.gridBot) continue; if (inside(mx, my, c)) { this.codexSel = c.i; Sfx.play('uiClick'); return; } }
    }
  },

  // ---- draw ----------------------------------------------------------------
  drawCodex() {
    const f = this.drawPanelFrame('圖 鑑 石 碑', '記錄你已發現的武器 · 被動 · Boss 與進化配方');
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const tb of this.codexTabRects(f)) {
      const on = (this.codexTab || 0) === tb.i, hov = inside(mx, my, tb);
      uiRect(tb.x, tb.y, tb.w, tb.h, withAlpha(on ? '#243a5a' : (hov ? '#1f2740' : '#1b2138'), 0.96), { radius: 6 * S, stroke: on ? P.shardL : P.ink2, lw: on ? 2 : 1 });
      uiText(tb.label, tb.x + tb.w / 2, tb.y + tb.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: on ? '#fff' : P.gray3, weight: '800' });
    }
    const tab = this.codexTab || 0;
    if (tab === 0) this.drawCodexGoals(f);
    else if (tab === 4) this.drawCodexRecipes(f);
    else this.drawCodexGrid(f, tab);
    uiText('點擊圖示查看詳情　·　滾輪捲動　·　Esc 關閉', f.x + f.w / 2, f.y + f.h - 14 * S, { size: 11 * S, align: 'center', color: P.gray3 });
  },

  // ---- 目標分頁（預設）------------------------------------------------------
  drawCodexGoals(f) {
    const S = f.S; const goals = goalsFor(META);
    this.panelMaxScroll = 0;   // ≤3 卡片，無需捲動
    const top = f.y + 98 * S, padX = 24 * S, cardH = 60 * S, gap = 12 * S;
    if (!goals.length) { uiText('目前沒有推薦目標，自由探索吧', f.x + f.w / 2, top + 46 * S, { size: 13 * S, align: 'center', color: P.gray3, weight: '700' }); return; }
    goals.forEach((g, i) => {
      const x = f.x + padX, y = top + i * (cardH + gap), w = f.w - padX * 2;
      uiRect(x, y, w, cardH, withAlpha('#1b2138', 0.95), { radius: 8 * S, stroke: withAlpha(P.shardL, 0.5), lw: 1.5 });
      uiText(g.icon || '•', x + 22 * S, y + cardH / 2 + 1 * S, { size: 26 * S, align: 'center', baseline: 'middle', shadow: false });
      uiText(g.title, x + 48 * S, y + 24 * S, { size: 14.5 * S, color: '#fff', weight: '800' });
      this.clip1(g.desc || '', x + 48 * S, y + 41 * S, w - 66 * S, 11 * S, P.gray3);
      uiBar(x + 48 * S, y + cardH - 12 * S, w - 72 * S, 5 * S, g.frac || 0, { fg: P.shardL, bg: '#16183a', border: P.ink });
    });
  },

  // ---- 武器 / 被動 / Boss 分頁（格狀圖示 + 底部詳情帶）----------------------
  drawCodexGrid(f, tab) {
    const S = f.S; const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const L = this.codexGrid(f, tab);
    this.panelMaxScroll = Math.max(0, L.bottom - L.gridBot);
    const clipTop = L.top - 6 * S;
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, clipTop, f.w, L.gridBot - clipTop); ctx.clip();
    let hovered = null;
    for (const c of L.cells) {
      if (c.y + c.h < clipTop || c.y > L.gridBot) continue;
      const seen = isSeen(c.kind, c.id);
      const hov = inside(mx, my, c) && my > clipTop && my < L.gridBot;
      if (hov) hovered = c;
      const selOn = this.codexSel === c.i;
      uiRect(c.x, c.y, c.w, c.h, withAlpha(seen ? '#1b2138' : '#12151f', 0.95), { radius: 6 * S, stroke: selOn ? P.goldL : (hov ? P.shardL : (seen ? P.ink2 : '#20242f')), lw: (selOn || hov) ? 2 : 1 });
      const sp = getSprite(c.icon);
      if (sp && !sp.missing) {
        const sc = Math.min((c.w - 10 * S) / sp.w, (c.h - 10 * S) / sp.h);
        const dx = c.x + (c.w - sp.w * sc) / 2, dy = c.y + (c.h - sp.h * sc) / 2;
        if (seen) drawSpriteUI(frameAt(sp, this.t), dx, dy, sc);
        else drawSpriteUI(sp.frames[0], dx, dy, sc, { tint: SILHOUETTE, alpha: 0.9 });
      } else if (!seen) {
        uiText('?', c.x + c.w / 2, c.y + c.h / 2 + 4 * S, { size: 18 * S, align: 'center', baseline: 'middle', color: '#2a3040', weight: '900' });
      }
    }
    ctx.restore();
    this.drawScrollbar(f);
    this.drawCodexDetail(f, L, hovered);
  },
  drawCodexDetail(f, L, hovered) {
    const S = f.S;
    const sel = hovered || (this.codexSel != null ? L.cells.find((c) => c.i === this.codexSel) : null) || L.cells[0];
    const by = f.y + f.h - L.detailH - 8 * S, bx = f.x + 24 * S, bw = f.w - 48 * S;
    uiRect(bx, by, bw, L.detailH, withAlpha('#10131f', 0.95), { radius: 8 * S, stroke: P.ink2, lw: 1.5 });
    if (!sel) return;
    const seen = isSeen(sel.kind, sel.id), def = sel.def;
    const isz = L.detailH - 20 * S;
    uiRect(bx + 10 * S, by + 10 * S, isz, isz, withAlpha('#1b2138', 0.9), { radius: 6 * S, stroke: P.ink2, lw: 1 });
    const sp = getSprite(sel.icon);
    if (sp && !sp.missing) {
      const sc = Math.min((isz - 8 * S) / sp.w, (isz - 8 * S) / sp.h);
      const dx = bx + 10 * S + (isz - sp.w * sc) / 2, dy = by + 10 * S + (isz - sp.h * sc) / 2;
      if (seen) drawSpriteUI(frameAt(sp, this.t), dx, dy, sc);
      else drawSpriteUI(sp.frames[0], dx, dy, sc, { tint: SILHOUETTE, alpha: 0.9 });
    } else if (!seen) uiText('?', bx + 10 * S + isz / 2, by + 10 * S + isz / 2 + 5 * S, { size: 22 * S, align: 'center', baseline: 'middle', color: '#2a3040', weight: '900' });
    const tx = bx + isz + 22 * S, tw = bw - isz - 34 * S;
    if (seen) {
      const rar = sel.kind === 'boss' ? null : RARITY[rarityOf(def, sel.kind === 'w' ? 'weapon' : 'ability')];
      const name = def.name || sel.id;
      uiText(name, tx, by + 26 * S, { size: 15 * S, color: rar ? rar.accent : P.redL, weight: '900' });
      if (rar) {   // 稀有度色框
        const nw = textWidth(name, 15 * S, '900'), tagW = textWidth(rar.tag, 10 * S, '800') + 14 * S;
        uiRect(tx + nw + 10 * S, by + 14 * S, tagW, 16 * S, withAlpha(rar.bg, 0.9), { radius: 4 * S, stroke: rar.accent, lw: 1 });
        uiText(rar.tag, tx + nw + 10 * S + tagW / 2, by + 22.5 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: rar.accent, weight: '800' });
      }
      this.codexDesc(def.desc || '', tx, by + 45 * S, tw, 12 * S);
    } else {
      uiText('？？？', tx, by + 26 * S, { size: 15 * S, color: P.gray2, weight: '900' });
      uiText(unlockHintFor(sel.kind, sel.id), tx, by + 47 * S, { size: 12 * S, color: P.shardL, weight: '700' });
    }
  },

  // ---- 配方分頁 ------------------------------------------------------------
  drawCodexRecipes(f) {
    const S = f.S; const recipes = allRecipes();
    const top = f.y + 96 * S, padX = 24 * S, rowH = 48 * S, gap = 8 * S;
    const gridBot = f.y + f.h - 22 * S, clipTop = top - 6 * S;
    this.panelMaxScroll = Math.max(0, top + recipes.length * (rowH + gap) - gridBot);
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(f.x, clipTop, f.w, gridBot - clipTop); ctx.clip();
    const drawMini = (icon, cx, cy, seenIt) => {
      const sp = getSprite(icon); if (!sp || sp.missing) return;
      const sc = Math.min((34 * S) / sp.w, (34 * S) / sp.h), dy = cy - sp.h * sc / 2;
      if (seenIt) drawSpriteUI(frameAt(sp, this.t), cx, dy, sc);
      else drawSpriteUI(sp.frames[0], cx, dy, sc, { tint: SILHOUETTE, alpha: 0.85 });
    };
    recipes.forEach((rc, i) => {
      const y = top + i * (rowH + gap) - (this.panelScroll || 0);
      if (y + rowH < clipTop || y > gridBot) return;
      const x = f.x + padX, w = f.w - padX * 2, cy = y + rowH / 2;
      const known = isSeen('rec', rc.baseId);           // 配方已發現（曾進化成功）
      const baseKnown = known || isSeen('w', rc.baseId); // 未發現時，僅當基底武器曾取得才揭露左側
      uiRect(x, y, w, rowH, withAlpha(known ? '#1b2138' : '#12151f', 0.95), { radius: 7 * S, stroke: known ? withAlpha(P.goldL, 0.5) : '#20242f', lw: 1 });
      const base = Weapons.get(rc.baseId), evo = Weapons.get(rc.evoId), req = rc.reqId ? Abilities.get(rc.reqId) : null;
      // 左側：基底武器
      drawMini('weapon_' + rc.baseId, x + 10 * S, cy, baseKnown);
      uiText(baseKnown ? ((base && base.name) || '？') : '？？？', x + 50 * S, y + 20 * S, { size: 12.5 * S, color: baseKnown ? '#fff' : P.gray2, weight: '800' });
      // 需求被動：進化結果與需求在未發現時永不顯示
      if (known && req) uiText('＋ ' + req.name, x + 50 * S, y + 36 * S, { size: 10.5 * S, color: P.manaL, weight: '700' });
      else if (!known) uiText('＋ ？？？', x + 50 * S, y + 36 * S, { size: 10.5 * S, color: P.gray3, weight: '700' });
      // 箭頭
      uiText('→', x + w * 0.5, cy + 5 * S, { size: 18 * S, align: 'center', baseline: 'middle', color: known ? P.goldL : P.gray2, weight: '900' });
      // 右側：進化結果
      if (known) { drawMini('weapon_' + rc.evoId, x + w - 190 * S, cy, true); uiText((evo && evo.name) || '？', x + w - 150 * S, cy + 5 * S, { size: 13 * S, baseline: 'middle', color: P.goldL, weight: '900' }); }
      else uiText('？？？', x + w - 150 * S, cy + 5 * S, { size: 13 * S, baseline: 'middle', color: P.gray2, weight: '900' });
    });
    ctx.restore();
    this.drawScrollbar(f);
  },

  // 詳情帶用的 2 行截斷描述
  codexDesc(str, x, y, maxw, size) {
    let line = '', yy = y, rows = 0;
    for (const ch of (str || '')) {
      if (textWidth(line + ch, size, '600') > maxw && line) {
        if (rows >= 1) { while (line.length > 1 && textWidth(line + '…', size, '600') > maxw) line = line.slice(0, -1); uiText(line + '…', x, yy, { size, color: P.gray3, weight: '600' }); return; }
        uiText(line, x, yy, { size, color: P.gray3, weight: '600' }); line = ch; yy += size + 4; rows++;
      } else line += ch;
    }
    if (line) uiText(line, x, yy, { size, color: P.gray3, weight: '600' });
  },
};
