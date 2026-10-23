import '../../../art/first_hunt.js';
import { Sfx } from '../../../engine/audio.js';
import { mouse } from '../../../engine/input.js';
import { P } from '../../../engine/palette.js';
import { drawSpriteUI, UI, uiButton, uiRect, uiText, uiWrapText, view } from '../../../engine/renderer.js';
import { frameAt, getSprite } from '../../../engine/sprites.js';
import { FIRST_HUNT_HEROES, FIRST_HUNT_RESTORATIONS, firstHuntHero, firstHuntProgress, restoreFirstHuntCamp } from '../../content/first_hunt.js';
import { setScene } from '../../scene.js';
import { META, newRun, saveMeta } from '../../state.js';
import { refs } from '../refs.js';
import { inside } from './shared.js';

export const firstHuntMixin = {
  firstHuntLayout() {
    const f = this.panelFrame(), S = Math.min(f.S, (f.h - 50 * f.S) / 450);
    const pad = 20 * S, gap = 12 * S, w = (f.w - 2 * pad - 2 * gap) / 3;
    const y = f.y + 50 * f.S + 38 * S, h = 236 * S;
    const cards = FIRST_HUNT_HEROES.map((hero, i) => ({ hero, x: f.x + pad + i * (w + gap), y, w, h }));
    const projects = FIRST_HUNT_RESTORATIONS.map((project, i) => ({ project, x: cards[i].x, y: y + h + 16 * S, w, h: 98 * S, i }));
    const by = f.y + f.h - 58 * S;
    return { f, S, cards, projects,
      start: { x: f.x + pad, y: by, w: (f.w - 2 * pad - gap) * 0.53, h: 34 * S },
      restore: { x: f.x + pad + (f.w - 2 * pad - gap) * 0.53 + gap, y: by, w: (f.w - 2 * pad - gap) * 0.47, h: 34 * S } };
  },
  updateFirstHunt(mx, my) {
    if (!mouse.justDown) return;
    const L = this.firstHuntLayout();
    for (const c of L.cards) if (inside(mx, my, c)) { this.firstHuntSelected = c.hero.id; Sfx.play('uiClick'); return; }
    if (inside(mx, my, L.restore)) {
      const p = firstHuntProgress(META), project = FIRST_HUNT_RESTORATIONS[p.restored];
      if (p.restored >= 3) { this.openPanel('sortie'); return; }
      if (!project || !p.seals) return;
      this.ask('使用 1 枚重建印記：' + project.name + '？', project.desc, () => {
        const built = restoreFirstHuntCamp(META);
        if (built) { saveMeta(); this.injectFirstHuntCamp(); this.feedback(built.name + ' · 據點已更新'); }
      });
      return;
    }
    if (inside(mx, my, L.start)) {
      const hero = firstHuntHero(this.firstHuntSelected);
      Sfx.play('portal');
      setScene(refs.run, { run: newRun({ mode: 'first_hunt', characterId: hero.id }) });
    }
  },
  drawFirstHunt() {
    this.drawPanelFrame('初 獵 · 重 燃 魂 火');
    const L = this.firstHuntLayout(), { f, S } = L, p = firstHuntProgress(META);
    const selected = firstHuntHero(this.firstHuntSelected).id;
    this.panelMaxScroll = 0;
    uiText('借用三名獵手，奪回魂火，讓廢墟重新亮起。', f.x + 20 * S, L.cards[0].y - 14 * S, { size: UI.FONT_BODY * S, color: '#c4d7d7' });
    for (const r of L.cards) {
      const hero = r.hero, on = selected === hero.id, hover = inside(mouse.x * view.dpr, mouse.y * view.dpr, r);
      uiRect(r.x, r.y, r.w, r.h, on ? '#233b42' : '#12212b', { radius: 5 * S, stroke: on || hover ? hero.color : '#35464f', lw: on ? 3 : 1 });
      uiRect(r.x + 10 * S, r.y + 12 * S, 3 * S, 36 * S, hero.color);
      uiText(hero.name, r.x + 22 * S, r.y + 28 * S, { size: UI.FONT_HEADING * S, color: '#f1f7ef', weight: UI.WEIGHT_HEADING });
      uiText(hero.role, r.x + 22 * S, r.y + 47 * S, { size: UI.FONT_CAPTION * S, color: hero.color });
      const sp = getSprite('fh_hero_' + hero.id), sc = 3.1 * S;
      drawSpriteUI(frameAt(sp, this.t), r.x + r.w / 2 - sp.w * sc / 2, r.y + 62 * S, sc);
      uiText(hero.skill, r.x + 18 * S, r.y + 141 * S, { size: UI.FONT_BODY * S, color: hero.color, weight: UI.WEIGHT_HEADING });
      uiWrapText(hero.verb, r.w - 36 * S, UI.FONT_BODY * S, UI.WEIGHT_BODY).slice(0, 3).forEach((line, i) => uiText(line, r.x + 18 * S, r.y + (163 + i * 19) * S, { size: UI.FONT_BODY * S, color: '#d0dedb' }));
      uiText(p.completed.includes(hero.id) ? '印記已取得' : '首次通關可得重建印記', r.x + 18 * S, r.y + r.h - 13 * S, { size: UI.FONT_CAPTION * S, color: p.completed.includes(hero.id) ? P.goldL : '#a7bcb9' });
    }
    const captions = ['初獵拾取範圍 +12', '解鎖烈焰術士', '解鎖晶岩守衛'];
    for (const r of L.projects) {
      const done = p.restored > r.i;
      uiRect(r.x, r.y, r.w, r.h, '#101b25', { radius: 4 * S, stroke: done ? '#6f9e90' : '#34424c', lw: 1 });
      const sp = getSprite(done ? r.project.sprite : r.i === 0 ? 'fh_brazier_dark' : r.project.sprite), sc = 1.5 * S;
      drawSpriteUI(frameAt(sp, this.t), r.x + 10 * S, r.y + 14 * S, sc, { alpha: done ? 1 : 0.35 });
      uiText(r.project.name, r.x + 62 * S, r.y + 32 * S, { size: UI.FONT_BODY * S, color: done ? '#b4edce' : '#c5d1d0', weight: UI.WEIGHT_HEADING });
      uiText(done ? '已完成' : '需要 1 枚印記', r.x + 62 * S, r.y + 52 * S, { size: UI.FONT_CAPTION * S, color: done ? P.goldL : '#9eb1af' });
      uiText(captions[r.i], r.x + 14 * S, r.y + 82 * S, { size: UI.FONT_CAPTION * S, color: '#a9c2bd' });
    }
    const btn = (r, text, disabled = false) => uiButton(r.x, r.y, r.w, r.h, text, { S, disabled, hover: inside(mouse.x * view.dpr, mouse.y * view.dpr, r), size: UI.FONT_BODY * S });
    btn(L.start, '以' + firstHuntHero(selected).name + '出發 · 免費借用');
    btn(L.restore, p.restored >= 3 ? '前往正式狩獵' : (p.seals ? '重建：' + FIRST_HUNT_RESTORATIONS[p.restored].name : '可用印記 ' + p.seals + ' · 換角色取得'), p.restored < 3 && p.seals < 1);
    uiText('約 3 分鐘 · 首領戰持續至勝敗 · 不計排行榜 · Esc 回城', f.x + f.w / 2, f.y + f.h - 9 * S, { size: UI.FONT_CAPTION * S, align: 'center', color: '#9fb5b6' });
  },
  injectFirstHuntCamp() {
    if (!this.world || !this.rooms || this.area !== 'town') return;
    const p = firstHuntProgress(META), c = this.rooms.plaza;
    this.world.decor = this.world.decor.filter((d) => !d._firstHunt);
    const x = c.cx - 60, y = c.cy - 14;
    const prop = (px, py, sprite) => {
      if (this.world.tileAt(Math.floor(px / 16), Math.floor(py / 16)) === 0 && !this.world.solidAt(px, py)) this.world.decor.push({ x: px, y: py, sprite, _firstHunt: true });
    };
    if (p.restored >= 2) prop(x - 28, y - 7, 'fh_banner');
    if (p.restored >= 3) prop(x + 31, y + 6, 'fh_trophy');
    // A real E-interaction beside the persistent world change, also accessible via sortie.
    this.stations = this.stations.filter((s) => s.id !== 'firstHunt');
    this.stations.push({ id: 'firstHunt', panel: 'firstHunt', kind: 'doorless', sprite: p.restored ? 'fh_brazier_lit' : 'fh_brazier_dark', label: '初獵 · 重燃魂火', color: '#80e5d8', x, y });
  },
};
