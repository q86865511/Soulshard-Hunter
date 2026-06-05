// Bootstrap: wire engine + content, then run the loop.
import { initRenderer, clear, updateCamera, worldToScreen, view } from './engine/renderer.js';
import { initInput, endFrameInput, pressed } from './engine/input.js';
import { startLoop } from './engine/loop.js';
import { Audio } from './engine/audio.js';
import { setScene, updateActive, renderActive, applyPending, getScene } from './game/scene.js';
import { loadMeta, getMeta, newRun, applySettings } from './game/state.js';
import { registryStats, Enemies } from './game/content/registry.js';

// content + art registration (import for side effects)
import './art/core.js';
import './art/heroes.js';   // 原#17: unique hero body archetypes (must load before characters)
import './art/icons.js';
import './art/content_icons.js';
import './art/weapons.js';
import './art/biomes.js';
import './art/hub.js';
import './art/lobby.js';
// round-5 town art (multi-room hub: NPCs + room decor)
import './art/town_npcs_a.js';
import './art/town_npcs_b.js';
import './art/town_church.js';
import './art/town_guildforge.js';
import './art/town_decor.js';
import './art/town_personal.js';
import './art/reaper.js';
import './game/content/enemies.js';
import './game/content/abilities.js';
import './game/content/items.js';
import './game/content/equipment.js';
import './game/content/talents.js';
import './game/content/facilities.js';
import './game/content/weapons.js';
import './game/content/characters.js';

// workflow-generated content + art (fault-isolated via dynamic import)
import './art/gen/index.js';
import './game/content/gen/index.js';

import { refs } from './game/scenes/refs.js';
import { initCheats } from './game/cheats.js';
import './game/scenes/run.js';
import './game/scenes/hub.js';
import './game/scenes/title.js';

function setLoad(pct) {
  const b = document.getElementById('loadbar');
  if (b) b.style.width = pct + '%';
}

function boot() {
  const canvas = document.getElementById('game');
  initRenderer(canvas);
  initInput(canvas, () => ({ scale: 1 }));
  loadMeta();
  applySettings();
  initCheats();
  setLoad(100);

  setScene(refs.title, {});
  applyPending();

  const loading = document.getElementById('loading');
  if (loading) { loading.style.opacity = '0'; setTimeout(() => loading.remove(), 450); }

  // unlock audio on first user gesture
  const resumeOnce = () => { Audio.resume(); window.removeEventListener('pointerdown', resumeOnce); window.removeEventListener('keydown', resumeOnce); };
  window.addEventListener('pointerdown', resumeOnce);
  window.addEventListener('keydown', resumeOnce);

  // debug surface for self-testing
  window.__DBG = {
    scene: getScene, meta: getMeta, reg: registryStats,
    enemyIds: () => Enemies.ids(),
    startRun() { setScene(refs.run, { run: newRun() }); applyPending(); return 'run'; },
    autoplay(secs = 15) {
      const cv = document.getElementById('game');
      cv.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0, clientX: innerWidth / 2, clientY: innerHeight / 2 }));
      const held = {};
      const setKey = (code, down) => {
        if (down && !held[code]) { window.dispatchEvent(new KeyboardEvent('keydown', { code })); held[code] = 1; }
        else if (!down && held[code]) { window.dispatchEvent(new KeyboardEvent('keyup', { code })); held[code] = 0; }
      };
      const iv = setInterval(() => {
        const s = getScene(); if (!s || !s.world) return;
        if (s.choice) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit1' })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Digit1' })), 30); return; }
        const p = s.player; if (!p || p.dead) return;
        const e = s.world.nearestEnemy(p.x, p.y);
        if (e) { const sc = worldToScreen(e.x, e.y); cv.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: sc.x / view.dpr, clientY: sc.y / view.dpr })); }
        let pk = null, pd = 1e9;
        for (const q of s.world.pickups) { if (q.type === 'chest') continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < pd) { pd = d; pk = q; } }
        let tx, ty;
        if (pk) { tx = pk.x - p.x; ty = pk.y - p.y; }       // grab loot first
        else if (e) {
          const dx = p.x - e.x, dy = p.y - e.y, dd = Math.hypot(dx, dy) || 1;
          const desire = dd < 42 ? 1 : dd > 85 ? -1 : 0;    // keep mid-range
          tx = (-dy / dd) * 30 + (dx / dd) * desire * 30;    // strafe + adjust range
          ty = (dx / dd) * 30 + (dy / dd) * desire * 30;
        } else { const ex = s.map.exit; tx = ex.x - p.x; ty = ex.y - p.y; }
        setKey('KeyD', tx > 6); setKey('KeyA', tx < -6); setKey('KeyS', ty > 6); setKey('KeyW', ty < -6);
      }, 60);
      setTimeout(() => {
        clearInterval(iv);
        cv.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0 }));
        Object.keys(held).forEach((c) => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })));
        window.__autodone = true;
      }, secs * 1000);
      return 'autoplay ' + secs + 's';
    },
    gallery() {
      const s = getScene(); if (!s || !s.world) return 'no run';
      s.player.takeDamage = () => {};
      s.world.enemies.length = 0;
      const ids = Enemies.ids();
      const cx = s.player.x, cy = s.player.y, cols = 8, sp = 34;
      ids.forEach((id, i) => {
        const x = cx + ((i % cols) - cols / 2) * sp;
        const y = cy - 60 + Math.floor(i / cols) * sp;
        const e = s.world.spawnEnemy(id, x, y);
        if (e) { e.update = () => { e.spawnT = 0; }; } // freeze in place for the gallery
      });
      return ids.length + ' spawned';
    },
    snap() {
      const s = getScene();
      const p = s && s.player;
      return {
        scene: s === refs.title ? 'title' : s === refs.hub ? 'hub' : s === refs.run ? 'run' : 'other',
        wave: s && s.wave, state: s && s.state, dead: s && s.dead,
        hp: p && Math.round(p.hp), maxHp: p && p.maxHp,
        enemies: s && s.world && s.world.enemies.length,
        projectiles: s && s.world && s.world.projectiles.length,
        pickups: s && s.world && s.world.pickups.length,
        gold: s && s.run && s.run.gold, kills: s && s.run && s.run.kills,
      };
    },
  };

  startLoop({
    fixed: 1 / 120,          // 120 Hz simulation: smoother + lower input latency
    update: (dt) => {
      // (mute is in the settings menu now — M is the minimap)
      updateActive(dt);
      updateCamera(dt);
      endFrameInput();
    },
    render: () => {
      clear();
      renderActive();
    },
  });
}

boot();
