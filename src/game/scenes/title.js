// Title / main menu scene: main menu (開始遊戲 / 設定) + a 3-slot save picker.
import { setScene } from '../scene.js';
import { refs } from './refs.js';
import { META, loadMeta, applySettings, setActiveSlot, activeSlot, slotSummaries, deleteSlot, syncFromCloud } from '../state.js';
import { Net } from '../../net/api.js';
import { openAuth, openLeaderboard, isModalOpen, netToast } from '../../net/ui.js';
import { openSocial } from '../../net/social.js';
import { Characters } from '../content/registry.js';
import { PATCH_NOTES, GAME_VERSION } from '../content/patchnotes.js';
import { uiText, uiRect, uiScale, view, drawSpriteUI, vignette, ctxRaw, textWidth } from '../../engine/renderer.js';
import { getSprite, frameAt } from '../../engine/sprites.js';
import { pressed, mouse } from '../../engine/input.js';
import { P, withAlpha } from '../../engine/palette.js';
import { Music } from '../../engine/audio.js';
import { settingsUI } from '../ui/settings.js';

// R21.8: UI breakpoint (CSS px) below which we assume a phone-class viewport and show
// the keyboard-recommended hint (touch never feeds moveAxis — see engine/input.js).
const MOBILE_HINT_MAX_W = 720;

// R20.1 cover: the hero SQUAD assaulting the dark tower, in THREE depth ranks (far rank
// small + high on the ridge → front rank big + low). Newest heroes (h4_*) carry the
// lineup; the lead slot is the player skin. rx/ry are viewport fractions; s = scale on
// top of uiScale; ph staggers the idle bob.
const SQUAD = [
  // back rank — the casters hold the high ridge
  { sprite: 'char_h4_puppeteer', rx: 0.062, ry: 0.708, s: 2.3, ph: 6 },
  { sprite: 'char_h4_chronomancer', rx: 0.132, ry: 0.700, s: 2.4, ph: 7 },
  { sprite: 'char_h2_voidcaller', rx: 0.205, ry: 0.710, s: 2.3, ph: 8 },
  { sprite: 'char_h4_gravekeeper', rx: 0.272, ry: 0.702, s: 2.4, ph: 9 },
  // mid rank
  { sprite: 'char_h4_paladin', rx: 0.092, ry: 0.778, s: 3.2, ph: 1 },
  { sprite: 'char_h4_starcaller', rx: 0.300, ry: 0.772, s: 3.0, ph: 4 },
  { sprite: 'char_h3_dragoon', rx: 0.372, ry: 0.784, s: 3.1, ph: 3 },
  // front rank — the vanguard, closest to the camera
  { sprite: 'player', rx: 0.172, ry: 0.856, s: 4.3, ph: 0, lead: true },
  { sprite: 'char_h4_bladedancer', rx: 0.292, ry: 0.864, s: 3.9, ph: 5 },
];
// midground ruin silhouettes between the squad and the tower (reuse town_ruin_* sprites)
const MIDRUINS = [
  { sprite: 'ruin_arch', rx: 0.50, ry: 0.745, s: 2.2 },
  { sprite: 'ruin_deadtree2', rx: 0.60, ry: 0.730, s: 2.4 },
  { sprite: 'ruin_pillar_broken', rx: 0.67, ry: 0.748, s: 2.2 },
  { sprite: 'ruin_deadtree', rx: 0.042, ry: 0.690, s: 2.4 },
  { sprite: 'ruin_rubble2', rx: 0.46, ry: 0.768, s: 2.0 },
  { sprite: 'ruin_banner', rx: 0.236, ry: 0.694, s: 2.2 },
];
// the squad's forward CAMP — a little fortification they're staging from. `front` props
// draw OVER the heroes (between them and the camera) for extra depth.
const CAMP = [
  { sprite: 'ruin_bonfire', rx: 0.236, ry: 0.795, s: 2.6, fire: true },
  { sprite: 'town_crate', rx: 0.352, ry: 0.842, s: 2.8 },
  { sprite: 'town_barrel', rx: 0.378, ry: 0.848, s: 2.8 },
  { sprite: 'ruin_banner', rx: 0.090, ry: 0.842, s: 3.2 },
  { sprite: 'town_gatepost', rx: 0.018, ry: 0.905, s: 3.4, front: true },
  { sprite: 'ruin_fence', rx: 0.075, ry: 0.918, s: 3.2, front: true },
  { sprite: 'ruin_fence', rx: 0.128, ry: 0.922, s: 3.2, front: true },
  { sprite: 'ruin_fence', rx: 0.346, ry: 0.920, s: 3.2, front: true },
  { sprite: 'ruin_rubble', rx: 0.236, ry: 0.912, s: 3.0, front: true },
];
// late-game final bosses garrisoning the tower (newest R18 designs, facing the squad)
const GUARDS = [
  { sprite: 'b3_seraphjudge', dxw: -0.105, dyh: -0.235, s: 2.4, fly: true, ph: 1 },   // 墮天審判 on the wing
  { sprite: 'b3_leviathan', dxw: 0.062, dyh: -0.012, s: 2.7, ph: 3 },                  // 深淵利維坦 coiled at the base
  { sprite: 'b3_sandpharaoh', dxw: -0.058, dyh: 0.006, s: 2.4, ph: 5 },                // 流沙法老 fronting the gate
  { sprite: 'b3_bogmaw', dxw: 0.132, dyh: 0.020, s: 2.5, ph: 7 },                      // 腐沼巨蟾母 lurking at the flank
];
// the volley: each hero archetype fires ITS OWN weapon visual at the crown (kept to a
// few in flight — readable, not a fireworks show). cyc = period, dur = flight time.
const VOLLEY = [
  { sprite: 'bolt', fx: 0.180, fy: 0.795, cyc: 3.0, dur: 1.05, arc: 58, off: 0.0, glow: '#7ef2dd' },     // lead — soul bolt
  { sprite: 'bolt_volt', fx: 0.098, fy: 0.735, cyc: 4.4, dur: 1.25, arc: 38, off: 1.3, glow: '#ffe9a8' }, // paladin — holy bolt
  { sprite: 'bolt_void', fx: 0.205, fy: 0.665, cyc: 5.1, dur: 1.35, arc: 72, off: 2.2, glow: '#d9a8ff' }, // voidcaller — void orb
];
// deterministic mini-hash for star/ember fields (no per-frame state)
const hsh01 = (i) => (((i * 2654435761) >>> 0) % 1000) / 1000;

const inside = (mx, my, r) => r && mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
function fmtTime(s) { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? (h + ' 小時 ' + m + ' 分') : (m > 0 ? (m + ' 分鐘') : '未滿 1 分'); }

export const titleScene = {
  enter() {
    this.t = 0; this.mode = 'menu'; this.confirm = -1; this.slots = slotSummaries(); Music.setMode('title');
    // R21.8: touch only maps to the mouse (engine/input.js) — movement needs a keyboard.
    // Surface that honestly on narrow / coarse-pointer devices instead of implying touch support.
    this.mobileHint = window.innerWidth < MOBILE_HINT_MAX_W || !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  },

  // ---- layout (shared by update hit-testing + render) ----------------------
  // R20.1: the menu is now ONE centred vertical column of 5 under the logo (player ask),
  // leaving the lower screen free for the cover scene. Cap S so logo → column → notes
  // button → footer always stack cleanly within the viewport.
  menuScale() { return Math.min(uiScale(), (view.H * 0.55 - 12) / 262); },
  // top of the column — a clear breath below the logo block (never flush against it)
  menuTop() { return Math.max(view.H * 0.295, view.H * 0.155 + 86 * uiScale()); },
  layoutMenu() {
    const S = this.menuScale();
    const u = Net.currentUser() || {};
    const acct = Net.isLoggedIn() ? ('☁ ' + (u.username || '帳號')) : '☁ 登入 / 註冊';
    // R20.1: all five buttons share ONE size; tightened smaller (player ask).
    const bw = Math.min(200 * S, view.W * 0.5), x0 = view.W / 2 - bw / 2;
    const rowH = 38 * S, gap = 9 * S;
    let y = this.menuTop();
    const mk = (id, label, big) => {
      const r = { x: x0, y, w: bw, h: rowH };
      y += rowH + gap;
      return { id, label, big, r };
    };
    return [
      mk('single', '🗡 單人遊戲', true),
      mk('multi', '🌐 多人連線', true),
      mk('leaderboard', '🏆 排行榜', false),
      mk('account', acct, false),
      mk('settings', '⚙ 設定', false),
    ];
  },
  layoutSlots() {
    // R17/1.1: anchored below the compact logo (fixed offsets, not 0.26H) so heading/cards
    // can never ride up into the title; cards shrink on short viewports instead of clipping.
    const S = uiScale(); const cw = Math.min(540 * S, view.W - 36 * S), gap = 12 * S;
    const y0 = view.H * 0.085 + 76 * S;
    const ch = Math.max(64 * S, Math.min(90 * S, (view.H - y0 - 64 * S) / 3 - gap));
    const x = view.W / 2 - cw / 2;
    const cards = [];
    for (let i = 0; i < 3; i++) { const r = { x, y: y0 + i * (ch + gap), w: cw, h: ch }; cards.push({ i, r, delR: { x: r.x + r.w - 66 * S, y: r.y + 10 * S, w: 56 * S, h: 26 * S } }); }
    return { cards, back: { x: view.W / 2 - 80 * S, y: y0 + 3 * (ch + gap) + 8 * S, w: 160 * S, h: 40 * S } };
  },

  enterSlot(i) {
    setActiveSlot(i); loadMeta(i); try { applySettings(); } catch (e) { /* */ }
    // now that a slot is committed, reconcile it with the cloud (slot-gated; safe to pull)
    try { if (Net.isLoggedIn()) syncFromCloud().then(() => { try { applySettings(); } catch (e) { /* */ } }).catch(() => {}); } catch (e) { /* */ }
    setScene(refs.hub, {});
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;

    if (this.mode === 'notes') {   // 更新日誌 overlay — R17 B13: version LIST → click a row → detail page
      if (pressed('escape')) { if (this.notesSel != null) { this.notesSel = null; this.notesScroll = 0; } else this.mode = 'menu'; return; }
      if (mouse.wheel) this.notesScroll = Math.max(0, Math.min(this.notesMax || 0, (this.notesScroll || 0) + mouse.wheel * 0.5));
      if (mouse.justDown) {
        if (this._notesClose && inside(mx, my, this._notesClose)) { this.mode = 'menu'; this.notesSel = null; return; }
        if (this.notesSel != null && this._notesBack && inside(mx, my, this._notesBack)) { this.notesSel = null; this.notesScroll = 0; return; }
        if (this.notesSel == null) for (const r of (this._noteRows || [])) if (inside(mx, my, r)) { this.notesSel = r.i; this.notesScroll = 0; return; }
        if (this._notesPanel && !inside(mx, my, this._notesPanel)) { this.mode = 'menu'; this.notesSel = null; return; }
      }
      return;
    }

    if (this.mode === 'slots') {
      if (pressed('escape')) { this.mode = 'menu'; this.confirm = -1; return; }
      const L = this.layoutSlots();
      if (mouse.justDown) {
        for (const c of L.cards) {                       // delete (with two-click confirm) takes priority over entering
          const s = this.slots[c.i];
          if (s && !s.empty && inside(mx, my, c.delR)) {
            if (this.confirm === c.i) { deleteSlot(c.i); this.slots = slotSummaries(); this.confirm = -1; }
            else this.confirm = c.i;
            return;
          }
        }
        for (const c of L.cards) if (inside(mx, my, c.r)) { this.enterSlot(c.i); return; }
        if (inside(mx, my, L.back)) { this.mode = 'menu'; this.confirm = -1; }
      }
      return;
    }

    // menu
    if (isModalOpen()) return;   // a DOM overlay (login / 多人 / 排行榜) is up — don't let canvas keys/clicks drive the title behind it
    if (pressed('escape')) { settingsUI.show(); return; }
    if (mouse.justDown) {
      if (inside(mx, my, this.notesBtn())) { this.mode = 'notes'; this.notesScroll = 0; this.notesSel = null; return; }
      for (const b of this.layoutMenu()) if (inside(mx, my, b.r)) { this.onMenu(b.id); return; }
    }
    if (pressed('space') || pressed('enter')) this.enterSlot(activeSlot());   // quick-start straight into the last-used slot
  },

  onMenu(id) {
    if (id === 'single') this.startSingle();
    else if (id === 'multi') {
      if (Net.isLoggedIn()) openSocial();
      else { openAuth(); netToast('多人連線需要先登入帳號'); }
    } else if (id === 'leaderboard') openLeaderboard();
    else if (id === 'account') openAuth();
    else if (id === 'settings') settingsUI.show();
  },
  startSingle() { this.slots = slotSummaries(); this.mode = 'slots'; this.confirm = -1; },

  // ---- render --------------------------------------------------------------
  render() {
    const S = uiScale();
    this.drawBackdrop(S);

    // title — R17/1.1: the slots list collided with the full-size logo on short viewports,
    // so the slot screen gets a compact logo pinned near the top instead.
    this.drawLogo(S, this.mode === 'slots');

    if (this.mode === 'slots') this.drawSlots(S);
    else if (this.mode === 'notes') this.drawNotes(S);
    else this.drawMenu(S);

    vignette(0.5);
    settingsUI.draw();
  },

  // R20.1 cover scene: dusk apocalypse sky + shattered moon → dark tower on the right
  // horizon → ruin midground → the hero squad on the left ridge, volleying soul bolts
  // at the tower. Fully deterministic from this.t (no particle state to leak).
  drawBackdrop(S) {
    const ctx = ctxRaw(), W = view.W, H = view.H, t = this.t;
    const horizonY = H * 0.72;
    const towerS = (H * 0.56) / 150;                       // tower ≈ 56% of viewport height
    const towerX = W * 0.80 - 36 * towerS, towerY = horizonY + 14 * towerS - 150 * towerS;
    const crownX = towerX + 36 * towerS, crownY = towerY + 44 * towerS;

    // sky: deep violet dusk, ember-stained toward the tower side
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#131027'); g.addColorStop(0.45, '#1c1430'); g.addColorStop(0.72, '#2a1626'); g.addColorStop(1, '#070810');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const rg = ctx.createRadialGradient(crownX, horizonY, 0, crownX, horizonY, W * 0.55);
    rg.addColorStop(0, withAlpha('#ff5a3c', 0.16)); rg.addColorStop(0.5, withAlpha('#a02a4a', 0.07)); rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // stars (upper sky, twinkling)
    for (let i = 0; i < 34; i++) {
      const sx = hsh01(i) * W, sy = hsh01(i + 71) * H * 0.5;
      const tw = 0.25 + 0.45 * Math.abs(Math.sin(t * (0.6 + hsh01(i + 7)) + i));
      ctx.fillStyle = withAlpha(i % 5 === 0 ? '#ffd9b0' : '#cfeaff', tw);
      ctx.fillRect(sx, sy, 1.6 * S, 1.6 * S);
    }
    // shattered moon (upper-left, behind the logo glow)
    const mx0 = W * 0.13, my0 = H * 0.21, mr = Math.min(W, H) * 0.075;
    const mg = ctx.createRadialGradient(mx0, my0, 0, mx0, my0, mr * 2.2);
    mg.addColorStop(0, withAlpha('#cfe9ff', 0.18)); mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.fillRect(mx0 - mr * 2.2, my0 - mr * 2.2, mr * 4.4, mr * 4.4);
    ctx.fillStyle = withAlpha('#bcd6ee', 0.5);
    ctx.beginPath(); ctx.arc(mx0, my0, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = withAlpha('#8aa6c8', 0.45);                       // craters + the great crack
    ctx.beginPath(); ctx.arc(mx0 - mr * 0.3, my0 - mr * 0.2, mr * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(mx0 + mr * 0.35, my0 + mr * 0.3, mr * 0.14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = withAlpha('#1a1430', 0.8); ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.moveTo(mx0 - mr * 0.2, my0 - mr); ctx.lineTo(mx0 + mr * 0.15, my0 - mr * 0.1); ctx.lineTo(mx0 - mr * 0.1, my0 + mr); ctx.stroke();
    ctx.fillStyle = withAlpha('#bcd6ee', 0.35);                       // drifting shard broken off the rim
    ctx.beginPath(); ctx.arc(mx0 + mr * 1.28, my0 - mr * 0.55 + Math.sin(t * 0.8) * 3 * S, mr * 0.16, 0, Math.PI * 2); ctx.fill();
    // R20.1 light pass: terminator shade (clipped to the disc), a lit rim on the sun side,
    // and two faint moonbeams falling toward the squad's field
    ctx.save();
    ctx.beginPath(); ctx.arc(mx0, my0, mr, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = withAlpha('#0d0a1e', 0.34);
    ctx.beginPath(); ctx.arc(mx0 + mr * 0.34, my0 + mr * 0.28, mr * 0.95, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = withAlpha('#eaf6ff', 0.55); ctx.lineWidth = 1.6 * S;
    ctx.beginPath(); ctx.arc(mx0, my0, mr - 0.8 * S, Math.PI * 0.78, Math.PI * 1.62); ctx.stroke();
    ctx.save();
    ctx.translate(mx0, my0); ctx.rotate(Math.PI * 0.20);
    const beam = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    beam.addColorStop(0, withAlpha('#bfe2ff', 0.09)); beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(-mr * 0.55, mr * 0.6, mr * 0.5, H * 0.5);
    ctx.fillRect(mr * 0.18, mr * 0.85, mr * 0.28, H * 0.42);
    ctx.restore();

    // far ruined skyline along the horizon
    ctx.fillStyle = withAlpha('#120d22', 0.85);
    const sky = [[0.02, 0.05, 26], [0.10, 0.03, 14], [0.30, 0.04, 18], [0.40, 0.025, 10], [0.55, 0.05, 30], [0.63, 0.03, 16], [0.92, 0.04, 24]];
    for (const [fx, fw, fh] of sky) ctx.fillRect(W * fx, horizonY - fh * S, W * fw, fh * S);

    // a burning horizon line bleeding out from behind the tower
    const hl = ctx.createLinearGradient(W * 0.40, 0, W, 0);
    hl.addColorStop(0, 'rgba(255,90,60,0)'); hl.addColorStop(0.72, withAlpha('#ff7a4a', 0.38)); hl.addColorStop(1, withAlpha('#ff9a5a', 0.22));
    ctx.fillStyle = hl; ctx.fillRect(W * 0.40, horizonY - 1.5 * S, W * 0.60, 3 * S);

    // ground: ash field falling away from the horizon
    const gg = ctx.createLinearGradient(0, horizonY, 0, H);
    gg.addColorStop(0, '#1b1426'); gg.addColorStop(0.4, '#141020'); gg.addColorStop(1, '#080710');
    ctx.fillStyle = gg; ctx.fillRect(0, horizonY, W, H - horizonY);
    // layered ash ridges so the field has depth and the squad stands ON something.
    // R20.1: each crest also gets a rim-light stroke — moon-cool on the left fading to
    // ember-warm on the tower side — so the ground reads lit, not flat.
    const ridge = (yBase, amp, col, alpha, rim) => {
      const pts = [];
      for (let x = 0; x <= W + 1; x += W / 22) pts.push([x, yBase + Math.sin(x * 0.011 + amp * 7) * amp * S - hsh01(((x / 17) | 0) + amp) * amp * 0.9 * S]);
      ctx.fillStyle = withAlpha(col, alpha);
      ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(pts[0][0], pts[0][1]);
      for (const [px3, py3] of pts) ctx.lineTo(px3, py3);
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
      if (rim) {
        const rg2 = ctx.createLinearGradient(0, 0, W, 0);
        rg2.addColorStop(0, withAlpha('#9fd8ff', rim)); rg2.addColorStop(0.55, withAlpha('#8a7ab0', rim * 0.45)); rg2.addColorStop(1, withAlpha('#ff9a5a', rim));
        ctx.strokeStyle = rg2; ctx.lineWidth = 1.4 * S;
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
        for (const [px3, py3] of pts) ctx.lineTo(px3, py3);
        ctx.stroke();
      }
    };
    ridge(H * 0.745, 5, '#241b38', 0.9, 0.10);
    ridge(H * 0.795, 8, '#1a1430', 0.92, 0.13);
    ridge(H * 0.865, 11, '#100c1f', 0.95, 0.17);
    // ground light pools: cool moonlight where the squad stands, ember heat at the tower's feet
    const mp = ctx.createRadialGradient(W * 0.20, H * 0.82, 0, W * 0.20, H * 0.82, W * 0.20);
    mp.addColorStop(0, withAlpha('#9fd8ff', 0.065)); mp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mp; ctx.beginPath(); ctx.ellipse(W * 0.20, H * 0.82, W * 0.20, H * 0.10, 0, 0, Math.PI * 2); ctx.fill();
    const ep = ctx.createRadialGradient(W * 0.80, H * 0.74, 0, W * 0.80, H * 0.74, W * 0.16);
    ep.addColorStop(0, withAlpha('#ff7a4a', 0.075)); ep.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ep; ctx.beginPath(); ctx.ellipse(W * 0.80, H * 0.74, W * 0.16, H * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 46; i++) {                                    // ash/ rubble specks
      const px2 = hsh01(i + 31) * W, py2 = horizonY + hsh01(i + 87) * (H - horizonY);
      ctx.fillStyle = withAlpha(i % 4 === 0 ? '#3a2f4a' : '#241c34', 0.8);
      ctx.fillRect(px2, py2, (1.5 + 2 * hsh01(i)) * S, 1.5 * S);
    }
    // the soul rift: a glowing crack snaking from bottom-centre toward the tower base
    const riftP = 0.5 + 0.22 * Math.abs(Math.sin(t * 1.1));
    ctx.strokeStyle = withAlpha(P.shard, 0.30 * riftP + 0.12); ctx.lineWidth = 2.5 * S;
    ctx.beginPath(); ctx.moveTo(W * 0.40, H * 1.0);
    ctx.lineTo(W * 0.48, H * 0.90); ctx.lineTo(W * 0.46, H * 0.84); ctx.lineTo(W * 0.58, H * 0.79); ctx.lineTo(W * 0.66, H * 0.755); ctx.lineTo(W * 0.74, H * 0.745);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(P.shardL, 0.18 * riftP); ctx.lineWidth = 5 * S; ctx.stroke();

    // ── the dark tower (right) ────────────────────────────────────────────────
    const tg = ctx.createRadialGradient(crownX, crownY, 0, crownX, crownY, 170 * towerS);
    tg.addColorStop(0, withAlpha('#ff4a72', 0.10 + 0.05 * Math.sin(t * 2))); tg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = tg; ctx.fillRect(crownX - 170 * towerS, crownY - 170 * towerS, 340 * towerS, 340 * towerS);
    const tsp = getSprite('title_tower');
    drawSpriteUI(frameAt(tsp, t), towerX, towerY, towerS);
    for (let i = 0; i < 3; i++) {                                     // bats wheeling the crown
      const a = t * (0.5 + i * 0.13) + i * 2.1;
      const bx = crownX + Math.cos(a) * (46 + i * 16) * S * 0.8, by = crownY - 14 * S + Math.sin(a * 1.3) * 17 * S;
      const bsp = getSprite('bat');
      drawSpriteUI(frameAt(bsp, t, i), bx, by, 1.3 * S, { alpha: 0.55, flipX: Math.cos(a) > 0 });
    }
    // R20.1: late-game final bosses garrison the tower, glaring back at the squad
    // (enemy sprites natively face left = toward the heroes; the flyer hovers on a bob)
    for (const gd of GUARDS) {
      const sp = getSprite(gd.sprite); if (!sp || sp.missing) continue;
      const sc = gd.s * S;
      const bx = crownX + W * gd.dxw, by = horizonY + H * gd.dyh + (gd.fly ? Math.sin(t * 1.6 + gd.ph) * 6 * S : 0);
      if (!gd.fly) { ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(bx, horizonY + H * gd.dyh + 1.5 * S, sp.w * sc * 0.36, sp.w * sc * 0.10, 0, 0, Math.PI * 2); ctx.fill(); }
      drawSpriteUI(frameAt(sp, t, gd.ph), bx - sp.w * sc / 2, by - sp.h * sc, sc, { alpha: 0.97 });
    }

    // midground ruin silhouettes
    for (const m of MIDRUINS) {
      const sp = getSprite(m.sprite); if (!sp || sp.missing) continue;
      drawSpriteUI(frameAt(sp, t), W * m.rx - sp.w * m.s * S / 2, H * m.ry - sp.h * m.s * S, m.s * S, { alpha: 0.9 });
    }
    // forward camp BEHIND the heroes: rally banner, supplies, a crackling bonfire
    for (const m of CAMP) {
      if (m.front) continue;
      const sp = getSprite(m.sprite); if (!sp || sp.missing) continue;
      if (m.fire) {
        const fg = ctx.createRadialGradient(W * m.rx, H * m.ry - 8 * S, 0, W * m.rx, H * m.ry - 8 * S, 46 * S);
        fg.addColorStop(0, withAlpha('#ffb060', 0.16 + 0.05 * Math.sin(t * 7))); fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg; ctx.fillRect(W * m.rx - 46 * S, H * m.ry - 54 * S, 92 * S, 92 * S);
      }
      drawSpriteUI(frameAt(sp, t), W * m.rx - sp.w * m.s * S / 2, H * m.ry - sp.h * m.s * S, m.s * S);
    }

    // ── the hero squad (left ridge, facing the tower) ────────────────────────
    for (const q of SQUAD) {
      const sp = getSprite(q.sprite); if (!sp || sp.missing) continue;
      const sc = q.s * S, bob = Math.sin(t * 2 + q.ph) * 1.6 * S;
      const qx = W * q.rx, qy = H * q.ry + bob;
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.beginPath(); ctx.ellipse(qx, H * q.ry + 1 * S, sp.w * sc * 0.34, sp.w * sc * 0.11, 0, 0, Math.PI * 2); ctx.fill();
      if (q.lead) {                                                   // the player's avatar leads the charge
        const lg = ctx.createRadialGradient(qx, qy - sp.h * sc * 0.45, 0, qx, qy - sp.h * sc * 0.45, sp.h * sc * 0.9);
        lg.addColorStop(0, withAlpha(P.shard, 0.16)); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.fillRect(qx - sp.h * sc, qy - sp.h * sc * 1.4, sp.h * sc * 2, sp.h * sc * 1.8);
      }
      drawSpriteUI(frameAt(sp, t, q.ph), qx - sp.w * sc / 2, qy - sp.h * sc, sc, { flipX: true });
    }
    // camp foreground (gatepost + fence line + rubble) — drawn OVER the heroes for depth
    for (const m of CAMP) {
      if (!m.front) continue;
      const sp = getSprite(m.sprite); if (!sp || sp.missing) continue;
      drawSpriteUI(frameAt(sp, t), W * m.rx - sp.w * m.s * S / 2, H * m.ry - sp.h * m.s * S, m.s * S, { alpha: 0.98 });
    }

    // ── the assault: each archetype lobs ITS OWN weapon bolt at the crown (sparse —
    // at most one of each in flight); the tower answers with a red orb now and then ──
    for (const v of VOLLEY) {
      const k = ((t + v.off) % v.cyc) / v.dur;
      if (k > 1) continue;
      const sxr = W * v.fx, syr = H * v.fy;
      const bx = sxr + (crownX - sxr) * k, by = syr + (crownY - syr) * k - Math.sin(k * Math.PI) * v.arc * S;
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, 11 * S);
      bg2.addColorStop(0, withAlpha(v.glow, 0.40)); bg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg2; ctx.fillRect(bx - 11 * S, by - 11 * S, 22 * S, 22 * S);
      const bsp = getSprite(v.sprite);
      if (bsp && !bsp.missing) drawSpriteUI(frameAt(bsp, t), bx - bsp.w * S, by - bsp.h * S, 2 * S);
      for (let tr = 1; tr <= 2; tr++) {                               // short trail
        const k2 = Math.max(0, k - tr * 0.06);
        const tx2 = sxr + (crownX - sxr) * k2, ty2 = syr + (crownY - syr) * k2 - Math.sin(k2 * Math.PI) * v.arc * S;
        ctx.fillStyle = withAlpha(v.glow, 0.30 - tr * 0.11);
        ctx.fillRect(tx2 - 1.3 * S, ty2 - 1.3 * S, 2.6 * S, 2.6 * S);
      }
      if (k > 0.92) {                                                 // impact flash on the crown
        ctx.strokeStyle = withAlpha('#ffffff', (1 - k) * 7);
        ctx.lineWidth = 2 * S;
        ctx.beginPath(); ctx.arc(crownX, crownY, (k - 0.92) * 200 * S, 0, Math.PI * 2); ctx.stroke();
      }
    }
    {                                                                  // the tower's red answer, lobbed back at the ridge
      const k = ((t + 1.6) % 4.6) / 1.5;
      if (k <= 1) {
        const ex = crownX + (W * 0.30 - crownX) * k, ey = crownY + (H * 0.78 - crownY) * k - Math.sin(k * Math.PI) * 90 * S;
        ctx.fillStyle = withAlpha('#ff6a5a', 0.9);
        ctx.beginPath(); ctx.arc(ex, ey, 3 * S, 0, Math.PI * 2); ctx.fill();
        const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 12 * S);
        eg.addColorStop(0, withAlpha('#ff3a2a', 0.45)); eg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = eg; ctx.fillRect(ex - 12 * S, ey - 12 * S, 24 * S, 24 * S);
      }
    }

    // drifting embers + ash motes (full field, rising toward the tower glow)
    for (let i = 0; i < 26; i++) {
      const spd = 9 + 14 * hsh01(i + 13);
      const ex2 = (hsh01(i) * W + Math.sin(t * 0.6 + i) * 9 * S + t * 6 * (i % 2 ? 1 : -1)) % W;
      const ey2 = ((hsh01(i + 5) * H - t * spd * S) % H + H) % H;
      const warm = i % 3 !== 0;
      ctx.fillStyle = withAlpha(warm ? '#ff9a5a' : '#8af2e2', 0.25 + 0.3 * Math.abs(Math.sin(t + i * 1.7)));
      ctx.fillRect(ex2, ey2, (warm ? 2 : 1.6) * S, (warm ? 2 : 1.6) * S);
    }

    // bottom scrim — R20.1: lighter now that the menu lives top-centre; just enough to
    // seat the footer text without burying the squad scene
    const sg = ctx.createLinearGradient(0, H * 0.62, 0, H);
    sg.addColorStop(0, 'rgba(6,7,14,0)'); sg.addColorStop(0.7, 'rgba(6,7,14,0.20)'); sg.addColorStop(1, 'rgba(6,7,14,0.42)');
    ctx.fillStyle = sg; ctx.fillRect(0, H * 0.62, W, H * 0.38);
  },

  // R20.1 logo: layered gradient lettering (ice-teal → astral violet) over a soul glow,
  // with a gold rule + diamond and the spaced EN subtitle. `compact` = slots-screen top pin.
  drawLogo(S, compact) {
    const ctx = ctxRaw(), W = view.W;
    const cx = W / 2, baseY = compact ? view.H * 0.085 : view.H * 0.155;
    const size = (compact ? 30 : 54) * S;
    const FONT2 = '"Microsoft JhengHei", "PingFang TC", "Noto Sans CJK TC", system-ui, sans-serif';
    const text = '魂 晶 獵 手';
    // soul glow halo behind the lettering
    const lg = ctx.createRadialGradient(cx, baseY, 0, cx, baseY, size * 3.4);
    lg.addColorStop(0, withAlpha(P.shard, compact ? 0.10 : 0.16)); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(cx - size * 3.4, baseY - size * 1.6, size * 6.8, size * 3.2);
    ctx.save();
    ctx.font = `900 ${size}px ${FONT2}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // chunky drop shadow → dark outline → gradient face → top ice-light pass
    ctx.fillStyle = 'rgba(4,5,10,0.85)';
    ctx.fillText(text, cx + 3.5 * S, baseY + 4.5 * S);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0a0c18'; ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.strokeText(text, cx, baseY);
    const tg2 = ctx.createLinearGradient(0, baseY - size * 0.55, 0, baseY + size * 0.55);
    tg2.addColorStop(0, '#f2ffff'); tg2.addColorStop(0.42, P.shardL); tg2.addColorStop(0.78, '#8d7bff'); tg2.addColorStop(1, '#5a48c2');
    ctx.fillStyle = tg2;
    ctx.fillText(text, cx, baseY);
    ctx.restore();
    // kira sparkles riding the lettering
    const spark = (sx, sy, r, a) => {
      ctx.strokeStyle = withAlpha('#ffffff', a); ctx.lineWidth = 1.2 * S;
      ctx.beginPath(); ctx.moveTo(sx - r, sy); ctx.lineTo(sx + r, sy); ctx.moveTo(sx, sy - r); ctx.lineTo(sx, sy + r); ctx.stroke();
    };
    const tw1 = 0.4 + 0.6 * Math.abs(Math.sin(this.t * 2.2));
    spark(cx - size * 1.72, baseY - size * 0.38, 4.5 * S, tw1 * 0.9);
    spark(cx + size * 1.80, baseY + size * 0.18, 3.5 * S, (1 - tw1) * 0.8);
    // gold rule + centre diamond
    const ruleW = size * 3.9, ry2 = baseY + size * 0.72;
    const rgrad = ctx.createLinearGradient(cx - ruleW / 2, 0, cx + ruleW / 2, 0);
    rgrad.addColorStop(0, 'rgba(255,212,121,0)'); rgrad.addColorStop(0.5, withAlpha(P.goldL, 0.95)); rgrad.addColorStop(1, 'rgba(255,212,121,0)');
    ctx.fillStyle = rgrad; ctx.fillRect(cx - ruleW / 2, ry2, ruleW, 1.8 * S);
    ctx.save();
    ctx.translate(cx, ry2 + 0.9 * S); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = P.goldL; ctx.fillRect(-3 * S, -3 * S, 6 * S, 6 * S);
    ctx.fillStyle = '#fff2cf'; ctx.fillRect(-1.2 * S, -1.2 * S, 2.4 * S, 2.4 * S);
    ctx.restore();
    uiText('S O U L S H A R D   H U N T E R', cx, ry2 + (compact ? 11 : 15) * S, { size: (compact ? 9.5 : 12.5) * S, align: 'center', color: withAlpha('#d8c08a', 0.9), weight: '700' });
  },
  notesBtn() {   // R20.1: parked at the bottom, just above the 金庫/最高威脅 footer line
    const S = this.menuScale(); const w = 180 * S, h = 28 * S;
    return { x: view.W / 2 - w / 2, y: view.H * 0.93 - 46 * S, w, h };
  },
  // very small CJK-aware wrap that draws + returns line count
  wrapNote(str, x, y, maxw, size) {
    const lines = []; let line = '';
    for (const ch of str) { if (textWidth(line + ch, size, '500') > maxw && line) { lines.push(line); line = ch; } else line += ch; }
    if (line) lines.push(line);
    lines.forEach((l, i) => uiText(l, x, y + i * (size + 4), { size, color: P.gray4, weight: '500' }));
    return lines.length;
  },
  // R20: a patch-note body → coloured segments. 《…》 spans tint soul-teal (feature names);
  // number-ish tokens (12 · ×1.5 · 90–240 · 21→27 · 96×96 · 45%) auto-highlight gold; rest base.
  noteSegs(body, baseColor) {
    const out = [];
    const numRe = /([0-9]+(?:[.,][0-9]+)?(?:\s*[×/／→~–—\-]\s*[0-9]+(?:[.,][0-9]+)?)*\s*(?:px|%|％)?|×\s*[0-9]+(?:\.[0-9]+)?)/g;
    for (const part of body.split(/(《[^》]*》)/)) {
      if (!part) continue;
      if (part[0] === '《') { out.push({ s: part.slice(1, -1), c: P.shardL, w: '700' }); continue; }
      let last = 0, m;
      while ((m = numRe.exec(part))) {
        if (m.index > last) out.push({ s: part.slice(last, m.index), c: baseColor, w: '500' });
        out.push({ s: m[0], c: P.goldL, w: '800' });
        last = m.index + m[0].length;
      }
      if (last < part.length) out.push({ s: part.slice(last), c: baseColor, w: '500' });
    }
    return out;
  },
  // R20: wrap coloured segments to maxw (CJK char-level) and draw each line as runs; returns line count.
  drawRich(segs, x, y, maxw, size, S) {
    const chars = [];
    for (const seg of segs) for (const ch of seg.s) chars.push({ ch, c: seg.c, w: seg.w });
    const lines = []; let line = [], lw = 0;
    for (const c of chars) {
      if (c.ch === '\n') { lines.push(line); line = []; lw = 0; continue; }
      const cw = textWidth(c.ch, size, c.w);
      if (lw + cw > maxw && line.length) { lines.push(line); line = [c]; lw = cw; }
      else { line.push(c); lw += cw; }
    }
    if (line.length) lines.push(line);
    const step = size + 4 * S;
    lines.forEach((ln, i) => {
      let cx = x, run = '', rc = null, rw = null;
      const flush = () => { if (run) { uiText(run, cx, y + i * step, { size, color: rc, weight: rw }); cx += textWidth(run, size, rw); run = ''; } };
      for (const c of ln) { if (c.c !== rc || c.w !== rw) { flush(); rc = c.c; rw = c.w; } run += c.ch; }
      flush();
    });
    return lines.length;
  },
  // R17 B13: two views — a version LIST (one row per round, mirroring docs/changelog/) and,
  // after clicking a row, that version's DETAIL page (◀ 返回 steps back to the list).
  drawNotes(S) {
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    const w = Math.min(view.W * 0.82, 660 * S), h = Math.min(view.H * 0.72, 540 * S);
    const x = (view.W - w) / 2, y = (view.H - h) / 2;
    const sel = this.notesSel != null ? PATCH_NOTES[this.notesSel] : null;
    uiRect(0, 0, view.W, view.H, withAlpha('#0b0d1a', 0.6));
    uiRect(x, y, w, h, withAlpha('#161a30', 0.99), { radius: 12 * S, stroke: P.ink2, lw: 2 });
    uiRect(x, y, w, 46 * S, withAlpha('#1f2542', 0.98), { radius: 12 * S });
    uiText(sel ? ('📜 ' + sel.v + (sel.title ? '　·　' + sel.title : '')) : '📜 更新日誌 · 版本一覽', x + w / 2, y + 29 * S, { size: sel ? 16 * S : 19 * S, align: 'center', color: '#fff', weight: '900' });
    const closeR = { x: x + w - 38 * S, y: y + 9 * S, w: 28 * S, h: 28 * S };
    uiRect(closeR.x, closeR.y, closeR.w, closeR.h, withAlpha('#3a2030', 0.9), { radius: 6 * S, stroke: P.redD, lw: 2 });
    uiText('✕', closeR.x + closeR.w / 2, closeR.y + closeR.h / 2 + 1 * S, { size: 15 * S, align: 'center', baseline: 'middle', color: P.redL, weight: '900' });
    this._notesBack = null;
    if (sel) {   // back button (top-left of the header)
      const backR = { x: x + 10 * S, y: y + 9 * S, w: 70 * S, h: 28 * S };
      const bh = inside(mx, my, backR);
      uiRect(backR.x, backR.y, backR.w, backR.h, withAlpha(bh ? '#27306a' : '#141832', 0.95), { radius: 6 * S, stroke: withAlpha(P.shardL, bh ? 0.9 : 0.5), lw: 1.5 });
      uiText('◀ 返回', backR.x + backR.w / 2, backR.y + backR.h / 2 + 1 * S, { size: 11 * S, align: 'center', baseline: 'middle', color: '#cfe0ff', weight: '700' });
      this._notesBack = backR;
    }
    const ctx = ctxRaw(); ctx.save(); ctx.beginPath(); ctx.rect(x, y + 50 * S, w, h - 70 * S); ctx.clip();
    let yy = y + 64 * S - (this.notesScroll || 0); const left = x + 22 * S, lineW = w - 44 * S;
    this._noteRows = [];
    if (!sel) {   // ---- version list: one clickable row per round ----
      const rowH = 44 * S, gap = 8 * S;
      PATCH_NOTES.forEach((note, i) => {
        const r = { x: x + 16 * S, y: yy, w: w - 32 * S, h: rowH, i };
        const hov = inside(mx, my, r);
        uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#27306a' : (i === 0 ? '#1d2440' : '#171c34'), 0.96), { radius: 8 * S, stroke: hov ? P.shardL : (i === 0 ? withAlpha(P.goldL, 0.55) : P.ink2), lw: hov ? 2.5 : 1.5 });
        uiText(note.v, r.x + 14 * S, r.y + 19 * S, { size: 14 * S, color: i === 0 ? P.goldL : '#eaf2ff', weight: '900' });
        if (i === 0) uiText('最新', r.x + 14 * S + textWidth(note.v, 14 * S, '900') + 8 * S, r.y + 18 * S, { size: 9 * S, color: P.emberL, weight: '800' });
        this.clipNote(note.title || '', r.x + 14 * S, r.y + 35 * S, r.w - 120 * S, 10.5 * S, P.gray4);
        uiText((note.date ? note.date + '　·　' : '') + note.items.length + ' 項　›', r.x + r.w - 12 * S, r.y + r.h / 2 + 4 * S, { size: 10 * S, align: 'right', color: P.gray3, weight: '700' });
        this._noteRows.push(r);
        yy += rowH + gap;
      });
    } else {   // ---- detail page for the selected version ----
      // R17 B16: the date used to share the first item's baseline (right-aligned over full-width
      // wrapped text → overlap) — it now lives in the header next to the close button instead,
      // and is skipped entirely when a narrow panel would run it into the centred title
      // (the version list already shows each round's date).
      if (sel.date) {
        const tw2 = textWidth('📜 ' + sel.v + (sel.title ? '　·　' + sel.title : ''), 16 * S, '900');
        const dLeft = closeR.x - 8 * S - textWidth(sel.date, 10 * S, '600');
        if (dLeft > x + w / 2 + tw2 / 2 + 6 * S) uiText(sel.date, closeR.x - 8 * S, y + 29 * S, { size: 10 * S, align: 'right', color: P.gray3 });
      }
      // R20: rich items — { h, t } draws a coloured category chip + body; a plain string keeps
      // the legacy look but still gets number/《》 highlighting routed through drawRich.
      const step = 16 * S;
      for (const it of sel.items) {
        if (typeof it === 'string') {
          const n = this.drawRich(this.noteSegs('· ' + it, P.gray4), left + 4 * S, yy, lineW - 8 * S, 12 * S, S);
          yy += n * step + 6 * S;
        } else {
          uiText('▸ ' + it.h, left + 4 * S, yy, { size: 12.5 * S, color: P.shardL, weight: '800' });
          yy += 17 * S;
          const n = this.drawRich(this.noteSegs(it.t || '', P.gray4), left + 16 * S, yy, lineW - 20 * S, 12 * S, S);
          yy += n * step + 9 * S;
        }
      }
    }
    this.notesMax = Math.max(0, (yy + (this.notesScroll || 0)) - (y + 64 * S) - (h - 80 * S));
    ctx.restore();
    uiText(sel ? '滑鼠滾輪捲動　·　Esc / ◀ 返回版本一覽' : '點擊版本查看詳細內容　·　Esc / 點外部關閉', x + w / 2, y + h - 14 * S, { size: 10 * S, align: 'center', color: P.gray3 });
    this._notesClose = closeR; this._notesPanel = { x, y, w, h };
  },
  // single-line CJK clip with ellipsis (local helper for the version list rows)
  clipNote(str, x, y, maxw, size, color) {
    let s = str;
    while (s.length > 1 && textWidth(s, size, '600') > maxw) s = s.slice(0, -1);
    if (s.length < str.length && s.length > 1) s = s.slice(0, -1) + '…';
    uiText(s, x, y, { size, color: color || P.gray4, weight: '600' });
  },

  drawMenu(S) {
    S = this.menuScale();   // R17 UI-sweep: fonts/sizes follow the fitted menu scale
    // R20.1: the old centre drifting hero is retired — the cover squad (drawBackdrop)
    // carries the character presence now; the menu floats over the bottom scrim.
    const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const b of this.layoutMenu()) {
      const hov = inside(mx, my, b.r);
      // R20.1 player ask: ONE unified scheme for all five — cold ash glass + soul-teal accent
      const accent = P.shardL;
      if (hov) uiRect(b.r.x - 3 * S, b.r.y - 3 * S, b.r.w + 6 * S, b.r.h + 6 * S, withAlpha(accent, 0.0), { radius: 12 * S, stroke: withAlpha(accent, 0.28), lw: 5 * S });   // hover glow ring
      uiRect(b.r.x, b.r.y, b.r.w, b.r.h, withAlpha(hov ? '#17304a' : '#0f1a2c', 0.93), { radius: 10 * S, stroke: hov ? accent : withAlpha(accent, b.big ? 0.6 : 0.38), lw: hov ? 3 : 2 });
      uiRect(b.r.x + 7 * S, b.r.y + 2.5 * S, b.r.w - 14 * S, 1.5 * S, withAlpha('#ffffff', hov ? 0.14 : 0.07), { radius: 1 * S });   // top glass light
      // R20.1: icons live in ONE uniform left slot (same size, same centre axis — emoji
      // glyph widths can't drift them); text centres on the button cell itself.
      const cx = b.r.x + b.r.w / 2, ty = b.r.y + b.r.h / 2 + 5 * S, col = hov ? '#fff' : '#dcebff';
      const spi = b.label.indexOf(' '), icon = spi > 0 ? b.label.slice(0, spi) : '', text = spi > 0 ? b.label.slice(spi + 1) : b.label;
      if (icon) uiText(icon, b.r.x + 22 * S, ty, { size: 14 * S, align: 'center', color: col, weight: '800', shadowColor: 'rgba(0,0,0,0.8)' });
      uiText(text, cx, ty, { size: 15 * S, align: 'center', color: col, weight: '800', shadowColor: 'rgba(0,0,0,0.8)' });
    }
    // 📜 更新日誌 button
    const nb = this.notesBtn(), nhov = inside(mx, my, nb);
    uiRect(nb.x, nb.y, nb.w, nb.h, withAlpha(nhov ? '#33251a' : '#171225', 0.92), { radius: 7 * S, stroke: nhov ? P.goldL : withAlpha(P.goldL, 0.45), lw: nhov ? 2.5 : 1.5 });
    uiText('📜 更新日誌 · ' + GAME_VERSION, nb.x + nb.w / 2, nb.y + nb.h / 2 + 1 * S, { size: 12 * S, align: 'center', baseline: 'middle', color: nhov ? '#fff' : P.goldL, weight: '700' });
    if (this.mobileHint) uiText('📱 目前建議使用實體鍵盤遊玩　·　完整觸控操作尚未支援', view.W / 2, view.H * 0.885, { size: 11 * S, align: 'center', color: withAlpha(P.goldL, 0.9) });   // R21.8: honest platform support (non-blocking, above the vault line)
    uiText('金庫 ' + Math.round(META.gold || 0) + '　·　最高威脅 ' + (META.stats.bestStage || 0) + ' 級　·　最高分 ' + (META.stats.bestScore || 0), view.W / 2, view.H * 0.93, { size: 12 * S, align: 'center', color: P.gray3 });   // R17/2.1:「金庫」already labels it — no broken 🪙 glyph
    uiText('空白鍵 快速進入上次存檔　·　Esc 設定', view.W / 2, view.H * 0.97, { size: 11 * S, align: 'center', color: withAlpha(P.gray2, 0.8) });
  },

  drawSlots(S) {
    uiText('選擇存檔', view.W / 2, view.H * 0.085 + 52 * S, { size: 18 * S, align: 'center', color: '#ffd479', weight: '800' });
    const L = this.layoutSlots(); const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
    for (const c of L.cards) {
      const s = this.slots[c.i]; const hov = inside(mx, my, c.r); const r = c.r;
      uiRect(r.x, r.y, r.w, r.h, withAlpha(hov ? '#1b2342' : '#141832', 0.97), { radius: 10 * S, stroke: hov ? P.shardL : withAlpha(P.shardL, 0.35), lw: hov ? 3 : 2 });
      uiRect(r.x, r.y, 5 * S, r.h, s && !s.empty ? P.shardL : withAlpha('#556', 0.8), { radius: 2 * S });
      const px = r.x + 16 * S;
      if (!s || s.empty) {
        uiText('存檔格 ' + (c.i + 1), px, r.y + 30 * S, { size: 16 * S, color: '#cfe0ff', weight: '800' });
        uiText('— 空的 — 點擊開始新遊戲', px, r.y + 56 * S, { size: 13 * S, color: P.gray3 });
      } else {
        const char = Characters.get(s.char); const cn = char ? char.name : s.char;
        uiText('存檔格 ' + (c.i + 1) + '　' + cn + (s.active ? '　★使用中' : ''), px, r.y + 26 * S, { size: 15 * S, color: '#fff', weight: '800' });
        uiText('遊戲時數 ' + fmtTime(s.playTime) + '　·　成就 ' + s.achievements + '　·　金庫 ' + Math.round(s.gold || 0), px, r.y + 48 * S, { size: 12 * S, color: P.shardL, weight: '700' });   // R17/2.1
        if (r.h >= 78 * S) uiText('最高威脅 ' + s.bestStage + ' 級　·　最高分 ' + s.bestScore + '　·　通關 ' + s.clears + '　·　生態 ' + s.biomesUnlocked + '/10', px, r.y + 68 * S, { size: 11.5 * S, color: P.gray3 });   // R17/1.1: dropped when cards compress
        // delete button (two-click confirm)
        const d = c.delR; const confirming = this.confirm === c.i;
        uiRect(d.x, d.y, d.w, d.h, withAlpha(confirming ? '#5a2030' : '#2a1620', 0.95), { radius: 6 * S, stroke: withAlpha('#ff8a7a', confirming ? 0.9 : 0.4), lw: confirming ? 2 : 1 });
        uiText(confirming ? '確認?' : '刪除', d.x + d.w / 2, d.y + d.h / 2 + 4 * S, { size: 11 * S, align: 'center', color: confirming ? '#ffb4a8' : withAlpha('#ff8a7a', 0.85), weight: '700' });
      }
    }
    const bhov = inside(mx, my, L.back);
    uiRect(L.back.x, L.back.y, L.back.w, L.back.h, withAlpha(bhov ? '#27305a' : '#161b34', 0.95), { radius: 8 * S, stroke: withAlpha(P.shardL, bhov ? 0.8 : 0.4), lw: 2 });
    uiText('返回', L.back.x + L.back.w / 2, L.back.y + L.back.h / 2 + 5 * S, { size: 15 * S, align: 'center', color: '#cfe0ff', weight: '800' });
  },
};

refs.title = titleScene;
