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
import './art/town_outdoor.js';   // R18/B1+B2: outdoor-town tileset + building facades + nature props
import './art/town_ruin_tiles.js';    // R19: ruined-town exterior + interior floor/wall tilesets
import './art/town_ruin_facades.js';  // R19: 6 ruined building facades (72×72)
import './art/town_ruin_decor.js';    // R19: environment props (pillars, rubble, dead trees, crystals …)
import './art/town_ruin_stations.js'; // R19: interactable stations (portal_grand, lamps, torchposts …)
import './art/town_pets_decor.js';   // R18/B10: personal-room decorations + mini-pet sprites
import './art/town_npcs_a.js';
import './art/town_npcs_b.js';
import './art/town_church.js';
import './art/town_guildforge.js';
import './art/town_decor.js';
import './art/town_personal.js';
import './art/title_scene.js';          // R20.1: title-cover dark tower
import './art/town_ruin_walls.js';      // R20/B1: 2.5D wall faces + depth bands + void tile + door glow
import './art/town_ruin_facades2.js';   // R20/B1: 96×96 grand ruin facades
import './art/town_ruin_stations2.js';  // R20/B1: large interior stations + boss_pillar
import './art/town_ruin_interior.js';   // R20/B1: ruin-flavoured interior props (rint_*)
import './art/reaper.js';
import './game/content/enemies.js';
import './game/content/enemies_biome.js';  // R18/B4: 5 new biome mobs (hand-written content + art)
import './game/content/bosses_biome.js';   // R18/B3: 5 new-biome final bosses (hand-written content + art)
import './game/content/event_mobs.js';     // R20/B5: special-event mobs (bomber/bomb/boulder/goblin)
import './game/content/weapons_r20.js';    // R20/B7: final-six start weapons + evolved forms (before heroes_r20 — ids referenced there)
import './game/content/heroes_r20.js';     // R20/B7: the final 6 heroes (21→27)
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
import { BOSS_MOVES, bossMoveTick } from './game/content/boss_moves.js';

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
      // R21: stamp a leap_slam-style airborne lift on one live enemy BEFORE the encode
      // (the host scene is torn down once we switch to the guest, so encode must happen now)
      // — verifies the new mvLift tuple field round-trips so the guest renders the lift.
      const liftEnemy = host.world.enemies.find((e) => !e.dead);
      if (liftEnemy) liftEnemy.mvLift = 4.6;
      const rs = buildRunStart(host); const snap = encodeSnapshot(host);
      const liftTuple = liftEnemy && snap.en.find((x) => x[0] === liftEnemy._nid);
      const liftEncOk = !!(liftTuple && liftTuple.length > 8 && Math.abs(liftTuple[8] - 46) <= 1);
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
      // mvLift decoded onto the matching guest enemy? (null = no live enemy to test against)
      const liftGuest = liftEnemy && guest.guest && guest.guest.enemies.get(liftEnemy._nid);
      out.mvLiftRoundTrip = liftEnemy ? (liftEncOk && !!liftGuest && Math.abs((liftGuest.mvLift || 0) - 4.6) <= 0.2) : null;
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
    // R20 offline self-test: drives the full host→guest co-op encode/decode/render path for
    // boss moves (leap_slam / wall_cage / charge_combo / shock_lines) and the 4 R20 event
    // mobs, WITHOUT needing two real browser tabs or a relay server.
    //
    // DESIGN: encodeSnapshot(scene) reads scene.coop, which run.js exit() nulls out when
    // the scene switches.  We therefore run ALL boss-move tests while the host run scene is
    // still active (collecting per-move snapshot arrays), switch to the guest coop scene
    // exactly ONCE at the end, then replay every snapshot array through the guest and assert.
    // This mirrors the sequence in coopRoundTrip but with multiple encode-passes.
    coopBossSyncTest() {
      const out = {
        bossId: null, bossSpawned: false,
        eventsSpawnedHost: [],
        moves: {},
        eventGuestSeen: [],
        guestRenderedOk: false,
        errors: [],
      };

      // ── 1. Set up host run scene (same as coopRoundTrip) ──────────────────
      let host, hostWorld, coop, boss;
      try {
        const room = {
          code: 'BSTEST', hostCid: 'cH', started: true,
          cfg: { biomeId: 'crypt', difficulty: 3 },
          members: [
            { cid: 'cH', uid: '1', username: 'HostBoss', host: true, ready: true, charId: 'hunter', weaponId: 'w_soulbolt' },
            { cid: 'cG', uid: '2', username: 'GuestBoss', host: false, ready: true, charId: 'ranger', weaponId: 'w_homing' },
          ],
        };
        coop = new CoopHost(room, 'cH');
        setScene(refs.run, { run: newRun({ biomeId: 'crypt', difficulty: 3, characterId: 'hunter' }), coop });
        applyPending();
        host = getScene();
        hostWorld = host.world;
        host.player.takeDamage = () => {};
        host.player.hp = host.player.maxHp;
        const keepAlive = () => coop.players.forEach((p) => { if (!p.isLocal) p.silentT = 0; });
        // pump 120 frames so the world is live and the map is fully loaded. Clear the
        // first-run tutorial pause + any choice panel each frame (they would otherwise
        // freeze host.update on a fresh save — see CLAUDE.md headless sim-test traps).
        for (let i = 0; i < 120; i++) {
          keepAlive();
          host.hudTut = false; host.choice = null; host.equipChoice = null; host.eventChoice = null; host.curseChoice = null; host.anvilChoice = null;
          host.player.hp = host.player.maxHp;
          host.update(1 / 60);
        }
      } catch (e) {
        out.errors.push('setup: ' + String(e && e.stack || e));
        try { setScene(refs.title, {}); applyPending(); } catch (_) {}
        return out;
      }

      // ── 2. Pick a registered WIRE boss (try several ids, use first that exists) ──
      const WIRE_BOSS_CANDIDATES = ['b3_leviathan', 'g_magmacolossus', 'b3_thornking', 'g_plagueheart', 'b3_bogmaw'];
      let bossDef = null;
      for (const id of WIRE_BOSS_CANDIDATES) {
        const d = Enemies.get(id);
        if (d) { bossDef = d; out.bossId = id; break; }
      }
      if (!bossDef) {
        out.errors.push('no WIRE boss def found — check bosses_biome.js registration');
        try { setScene(refs.title, {}); applyPending(); } catch (_) {}
        return out;
      }

      // ── 3. Spawn boss near the host player ────────────────────────────────
      try {
        const px = host.player.x, py = host.player.y;
        boss = hostWorld.spawnEnemy(out.bossId, px + 40, py, { hpScale: 0.1, quiet: true });
        if (!boss) {
          // spawnEnemy returned null — grab last enemy as fallback
          boss = hostWorld.enemies[hostWorld.enemies.length - 1] || null;
        }
        out.bossSpawned = !!boss;
        if (boss) {
          boss.phase = 2;   // ensure minPhase checks pass for all moves
          boss.mvCd = 999;  // prevent the automatic scheduler from firing between forced tests
          boss.hp = boss.maxHp;
          // assign a network id now so encodeSnapshot includes this enemy in every snapshot
          if (boss._nid == null) boss._nid = coop.nextNid();
        }
      } catch (e) {
        out.errors.push('boss spawn: ' + String(e && e.stack || e));
      }

      // ── 4. Spawn the 4 R20 event mobs ────────────────────────────────────
      const EVT_IDS = ['evt_bomber', 'evt_bomb', 'evt_boulder', 'evt_goblin'];
      for (const id of EVT_IDS) {
        try {
          const px = host.player.x, py = host.player.y;
          const evMob = hostWorld.spawnEnemy(id, px + (Math.random() * 30 - 15), py + 30, { quiet: true });
          if (evMob) {
            if (evMob._nid == null) evMob._nid = coop.nextNid();
            out.eventsSpawnedHost.push(id);
          }
        } catch (e) {
          out.errors.push('evt spawn ' + id + ': ' + String(e && e.stack || e));
        }
      }

      // ── 5. Per-move test (all run while host scene is still active) ────────
      // Each test returns a {snapshots, meta} bundle. The guest replay happens later.
      const MOVES_TO_TEST = ['leap_slam', 'wall_cage', 'charge_combo', 'shock_lines'];
      // per-move snapshot bundles: { snaps: [], meta: {...} }
      const moveBundles = {};
      const keepAlive2 = () => coop.players.forEach((p) => { if (!p.isLocal) p.silentT = 0; });

      for (const moveId of MOVES_TO_TEST) {
        const mResult = { started: false, maxHostMvLift: 0, hostPillarCount: 0, error: null };
        moveBundles[moveId] = { snaps: [], meta: mResult };

        if (!boss || !out.bossSpawned) { mResult.error = 'no boss'; continue; }

        try {
          const moveDef = BOSS_MOVES[moveId];
          if (!moveDef) { mResult.error = 'no BOSS_MOVES entry'; continue; }

          // reset boss state between moves
          boss.mv = null; boss.mvLift = 0; boss.dead = false; boss.hp = boss.maxHp; boss.iframe = 0;
          // clear beams so we only count beams produced by this move
          hostWorld.beams.length = 0;

          // force-start this specific move
          let st;
          try { st = moveDef.start(boss, hostWorld); } catch (e2) { mResult.error = 'start threw: ' + String(e2); continue; }
          if (!st) { mResult.error = 'start returned null (player dead?)'; continue; }
          boss.mv = { id: moveId, ...st };
          mResult.started = true;

          // pump up to 180 frames (~3 s), stopping once the move finishes, then a few extra
          let moveDone = false;
          let extraFrames = 6;   // extra frames after move completes to catch pillar spawns / beam linger
          for (let i = 0; i < 180; i++) {
            keepAlive2();
            // keep host player alive (godmode stub bypasses takeDamage but anti-AFK drain writes hp directly)
            host.player.takeDamage = () => {};
            host.player.hp = host.player.maxHp;
            // drive ONLY bossMoveTick manually (not host.update, to avoid advancing unrelated sim state)
            // — but we DO need world.beams to clear each sim frame (world.update normally clears them).
            // Instead: clear beams BEFORE calling bossMoveTick so each frame starts fresh; the move
            // re-adds its telegraph beams for that frame.
            hostWorld.beams.length = 0;
            try { bossMoveTick(boss, hostWorld, 1 / 60); } catch (e2) { mResult.error = 'tick threw: ' + String(e2); break; }

            // track peak mvLift
            if ((boss.mvLift || 0) > mResult.maxHostMvLift) mResult.maxHostMvLift = boss.mvLift;

            // encode snapshot now (host scene + coop still live)
            try {
              const snap = encodeSnapshot(host);
              moveBundles[moveId].snaps.push(snap);
            } catch (e2) { mResult.error = 'encodeSnapshot threw: ' + String(e2); break; }

            if (!boss.mv) {
              // move completed this frame — keep a few extra frames for pillar spawns / beam linger
              if (moveDone) { if (extraFrames-- <= 0) break; }
              else { moveDone = true; }
            }
          }

          // count boss_pillar enemies on the host after wall_cage
          if (moveId === 'wall_cage') {
            mResult.hostPillarCount = hostWorld.enemies.filter((e) => e.id === 'boss_pillar' && !e.dead).length;
          }

        } catch (e) {
          moveBundles[moveId].meta.error = 'outer: ' + String(e && e.stack || e);
        }
      }

      // ── 6. Encode a final snapshot that includes ALL event mobs ──────────
      // (event mobs are still alive from step 4; boss is still on the field)
      let evtSnapshot = null;
      try {
        evtSnapshot = encodeSnapshot(host);
      } catch (e) {
        out.errors.push('evt encodeSnapshot: ' + String(e && e.stack || e));
      }

      // ── 7. SWITCH to guest scene (host run.exit() fires here, nulling host.coop) ─
      let guest = null;
      try {
        const rs = buildRunStart(host);   // build before exit clears coop
        setScene(refs.coop, {
          start: { you: 'cG', role: 'guest', hostCid: 'cH', room: { code: 'BSTEST', members: coop.room.members } },
          runstart: rs,
        });
        applyPending();
        guest = getScene();
      } catch (e) {
        out.errors.push('guest setup: ' + String(e && e.stack || e));
        try { setScene(refs.title, {}); applyPending(); } catch (_) {}
        return out;
      }

      // ── 8. Replay per-move snapshot bundles through guest ─────────────────
      for (const moveId of MOVES_TO_TEST) {
        const { snaps, meta } = moveBundles[moveId];
        const mOut = {
          started: meta.started,
          maxHostMvLift: meta.maxHostMvLift,
          hostPillarCount: meta.hostPillarCount,
          guestMvLiftSeen: false,    // leap_slam: did the matching guest enemy ever get mvLift > 0?
          guestPillarsSeen: false,   // wall_cage: did guest enemies ever include a boss_pillar?
          guestBeamsSeen: false,     // did guest.beams ever become non-empty?
          error: meta.error,
        };
        out.moves[moveId] = mOut;
        if (!meta.started || snaps.length === 0) continue;

        try {
          for (const snap of snaps) {
            try { guest.onSnap(snap); } catch (e2) { mOut.error = (mOut.error ? mOut.error + ' | ' : '') + 'onSnap: ' + String(e2); break; }

            // check beams
            if (guest.guest && guest.guest.beams && guest.guest.beams.length > 0) mOut.guestBeamsSeen = true;

            // leap_slam: check mvLift on the boss entity (matched by boss._nid)
            if (moveId === 'leap_slam' && boss && boss._nid != null && guest.guest) {
              const ge = guest.guest.enemies.get(boss._nid);
              if (ge && (ge.mvLift || 0) > 0) mOut.guestMvLiftSeen = true;
            }

            // wall_cage: check for boss_pillar entities on guest (match by def id via the defList)
            if (moveId === 'wall_cage' && guest.guest) {
              for (const [, ge] of guest.guest.enemies) {
                // ge.id = def.id set in Enemy constructor; coopScene.makeEnemy builds from defList[defIdx]
                if (ge.id === 'boss_pillar') { mOut.guestPillarsSeen = true; break; }
              }
            }
          }
        } catch (e) {
          mOut.error = (mOut.error ? mOut.error + ' | ' : '') + 'replay: ' + String(e && e.stack || e);
        }
      }

      // ── 9. Event-mob sync check ────────────────────────────────────────────
      if (evtSnapshot) {
        try {
          guest.onSnap(evtSnapshot);
          if (guest.guest) {
            for (const [, ge] of guest.guest.enemies) {
              if (EVT_IDS.includes(ge.id) && !out.eventGuestSeen.includes(ge.id)) {
                out.eventGuestSeen.push(ge.id);
              }
            }
          }
        } catch (e) {
          out.errors.push('evt guest replay: ' + String(e && e.stack || e));
        }
      }

      // ── 10. Guest render ──────────────────────────────────────────────────
      try {
        // give the guest a couple update ticks so entities interpolate
        for (let i = 0; i < 4; i++) try { guest.update(1 / 60); } catch (_) {}
        guest.render();
        out.guestRenderedOk = true;
      } catch (e) {
        out.guestRenderedOk = false;
        out.errors.push('guest render: ' + String(e && e.stack || e));
      }

      // ── 11. Clean up ──────────────────────────────────────────────────────
      try { setScene(refs.title, {}); applyPending(); } catch (_) {}
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
