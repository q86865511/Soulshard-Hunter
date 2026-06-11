// Bootstrap: wire engine + content, then run the loop.
import { initRenderer, clear, updateCamera, worldToScreen, view } from './engine/renderer.js';
import { initInput, endFrameInput, pressed } from './engine/input.js';
import { startLoop } from './engine/loop.js';
import { Audio, musicDebug } from './engine/audio.js';
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
import './art/biome_decor.js';   // round 6.1: rich per-biome decoration sets
import './art/hub.js';
import './art/lobby.js';
// round-5 town art (multi-room hub: NPCs + room decor)
import './art/town_floor.js';   // polished hub flooring + walls (replaces the dungeon grid)
import './art/town_npcs_a.js';
import './art/town_npcs_b.js';
import './art/town_church.js';
import './art/town_guildforge.js';
import './art/town_decor.js';
import './art/town_personal.js';
import './art/reaper.js';
import './game/content/enemies.js';
import './game/content/enemies_biome.js';  // R18/B4: 5 new biome mobs (hand-written content + art)
import './game/content/bosses_biome.js';   // R18/B3: 5 new-biome final bosses (hand-written content + art)
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
import { initNet } from './net/ui.js';   // cloud account bar + leaderboard (Phase 1)
import { initCheats } from './game/cheats.js';
import './game/scenes/run.js';
import './game/scenes/hub.js';
import './game/scenes/title.js';
import './game/scenes/coop.js';   // Phase 2: guest co-op scene (refs.coop)
import { initCoopBridge } from './game/net/coopbridge.js';   // realtime lobby -> scene switch
import { CoopHost } from './game/net/coophost.js';
import { buildRunStart, encodeSnapshot } from './game/net/protocol.js';

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
  try { initNet(); } catch (e) { /* cloud UI is optional; never block boot */ }
  try { initCoopBridge(); } catch (e) { /* co-op bridge is optional; never block boot */ }
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
    scene: getScene, meta: getMeta, reg: registryStats, music: musicDebug,
    enemyIds: () => Enemies.ids(),
    // navigate scenes directly (headless rAF is throttled, so input-driven swaps are unreliable)
    nav(name) { setScene(refs[name] || refs.title, name === 'run' ? { run: newRun() } : {}); applyPending(); return name; },
    // manually pump N sim frames + one render (for screenshots under throttled rAF)
    pump(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i++) { updateActive(dt); updateCamera(dt); endFrameInput(); } clear(); renderActive(); return n; },
    startRun() { setScene(refs.run, { run: newRun() }); applyPending(); return 'run'; },
    // Phase 2 self-test: drive a host co-op run offline, then feed its runstart+snapshot
    // into a guest scene and render it — validates the whole encode->decode->render path.
    coopRoundTrip() {
      const room = { code: 'TEST01', hostCid: 'cH', started: true, cfg: { biomeId: 'crypt', difficulty: 1 },
        members: [
          { cid: 'cH', uid: '1', username: 'Host', host: true, ready: true, charId: 'hunter', weaponId: 'w_soulbolt' },
          { cid: 'cG', uid: '2', username: 'Guest', host: false, ready: true, charId: 'ranger', weaponId: 'w_homing' },
        ] };
      const coop = new CoopHost(room, 'cH');
      setScene(refs.run, { run: newRun({ biomeId: 'crypt', difficulty: 1, characterId: 'hunter' }), coop }); applyPending();
      const host = getScene();
      host.player.takeDamage = () => {};
      // keep the remote "connected" each frame (the host's input-silence check would otherwise retire it)
      const keepAlive = () => coop.players.forEach((p) => { if (!p.isLocal) p.silentT = 0; });
      for (let i = 0; i < 360; i++) { keepAlive(); host.update(1 / 60); }
      const slot = coop.players.find((p) => p.cid === 'cG');
      const beforeX = slot.player.x; slot.player.netInput = { move: { x: 1, y: 0 }, dash: false };
      for (let i = 0; i < 120; i++) { keepAlive(); host.update(1 / 60); }
      const rs = buildRunStart(host); const snap = encodeSnapshot(host);
      const out = { rsPlayers: rs.players.length, snapPlayers: snap.pl.length, snapEnemies: snap.en.length,
        snapProjectiles: snap.pr.length, hostPlayers: host.world.players.length, remoteMoved: slot.player.x - beforeX, hud: snap.hud };
      // feed into a guest scene
      setScene(refs.coop, { start: { you: 'cG', role: 'guest', hostCid: 'cH', room }, runstart: rs }); applyPending();
      const guest = getScene();
      try { guest.onSnap(snap); for (let i = 0; i < 60; i++) guest.update(1 / 60); guest.render(); out.guestRendered = true; }
      catch (e) { out.guestRendered = false; out.guestError = String(e && e.stack || e); }
      out.guestEnemies = guest.guest ? guest.guest.enemies.size : -1;
      out.guestPlayers = guest.players ? guest.players.length : -1;
      out.guestProjectiles = guest.guest ? guest.guest.projectiles.length : -1;
      setScene(refs.title, {}); applyPending();
      return out;
    },
    // Phase 2: deterministic offline check of disconnect handling — a remote that goes
    // silent (>4s no input) must be retired, and the run must NOT end while the host lives.
    coopSilenceTest() {
      const room = { code: 'TEST02', hostCid: 'cH', started: true, cfg: { biomeId: 'crypt', difficulty: 1 },
        members: [
          { cid: 'cH', uid: '1', username: 'Host', host: true, ready: true, charId: 'hunter', weaponId: 'w_soulbolt' },
          { cid: 'cG', uid: '2', username: 'Guest', host: false, ready: true, charId: 'ranger', weaponId: 'w_homing' },
        ] };
      const coop = new CoopHost(room, 'cH');
      setScene(refs.run, { run: newRun({ biomeId: 'crypt', difficulty: 1, characterId: 'hunter' }), coop }); applyPending();
      const host = getScene(); const g = coop.players[1];
      const keep = () => { host.player.takeDamage = () => {}; host.player.idleT = 0; host.player.hp = host.player.maxHp; };
      for (let i = 0; i < 60; i++) { g.silentT = 0; g.player.netInput = { move: { x: 0, y: 0 }, dash: false }; keep(); host.update(1 / 60); }   // 1s "connected"
      const leftWhileActive = g.left;
      for (let i = 0; i < 360; i++) { keep(); host.update(1 / 60); }   // 6s of input silence
      const out = { leftWhileActive, leftAfterSilence: g.left, guestDead: g.player.dead, runEnded: host.dead, hostAlive: !host.player.dead };
      setScene(refs.title, {}); applyPending();
      return out;
    },
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
