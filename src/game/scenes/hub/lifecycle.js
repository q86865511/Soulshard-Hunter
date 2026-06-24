// hub/lifecycle.js — lifecycle methods of the hub scene (R21.5 scene-file split).
// Mixed into hubScene via Object.assign in hub.js; all state lives on `this`.
import { Music, Sfx } from '../../../engine/audio.js';
import { mouse, moveAxis, pressed } from '../../../engine/input.js';
import { dist } from '../../../engine/math.js';
import { P } from '../../../engine/palette.js';
import { camera, view, worldToScreen } from '../../../engine/renderer.js';
import { isModalOpen } from '../../../net/ui.js';
import { Cheats } from '../../cheats.js';
import { skinnedSprite } from '../../content/characters.js';
import { NPCS } from '../../content/npcs.js';
import { updatePetFollow } from '../../content/pets.js';
import { ensureWeekly } from '../../content/quests.js';
import { ensureSkinOffers } from '../../content/skinshop.js';
import { META } from '../../state.js';
import { settingsUI } from '../../ui/settings.js';
import { TS, World, makeCamp, makeInterior } from '../../world.js';
import { BUILDINGS, KEEPER_AREA, NPC_POS, NPC_POS_INT, TOWN_NPC_IDS } from './shared.js';

export const lifecycleMixin = {
  enter() {
    this.world = new World({});
    this.maps = {};                 // R19: lazy per-area map cache (town + 6 interiors); rebuilt only on first visit
    this.area = 'town';
    this.panel = null; this.tab = 0; this.near = null; this.t = 0;
    this.escMenu = false;
    this.dialogue = null;
    this.panelScroll = 0; this.panelMaxScroll = 0;
    this.flash = ''; this.flashT = 0;
    this.sortPage = 0; this.selBiome = null; this.selDiff = 1;   // R17/4.2: selMode gone — endless is the stepper's final step
    this.forgeSel = null;
    this.heroSprite = skinnedSprite(META, META.selectedCharacter || 'hunter');
    ensureSkinOffers(META);
    ensureWeekly(META);   // R18/B9: re-snapshot weekly bounty base on ISO-week rollover
    this.petState = { x: null, y: null, t: 0, bob: 0 };   // R18/B10 cosmetic pet follower
    this.loadArea('town');          // R19: build the exterior (default spawn = plaza)
    Music.start('hub');
    if (!META.tutorialDone) setTimeout(() => this.triggerTutorial(), 1000);   // 6.1 first-visit town guide
  },

  // R19: get-or-build the map for an area id ('town' or a building interior id). Cached on this.maps
  // so props don't re-roll between visits (town layout is non-deterministic per makeCamp()).
  areaMap(areaId) {
    if (!this.maps[areaId]) this.maps[areaId] = (areaId === 'town') ? makeCamp() : makeInterior(areaId);
    return this.maps[areaId];
  },
  // R19: load an area into the world, place the hero, snap the camera, rebuild stations/NPCs.
  loadArea(areaId, spawnPos) {
    const map = this.areaMap(areaId);
    this.area = areaId;
    this.world.loadMap(map);
    const R = this.rooms = map.rooms;
    // spawn position: explicit > sensible default per area
    let sp = spawnPos;
    if (!sp) {
      if (areaId === 'town') sp = { x: R.plaza.cx, y: R.plaza.cy + 22 };
      else sp = { x: R.exit.cx, y: R.exit.cy - TS };   // interior: just above the exit doorway
    }
    if (!this.hero) this.hero = { x: sp.x, y: sp.y, vx: 0, vy: 0, facing: 1, radius: 5, walkT: 0, moving: false };
    else { this.hero.x = sp.x; this.hero.y = sp.y; this.hero.vx = 0; this.hero.vy = 0; }
    camera.x = camera.targetX = this.hero.x; camera.y = camera.targetY = this.hero.y - 6;
    this.stations = this.buildStations(areaId, R);
    this.npcs = this.buildNpcs(areaId, R);
    this.near = null; this.nearKind = null;
    this.doorCd = 0.7;   // R20/B3: re-trigger cooldown so a spawn beside the glow tile can't bounce straight back
    if (this.petState) this.petState.x = null;   // pet re-spawns next to the hero in the new area
    this.injectRoomDecor();   // R18/B10: only acts in the personal interior now (FLOOR-guarded)
  },
  // R19: stations for the active area. TOWN = grand portal (panel) + 6 door-stations at porches.
  // INTERIOR = the building's panel station (top-centre) + an exit door-station at rooms.exit.
  buildStations(areaId, R) {
    if (areaId === 'town') {
      const plaza = R.plaza;
      const list = [{ id: 'sortie', panel: 'sortie', sprite: 'portal_grand', label: '出擊傳送門', color: P.manaL, x: plaza.cx, y: plaza.cy }];
      for (const bid in BUILDINGS) {
        const b = BUILDINGS[bid], rm = R[bid]; if (!rm) continue;
        list.push({ id: 'door_' + bid, kind: 'door', target: bid, label: b.enterLabel, color: b.color, x: rm.cx, y: rm.cy });
      }
      return list;
    }
    // interior: panel station + exit door
    const b = BUILDINGS[areaId] || {};
    const rm = R[areaId] || R.exit;
    return [
      { id: areaId, panel: b.panel, sprite: b.sprite, label: b.label, color: b.color, x: rm.cx, y: rm.cy + 0.4 * TS },
      { id: 'exit', kind: 'door', target: 'town', label: '離開', color: P.gray3, x: R.exit.cx, y: R.exit.cy },
    ];
  },
  // R19: NPCs for the active area. TOWN = guide/child/merchant/oldvet at their outdoor anchors.
  // INTERIOR = the keeper(s) for that building, placed symmetric near the station anchor.
  buildNpcs(areaId, R) {
    if (areaId === 'town') {
      return NPCS.filter((n) => TOWN_NPC_IDS.has(n.id)).map((n) => {
        const rm = R[n.room] || R.plaza, o = NPC_POS[n.id] || [0, 2];
        return { def: n, x: rm.cx + o[0] * TS, y: rm.cy + o[1] * TS, facing: o[0] < 0 ? 1 : -1, t: (n.id.length % 6) };
      });
    }
    const anchor = R[areaId] || R.exit;
    return NPCS.filter((n) => KEEPER_AREA[n.id] === areaId).map((n) => {
      const o = NPC_POS_INT[n.id] || [0, 3];
      return { def: n, x: anchor.cx + o[0] * TS, y: anchor.cy + o[1] * TS, facing: o[0] < 0 ? 1 : -1, t: (n.id.length % 6) };
    });
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (this.flashT > 0) this.flashT -= dt;
    for (const n of this.npcs) n.t += dt;
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.escMenu) { this.updateEscMenu(); return; }   // Esc menu owns input while open
    if (isModalOpen()) return;                            // a DOM net overlay (帳號/多人/排行榜) is up — freeze the town behind it
    if (this.dialogue) { this.updateDialogue(); return; }
    if (this.panel) { this.updatePanel(); return; }
    if (Cheats.enabled && mouse.justDown && this.hubCheatInput()) return;   // dev panel (Konami ↑↑↓↓←→←→BA) now works in the hub too
    if (pressed('escape')) { this.escMenu = true; Sfx.play('uiClick'); return; }   // Esc opens the town menu (帳號/多人/排行榜/設定/返回主畫面) — pick an option to open its page

    const ax = moveAxis(); const h = this.hero;
    h.moving = !!(ax.x || ax.y);
    const sp = 96;
    h.vx += (ax.x * sp - h.vx) * Math.min(1, 14 * dt);
    h.vy += (ax.y * sp - h.vy) * Math.min(1, 14 * dt);
    if (Math.abs(h.vx) > 2) h.facing = h.vx < 0 ? -1 : 1;
    this.world.moveActor(h, h.vx * dt, h.vy * dt);
    if (h.moving) h.walkT += dt;
    // R20/B3 (player problem 6): step onto a glowing door circle → walk straight in/out.
    // Guarded by doorCd (set in loadArea) so the arrival spawn can't instantly bounce back;
    // dialogue/panel/menu states already returned above, so a cutscene can't teleport you.
    if (this.doorCd > 0) this.doorCd -= dt;
    else if (this.world.triggers && this.world.triggers.length) {
      const htx = Math.floor(h.x / TS), hty = Math.floor(h.y / TS);
      const g = this.world.triggers.find((t) => t.tx === htx && t.ty === hty);
      if (g) { this.enterDoor({ target: g.target }); return; }
    }
    camera.targetX = h.x; camera.targetY = h.y - 6;
    if (META.pet) updatePetFollow(this.petState, h.x, h.y, h.facing, dt);   // R18/B10 pet trails the hero
    this.ambientFx(dt);   // R18/B2: drifting petals over the field + fireflies by the garden
    this.world.particles.update(dt);

    // nearest interactable (station building OR npc)
    this.near = null; this.nearKind = null; let bd = 40;   // R20/B3: 34→40 to match the bigger ruin_st_* stations
    for (const s of this.stations) { const d = dist(h.x, h.y, s.x, s.y); if (d < bd) { bd = d; this.near = s; this.nearKind = 'station'; } }
    for (const n of this.npcs) { const d = dist(h.x, h.y, n.x, n.y); if (d < bd) { bd = d; this.near = n; this.nearKind = 'npc'; } }

    let act = null;
    if (this.near && (pressed('interact') || pressed('enter'))) act = this.near;
    if (mouse.justDown) {
      const mx = mouse.x * view.dpr, my = mouse.y * view.dpr;
      for (const s of this.stations) { const ss = worldToScreen(s.x, s.y - 10); if (dist(mx, my, ss.x, ss.y) < 56 * view.dpr) { act = s; this.nearKind = 'station'; } }   // R20/B3: 46→56 for the bigger station art
      for (const n of this.npcs) { const ss = worldToScreen(n.x, n.y - 10); if (dist(mx, my, ss.x, ss.y) < 40 * view.dpr) { act = n; this.nearKind = 'npc'; } }
    }
    // R19: panel hotkeys now open panels directly from anywhere (no station lookup needed)
    if (pressed('slot1')) { this.openPanel('talents'); return; }
    if (pressed('slot2')) { this.openPanel('smith'); return; }
    if (pressed('slot3')) { this.openPanel('achievements'); return; }
    if (pressed('slot4')) { this.openPanel('guild'); return; }
    if (pressed('space')) { this.openPanel('sortie'); return; }
    if (!act) return;
    if (act.def) this.openDialogue(act);          // an NPC
    else if (act.kind === 'door') this.enterDoor(act);   // R19: a door → switch area
    else this.openPanel(act.panel);               // a building station → panel
  },

  // R19: walk through a door. Entering a building spawns at its exit; returning to town spawns at
  // that building's porch anchor (a touch below it so the hero stands in front of the facade door).
  enterDoor(door) {
    Sfx.play('uiClick');
    let spawn = null;
    if (door.target !== 'town') {
      // spawn just inside the building's exit doorway (set inside loadArea's default)
    } else if (this.area !== 'town') {
      // returning from a building → stand at its porch in the town
      const townMap = this.areaMap('town'), rm = townMap.rooms[this.area];
      if (rm) spawn = { x: rm.cx, y: rm.cy + 8 };
    }
    this.loadArea(door.target, spawn);
  },

  // R19: apocalyptic-town ambience. TOWN → drifting ash flakes + ember motes (grey + ember-orange,
  // slow fall) replacing the R18 sakura petals, with an occasional soul-wisp twinkle by the garden.
  // INTERIORS → just a few sparse warm dust motes. Spawned near the camera so they're always on-screen.
  ambientFx(dt) {
    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT > 0) return;
    const pr = this.world.particles, vw = view.W / camera.zoom, vh = view.H / camera.zoom;
    if (this.area === 'town') {
      this.ambT = 0.16;
      // an ash flake or ember mote entering from the top of the view, drifting slowly down + sideways
      const px = camera.x + (Math.random() - 0.5) * vw, py = camera.y - vh / 2 - 8;
      const ember = Math.random() < 0.4;
      pr.spawn({ x: px, y: py, vx: (Math.random() - 0.5) * 8, vy: 8 + Math.random() * 8, life: 5.5, size: ember ? 1.5 : 2, color: ember ? P.emberL : '#9aa', grav: ember ? -2 : 3, drag: 0.992, glow: ember, fade: true });
      // occasional soul-wisp twinkle near the garden (guard exists for the active town map)
      if (Math.random() < 0.4 && this.rooms && this.rooms.garden) {
        const g = this.rooms.garden;
        pr.spawn({ x: g.cx + (Math.random() - 0.5) * 90, y: g.cy + (Math.random() - 0.5) * 70, vx: (Math.random() - 0.5) * 10, vy: -6 - Math.random() * 8, life: 1.6, size: 1.5, color: P.shardL, glow: true });
      }
    } else {
      // interior: sparse warm dust motes drifting through the torch-lit gloom
      this.ambT = 0.5;
      const px = camera.x + (Math.random() - 0.5) * vw, py = camera.y + (Math.random() - 0.5) * vh;
      pr.spawn({ x: px, y: py, vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 3, life: 4, size: 1, color: P.emberL, grav: 1, drag: 0.99, glow: true, fade: true });
    }
  },
};
