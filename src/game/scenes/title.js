// Title / main menu scene.
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { META } from '../state.js';
import { uiText, uiScale, view, drawSpriteUI, vignette, ctxRaw } from '../../engine/renderer.js';
import { getSprite, frameAt } from '../../engine/sprites.js';
import { pressed, mouse } from '../../engine/input.js';
import { P, withAlpha } from '../../engine/palette.js';
import { settingsUI } from '../ui/settings.js';

const AMBIENT = [
  { sprite: 'slime', x: 0.18, y: 0.62, s: 3.2, ph: 0 },
  { sprite: 'bat', x: 0.82, y: 0.34, s: 3.0, ph: 1 },
  { sprite: 'wisp', x: 0.75, y: 0.7, s: 3.0, ph: 2 },
  { sprite: 'shard', x: 0.26, y: 0.38, s: 3.4, ph: 0 },
];

export const titleScene = {
  enter() { this.t = 0; },
  update(dt) {
    this.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (pressed('escape')) { settingsUI.show(); return; }
    if (pressed('space') || pressed('enter') || mouse.justDown) {
      setScene(refs.hub, {});
    }
  },
  render() {
    const S = uiScale();
    const ctx = ctxRaw();
    // backdrop gradient + glow
    const g = ctx.createLinearGradient(0, 0, 0, view.H);
    g.addColorStop(0, '#161a35'); g.addColorStop(0.55, '#0e1024'); g.addColorStop(1, '#070810');
    ctx.fillStyle = g; ctx.fillRect(0, 0, view.W, view.H);
    const rg = ctx.createRadialGradient(view.W / 2, view.H * 0.5, 0, view.W / 2, view.H * 0.5, view.W * 0.5);
    rg.addColorStop(0, withAlpha(P.shard, 0.10)); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, view.W, view.H);

    // ambient drifting sprites
    for (const a of AMBIENT) {
      const sp = getSprite(a.sprite);
      const bob = Math.sin(this.t * 1.4 + a.ph * 2) * 8 * S;
      drawSpriteUI(frameAt(sp, this.t, a.ph), view.W * a.x - sp.w * a.s * S / 2, view.H * a.y + bob, a.s * S, { alpha: 0.55 });
    }

    // hero with ground shadow
    const sp = getSprite('player');
    const scale = 8 * S;
    const bob = Math.sin(this.t * 2) * 4 * S;
    const hx = view.W / 2, hy = view.H * 0.56;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(hx, hy + bob, sp.w * scale * 0.32, sp.w * scale * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    drawSpriteUI(frameAt(sp, this.t * 0.6), hx - sp.ax * scale, hy - sp.h * scale + bob, scale);

    // title
    uiText('魂 晶 獵 手', view.W / 2, view.H * 0.26, { size: 54 * S, align: 'center', color: P.shardL, weight: '900', shadowColor: 'rgba(0,0,0,0.7)' });
    uiText('S O U L S H A R D   H U N T E R', view.W / 2, view.H * 0.26 + 36 * S, { size: 14 * S, align: 'center', color: P.gray3, weight: '700' });

    vignette(0.5);

    const blink = Math.sin(this.t * 4) * 0.5 + 0.5;
    uiText('點擊 / 空白鍵 開始狩獵', view.W / 2, view.H * 0.82, { size: 18 * S, align: 'center', color: withAlpha('#ffd479', 0.35 + blink * 0.6), weight: '800' });
    uiText('WASD 移動　滑鼠瞄準射擊　Shift 衝刺', view.W / 2, view.H * 0.88, { size: 12 * S, align: 'center', color: P.gray2 });
    const hist = (META.stats.history || []).slice(0, 3);
    if (hist.length) {
      const medals = ['①', '②', '③'];
      const txt = '排行榜　' + hist.map((h, i) => `${medals[i]} ${h.score}分 (第${h.stage}區)`).join('　　');
      uiText(txt, view.W / 2, view.H * 0.95 - 22 * S, { size: 12 * S, align: 'center', color: P.goldL, weight: '700' });
    }
    uiText(`金庫 ${META.gold}　·　最深 第 ${META.stats.bestStage || 0} 區　·　最高分 ${META.stats.bestScore || 0}　·　Esc 設定`,
      view.W / 2, view.H * 0.95, { size: 13 * S, align: 'center', color: P.gray2 });

    settingsUI.draw();
  },
};

refs.title = titleScene;
