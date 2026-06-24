// run/overlays.js — overlays methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { BIOMES } from '../../../art/biomes.js';
import { Sfx } from '../../../engine/audio.js';
import { mouse } from '../../../engine/input.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { ctxRaw, drawSpriteUI, goldStr, textWidth, uiClipRound, uiRect, uiScale, uiText, view } from '../../../engine/renderer.js';
import { getSprite, iconOr } from '../../../engine/sprites.js';
import { Cheats } from '../../cheats.js';
import { BONDS, activeBonds, bondAdvancedBy, bondProgress } from '../../content/bonds.js';
import { Abilities, Equipment } from '../../content/registry.js';
import { cheatUnlockAll } from '../../content/unlocks.js';
import { CHOICE_TYPE, choiceStyle } from '../../progression.js';
import { META, saveMeta } from '../../state.js';
import { inside } from './shared.js';

export const overlaysMixin = {

  // ---- hidden dev cheat panel (F2) ----------------------------------------
  cheatButtons() {
    const S = uiScale();
    const w = 98 * S, h = 22 * S, gap = 5 * S, x = view.W - w - 8 * S;
    let y = 122 * S;
    const items = [
      { id: 'god', label: (Cheats.godmode ? '✓ ' : '') + '無敵' },
      { id: 'fast', label: (Cheats.fast ? '✓ ' : '') + '加速 ×3' },
      { id: 'gold', label: '+金幣/魂晶' },
      { id: 'level', label: '升等' },
      { id: 'spawn', label: '刷怪' },
      { id: 'kill', label: '殺光雜兵' },
      { id: 'unlock', label: '解鎖全部' },
      { id: 'clear', label: '強制通關' },
    ];
    return items.map((it) => { const r = { ...it, x, y, w, h }; y += h + gap; return r; });
  },
  cheatInput() {
    if (!mouse.justDown) return;
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const b of this.cheatButtons()) if (inside(mx, my, b)) { this.doCheat(b.id); break; }
  },
  doCheat(id) {
    Sfx.play('uiClick');
    const w = this.world;
    if (id === 'god') Cheats.godmode = !Cheats.godmode;
    else if (id === 'fast') Cheats.fast = !Cheats.fast;
    else if (id === 'gold') { this.run.gold += 1000; this.run.shards += 100; this.banner = '作弊：+1000 金幣 / +100 魂晶'; this.bannerT = 1.4; }
    else if (id === 'level') { this.levelQueue++; }
    else if (id === 'spawn') { for (let i = 0; i < 8; i++) w.spawnRing(this.pickSpawnType(), { hpScale: this.diffMul, dmgScale: this.diffMul }); }
    else if (id === 'kill') { for (const e of w.enemies) if (!e.boss) e.dead = true; this.banner = '作弊：清場'; this.bannerT = 1.2; }
    else if (id === 'unlock') { cheatUnlockAll(META); saveMeta(); this.banner = '作弊：已解鎖全部內容與關卡'; this.bannerT = 1.6; }
    else if (id === 'clear') { if (!this.cleared) this.clearLevel(); }
  },
  drawCheatPanel() {
    const S = uiScale();
    if (Cheats.toast > 0) uiText('☠ 開發者模式 ' + (Cheats.enabled ? '開啟' : '關閉'), view.W / 2, view.H * 0.12, { size: 18 * S, align: 'center', color: P.goldL, weight: '900' });
    if (!Cheats.enabled) return;
    const btns = this.cheatButtons();
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    uiText('☠ DEV', btns[0].x + btns[0].w / 2, btns[0].y - 9 * S, { size: 10 * S, align: 'center', color: P.redL, weight: '800' });
    for (const b of btns) {
      const hov = inside(mx, my, b);
      const on = (b.id === 'god' && Cheats.godmode) || (b.id === 'fast' && Cheats.fast);
      uiRect(b.x, b.y, b.w, b.h, withAlpha(on ? '#2a5a3a' : (hov ? '#3a2a4a' : '#1a1430'), 0.95), { radius: 5 * S, stroke: on ? P.greenL : hov ? P.goldL : P.ink2, lw: 1.5 });
      uiText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#fff', weight: '700' });
    }
  },

  drawWon() {
    const S = uiScale(); const a = Math.min(0.9, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b1a0d', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('關 卡 通 關！', cx, view.H * 0.11, { size: 36 * S, align: 'center', color: P.goldL, weight: '900' });
    const idx = BIOMES.findIndex((b) => b.id === this.run.biomeId);
    const nextName = idx >= 0 && idx + 1 < BIOMES.length ? BIOMES[idx + 1].name : null;
    const lines = [
      `${this.map.biome.name} · 難度 ${this.run.difficulty || 1} 通關　·　擊殺 ${this.run.kills}　·　分數 ${this.run.score}`,
      this.reaperSlain ? '☠ 斬殺死神！傳說獎勵已入袋' : '死神未斬 — 下次留下迎戰可得傳說獎勵',
      (nextName ? `★ 解鎖新關卡：${nextName}　` : '★ 已是最深關卡　') + `· 難度 ${(this.run.difficulty || 1) + 1} 已解鎖　· 帶回 ${goldStr(this.run.gold)}`,   // R17/10.2 wording
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.11 + (40 + i * 20) * S, { size: 13 * S, align: 'center', color: i === 1 ? (this.reaperSlain ? P.goldL : P.gray3) : '#d8e8d0', weight: i === 2 ? '800' : '600' }));
    if (this.run.bankRepaid > 0) uiText('🏦 銀行還款 -' + goldStr(this.run.bankRepaid) + (META.bank && META.bank.debt > 0 ? '（尚欠 ' + goldStr(META.bank.debt) + '）' : ''), cx, view.H * 0.11 + (40 + lines.length * 20) * S, { size: 12 * S, align: 'center', color: P.emberL, weight: '700' });   // 7.2
    // R17 UI-sweep: anchor the panel BELOW the header block — at uiScale 1.5 the fixed 0.28H top occluded the 3rd line + bank-repaid line
    this.drawResultSummary(Math.max(view.H * 0.28, view.H * 0.11 + (40 + (lines.length + (this.run.bankRepaid > 0 ? 1 : 0)) * 20 + 12) * S));
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.95, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  drawDeath() {
    const S = uiScale(); const a = Math.min(0.88, this.deathT * 0.9);
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', a));
    if (this.deathT < 0.3) return;
    const cx = view.W / 2;
    uiText('探 索 結 束', cx, view.H * 0.11, { size: 36 * S, align: 'center', color: P.redL, weight: '900' });
    const mins = Math.floor(this.run.time / 60), secs = Math.floor(this.run.time % 60);
    const lines = [
      `抵達威脅 ${this.run.stage}　·　存活 ${mins}:${secs.toString().padStart(2, '0')}　·　擊殺 ${this.run.kills}`,
      `本局分數 ${this.run.score}` + (this.run.score >= (META.stats.bestScore || 0) ? '　★ 新紀錄！' : `（最佳 ${META.stats.bestScore || 0}）`) + `　·　帶回 ${goldStr(this.run.gold)}`,
    ];
    lines.forEach((l, i) => uiText(l, cx, view.H * 0.11 + (40 + i * 20) * S, { size: 13 * S, align: 'center', color: i === 1 ? P.goldL : '#d8def0', weight: i === 1 ? '800' : '600' }));
    if (this.run.bankRepaid > 0) uiText('🏦 銀行還款 -' + goldStr(this.run.bankRepaid) + (META.bank && META.bank.debt > 0 ? '（尚欠 ' + goldStr(META.bank.debt) + '）' : ''), cx, view.H * 0.11 + (40 + lines.length * 20) * S, { size: 12 * S, align: 'center', color: P.emberL, weight: '700' });   // 7.2
    // R17 UI-sweep: anchor below the header block (see drawWon)
    this.drawResultSummary(Math.max(view.H * 0.26, view.H * 0.11 + (40 + (lines.length + (this.run.bankRepaid > 0 ? 1 : 0)) * 20 + 12) * S));
    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 返回城鎮', cx, view.H * 0.95, { size: 15 * S, align: 'center', color: withAlpha('#ffd479', 0.5 + blink * 0.5), weight: '700' });
  },

  // 原#1/#13/#16: results-screen build (hover for details) + damage ranking + bonds + unlocks
  drawResultSummary(topY) {
    const S = uiScale();
    const w = Math.min(view.W * 0.94, 720 * S), h = Math.min(view.H * 0.62, 430 * S, view.H * 0.93 - topY);   // R17/1.6 taller; UI-sweep: never past the 0.95H hint when topY is pushed down
    const x = (view.W - w) / 2, y = topY;
    uiRect(x, y, w, h, withAlpha('#0e1322', 0.92), { radius: 8 * S, stroke: P.ink2, lw: 2 });
    // R17/1.6: one shared rhythm for the whole left column — header → HEAD_DROP → icon rows → SEC_GAP
    const sz = 26 * S, gap = 6 * S, SEC_GAP = 16 * S, HEAD_DROP = 13 * S;
    this.resultIcons = [];
    const cell = (bx, by, sp, stroke, badge, bcol) => { uiRect(bx, by, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke, lw: 2 }); drawSpriteUI(sp.frames[0], bx + 3 * S, by + 3 * S, (sz - 6 * S) / sp.w); if (badge) uiText(badge, bx + sz - 3 * S, by + sz - 3 * S, { size: 9 * S, align: 'right', color: bcol, weight: '800' }); };
    // LEFT — build (hover any icon for its effect)
    // R17 B15: clip the column above the「★ 本局解鎖」strip — a maxed build at high uiScale
    // could otherwise run its bond rows straight through the bottom strip.
    const ctxL = ctxRaw(); ctxL.save(); ctxL.beginPath(); ctxL.rect(x, y, w * 0.47, h - 46 * S); ctxL.clip();
    const colL = x + 18 * S; let yL = y + 24 * S;
    uiText('本局配置', colL, yL, { size: 13 * S, color: P.shardL, weight: '800' });
    uiText('滑鼠移到圖示看效果', colL + 86 * S, yL, { size: 9.5 * S, color: P.gray3 }); yL += SEC_GAP;
    uiText('武器', colL, yL, { size: 10 * S, color: P.gray3 }); yL += HEAD_DROP;
    this.player.weapons.forEach((inst, i) => { const bx = colL + i * (sz + gap); cell(bx, yL, getSprite(iconOr(inst.def.icon, 'weapon_w_soulbolt')), inst.def.evolved ? P.goldL : P.ink2, inst.def.evolved ? '★' : 'L' + inst.level, inst.def.evolved ? P.goldL : P.shardL); this.resultIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'weapon', def: inst.def, level: inst.level }); });
    yL += sz + SEC_GAP;
    const abils = this.run.abilities || [];
    uiText('被動 ×' + abils.length, colL, yL, { size: 10 * S, color: P.manaL }); yL += HEAD_DROP;
    const per = 8; abils.slice(0, 16).forEach((id, i) => { const bx = colL + (i % per) * (sz + gap), by = yL + Math.floor(i / per) * (sz + gap); const ab = Abilities.get(id); const stk = (this.run.abilityLevels && this.run.abilityLevels[id]) || 1; cell(bx, by, getSprite(iconOr('ability_' + id, 'ability_power')), ab && ab.cursed ? P.redL : P.ink2, stk > 1 ? '×' + stk : '', P.goldL); if (ab) this.resultIcons.push({ x: bx, y: by, w: sz, h: sz, kind: 'ability', id, def: ab, level: stk }); });
    yL += (Math.ceil(Math.min(abils.length, 16) / per) || 1) * (sz + gap) - gap + SEC_GAP;
    const eq = this.run.equipment || {};
    uiText('裝備', colL, yL, { size: 10 * S, color: P.goldL }); yL += HEAD_DROP;   // R17/1.6: own row, same rhythm as the others
    [['weapon'], ['armor'], ['trinket']].forEach(([slot], i) => { const bx = colL + i * (sz + gap); const d = eq[slot] && Equipment.get(eq[slot]); if (d) { cell(bx, yL, getSprite(iconOr(d.icon, 'equip_leather_armor')), P.goldL, '', ''); this.resultIcons.push({ x: bx, y: yL, w: sz, h: sz, kind: 'equip', def: d }); } else { uiRect(bx, yL, sz, sz, withAlpha('#10121f', 0.82), { radius: 4 * S, stroke: P.ink2, lw: 1 }); uiText('—', bx + sz / 2, yL + sz / 2 + 4 * S, { size: 11 * S, align: 'center', color: P.gray2 }); } });
    yL += sz + SEC_GAP;
    // bonds (原#13 + 8.2: 圖示徽章 + hover 看各階效果)
    // R17 UI-sweep: with a maxed build at high uiScale the section LABEL landed exactly on the
    // clip seam over「★ 本局解鎖」— skip the whole section when there's no room for label + a row.
    const bonds = activeBonds(this.run);
    if (bonds.length && yL + HEAD_DROP + 20 * S <= y + h - 50 * S) {
      uiText('羈絆', colL, yL, { size: 10 * S, color: P.goldL, weight: '800' }); yL += HEAD_DROP;
      const bsz = 18 * S, bgap = 4 * S, bx0 = colL, maxX = colL + w * 0.46;
      let bx = bx0, by = yL;
      for (const gb of bonds) {
        if (bx + bsz > maxX) { bx = bx0; by += bsz + bgap; }
        const pg = bondProgress(gb.bond, this.run, this.player);
        this.drawBondBadge(bx, by, bsz, gb.bond, pg, S);
        this.resultIcons.push({ x: bx, y: by, w: bsz, h: bsz, kind: 'bond', bond: gb.bond, prog: pg });
        bx += bsz + bgap;
      }
      yL = by + bsz + SEC_GAP;
    }
    ctxL.restore();   // R17 B15: end left-column clip
    // RIGHT — damage ranking (原#16)
    const colR = x + w * 0.47; let yR = y + 24 * S; const rw = w * 0.5 - 18 * S;
    uiText('傷害排行', colR, yR, { size: 13 * S, color: P.emberL, weight: '800' });
    uiText('來源 · 佔比', x + w - 18 * S, yR, { size: 9.5 * S, align: 'right', color: P.gray3 }); yR += 18 * S;
    const dmgEntries = Object.entries(this.run.dmgBySource || {}).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]);
    const total = dmgEntries.reduce((s, e) => s + e[1], 0) || 1;
    const maxV = dmgEntries.length ? dmgEntries[0][1] : 1;
    const fmtDmg = (v) => v >= 10000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));
    if (!dmgEntries.length) uiText('（本局無傷害紀錄）', colR, yR, { size: 11 * S, color: P.gray3 });
    dmgEntries.slice(0, 9).forEach(([name, v], i) => {
      if (yR > y + h - 30 * S) return;
      const frac = v / maxV, pct = Math.round((v / total) * 100);
      const rankCol = i === 0 ? P.goldL : i === 1 ? P.shardL : i === 2 ? P.emberL : '#cfd6ee';
      uiRect(colR, yR + 2 * S, rw, 13 * S, withAlpha('#15192c', 0.85), { radius: 3 * S });
      uiRect(colR, yR + 2 * S, rw * frac, 13 * S, withAlpha(rankCol, 0.3), { radius: 3 * S });
      uiText((i + 1) + '. ' + name, colR + 5 * S, yR + 11 * S, { size: 10.5 * S, color: '#fff', weight: i === 0 ? '800' : '600' });
      uiText(fmtDmg(v) + ' · ' + pct + '%', colR + rw - 5 * S, yR + 11 * S, { size: 10 * S, align: 'right', color: rankCol, weight: '700' });
      yR += 17 * S;
    });
    // unlocks — bottom strip
    const un = this.newlyUnlocked || [], nc = this.newCharacters || [];
    let oy = y + h - 40 * S;
    uiText('★ 本局解鎖', colL, oy, { size: 12 * S, color: P.goldL, weight: '800' }); oy += 15 * S;
    const items = [];
    for (const ac of un) items.push('成就「' + (ac.realName || ac.name) + '」' + (ac.rewardLabel ? ' → ' + ac.rewardLabel : ''));
    for (const c of nc) items.push('角色「' + c.name + '」');
    if (!items.length) uiText('（本局沒有新解鎖）', colL + 4 * S, oy, { size: 11 * S, color: P.gray3 });
    else { items.slice(0, 2).forEach((t, i) => this.clipShop(t, colL + 4 * S, oy + i * 13 * S, w - 40 * S, 11 * S)); if (items.length > 2) uiText('…等 ' + items.length + ' 項', x + w - 18 * S, oy, { size: 10 * S, align: 'right', color: P.gray3 }); }
    // hover tooltip over any build icon (原#16: 滑鼠看效果)
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    let hov = null; for (const ic of this.resultIcons) if (inside(mx, my, ic)) hov = ic;
    if (hov) this.drawTooltip(hov, mx, my, S);
  },

  wrapText(str, cx, y, maxw, size, color = '#c8cfe8') {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '600') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, cx, y + i * (size + 3), { size, align: 'center', color, weight: '600' }));
    return lines.length;
  },

  // 8.2 羈絆可見化：找出「選這張卡會推進哪些羈絆」(TFT 式)，依接近完成度排序。
  bondHintsFor(choice) {
    const out = [];
    for (const b of BONDS) {
      const h = bondAdvancedBy(b, choice, this.run, this.player);
      if (h) out.push({ b, h, prog: bondProgress(b, this.run, this.player) });
    }
    out.sort((a, x) => (x.h.toLevel - a.h.toLevel) || (x.prog.count - a.prog.count));
    return out;
  },
  // Draw the 羈絆 detail block pinned to the bottom of a choice card.
  drawCardBonds(r, oy, S, hints) {
    if (!hints.length) return;
    const top = hints[0], b = top.b, h = top.h, pg = top.prog;
    const innerW = r.w - 24 * S;
    if (r.h < 190 * S) {   // tiny card: one-line compact hint, avoids overlapping the name
      const by = r.y + oy + r.h - 18 * S;
      uiRect(r.x + 6 * S, by, r.w - 12 * S, 16 * S, withAlpha('#0c0e1a', 0.94), { radius: 5 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1 });
      let s = '★ ' + b.name + ' 第' + h.toLevel + '/' + h.max + '階 · ' + (h.crosses ? '解鎖 ' : '推進 ') + (h.toward ? h.toward.bonusDesc : '');
      while (s.length > 2 && textWidth(s, 9 * S, '700') > r.w - 18 * S) s = s.slice(0, -1);
      uiText(s, r.x + r.w / 2, by + 8 * S, { size: 9 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '700' });
      return;
    }
    const lines = 3 + (hints.length > 1 ? 1 : 0);   // name+tier / parts-or-count / toward-effect / (+others)
    const blockH = 9 * S + lines * 13 * S;
    const by = r.y + oy + r.h - blockH - 7 * S;
    uiRect(r.x + 6 * S, by, r.w - 12 * S, blockH, withAlpha('#0c0e1a', 0.94), { radius: 6 * S, stroke: withAlpha(P.goldL, 0.7), lw: 1.5 });
    let y = by + 12 * S;
    uiText('★ ' + b.name, r.x + 12 * S, y, { size: 11 * S, color: P.goldL, weight: '900' });
    uiText('第 ' + h.toLevel + ' / ' + h.max + ' 階', r.x + r.w - 12 * S, y, { size: 9.5 * S, align: 'right', color: P.gold, weight: '800' });
    y += 14 * S;
    if (pg.parts && pg.parts.length) {                 // 組合型：逐件 ✓ / ▶(此選項填上) / ·
      let px = r.x + 12 * S;
      for (const p of pg.parts) {
        const fill = p.label === h.fillsPart;
        const txt = (fill ? '▶' : (p.ok ? '✓' : '·')) + p.label;
        const tw = textWidth(txt, 9.5 * S, '700');
        if (px + tw > r.x + r.w - 12 * S) { uiText('…', px, y, { size: 9.5 * S, color: P.gray3, weight: '700' }); break; }
        uiText(txt, px, y, { size: 9.5 * S, color: fill ? P.goldL : (p.ok ? P.greenL : P.gray2), weight: '700' });
        px += tw + 7 * S;
      }
    } else {                                            // 數量型：進度 X → X+1（下一階需 Y）
      const next = pg.nextTier ? '（下一階需 ' + pg.nextTier.at + '）' : '（已滿階）';
      uiText('進度 ' + pg.count + ' → ' + (pg.count + 1) + ' ' + next, r.x + 12 * S, y, { size: 9.5 * S, color: P.gray4, weight: '700' });
    }
    y += 13 * S;
    let eff = (h.crosses ? '解鎖 ' : '推進 ') + (h.toward ? h.toward.bonusDesc : '');
    while (eff.length > 2 && textWidth(eff, 10 * S, '800') > innerW) eff = eff.slice(0, -1);
    uiText(eff, r.x + 12 * S, y, { size: 10 * S, color: h.crosses ? P.emberL : P.shardL, weight: '800' });
    y += 13 * S;
    if (hints.length > 1) uiText('＋ 另推進 ' + (hints.length - 1) + ' 個羈絆', r.x + r.w / 2, y, { size: 9 * S, align: 'center', color: P.gray3, weight: '700' });
  },

  // 4.19: while choosing, TAB shows the current build (read-only) over the choice.
  drawChoicePeekBuild() {
    const S = uiScale(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    this.drawBuildPanel(S);
    let hb = null;
    for (const ic of (this.buildIcons || [])) if (mx >= ic.x && mx <= ic.x + ic.w && my >= ic.y && my <= ic.y + ic.h) hb = ic;
    if (hb) this.drawTooltip(hb, mx, my, S);
    uiText('TAB 返回選擇強化', view.W / 2, 16 * S, { size: 13 * S, align: 'center', color: P.goldL, weight: '800' });
  },
  drawChoice() {
    const S = uiScale();
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.8));
    const rects = this.cardRects();
    uiText('選 擇 強 化', view.W / 2, rects[0].y - 28 * S, { size: 26 * S, align: 'center', color: P.manaL, weight: '900' });
    uiText('點擊卡片或按 1 / 2 / 3　·　★ 金框＝可推進羈絆　·　TAB 查看 build', view.W / 2, rects[0].y - 8 * S, { size: 12 * S, align: 'center', color: P.gray3 });
    rects.forEach((r, i) => {
      const c = this.choice.options[i]; const st = choiceStyle(c); const hover = this.choice.hover === i;
      const hints = (this.choice.bondHints && this.choice.bondHints[i]) || this.bondHintsFor(c);
      const oy = hover ? -8 * S : 0;
      const stroke = hover ? st.accent : (hints.length ? withAlpha(P.goldL, 0.85) : P.ink2);
      uiRect(r.x, r.y + oy, r.w, r.h, withAlpha(st.bg, 0.97), { radius: 9 * S, stroke, lw: hover ? 3 : (hints.length ? 2.5 : 2) });
      uiClipRound(r.x, r.y + oy, r.w, r.h, 9 * S, () => uiRect(r.x, r.y + oy, r.w, 5 * S, st.accent));   // #7: rarity bar clipped to the card's rounded corners
      const tc = st.tagCol || st.accent;                                 // rarity pill uses the RARITY colour (R17: 普通白/稀有藍/史詩紫/傳說黃)
      const pw = textWidth(st.tag, 10 * S, '800') + 14 * S;              // rarity pill
      uiRect(r.x + r.w - pw - 8 * S, r.y + oy + 10 * S, pw, 16 * S, withAlpha(tc, 0.22), { radius: 8 * S, stroke: tc, lw: 1 });
      uiText(st.tag, r.x + r.w - pw / 2 - 8 * S, r.y + oy + 18 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: tc, weight: '800' });
      if (hints.length) uiText('★', r.x + r.w / 2, r.y + oy + 14 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: P.goldL, weight: '900' });
      const sp = getSprite(iconOr(st.icon, c.kind === 'ability' ? 'ability_power' : 'weapon_w_soulbolt')); const isc = (r.w * 0.42) / sp.w;
      drawSpriteUI(sp.frames[0], r.x + r.w / 2 - sp.w * isc / 2, r.y + oy + 20 * S, isc);
      const midY = r.y + oy + 20 * S + sp.h * isc;
      uiText(st.sub, r.x + r.w / 2, midY + 12 * S, { size: 11 * S, align: 'center', color: st.accent, weight: '800' });
      uiText(c.def.name, r.x + r.w / 2, midY + 31 * S, { size: 15.5 * S, align: 'center', color: '#fff', weight: '800' });
      let dy = midY + 49 * S;
      if (st.effect) { const n = this.wrapText(st.effect, r.x + r.w / 2, dy, r.w - 22 * S, 12 * S, P.emberL); dy += n * (12 * S + 3) + 5 * S; }
      this.wrapText(st.desc || '', r.x + r.w / 2, dy, r.w - 22 * S, 11.5 * S, P.gray4);
      // R17/5.1: type pill top-left (1·武器 / 2·被動 / 升級 / 合成 / 詛咒) — replaces the bare hotkey digit
      const ti = CHOICE_TYPE[st.type] || CHOICE_TYPE.ability;
      const tlab = (i + 1) + '·' + ti.label;
      const tpw = textWidth(tlab, 10 * S, '800') + 14 * S;
      uiRect(r.x + 8 * S, r.y + oy + 10 * S, tpw, 16 * S, withAlpha(ti.col, 0.2), { radius: 8 * S, stroke: ti.col, lw: 1 });
      uiText(tlab, r.x + 8 * S + tpw / 2, r.y + oy + 18 * S, { size: 10 * S, align: 'center', baseline: 'middle', color: ti.col, weight: '800' });
      this.drawCardBonds(r, oy, S, hints);   // 8.2: bond breakdown at the card bottom
    });
  },
};
