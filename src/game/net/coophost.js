// Host-side co-op handle. The host runs the normal authoritative run.js sim; this
// object adds the remote avatars, feeds them their networked input, and broadcasts a
// world snapshot ~18Hz. Guests are pure renderers of these snapshots (see coop.js).
import { RT } from '../../net/rt.js';
import { Player } from '../player.js';
import { Characters, Enemies } from '../content/registry.js';
import { makeBaseStats } from '../state.js';
import { buildRunStart, encodeSnapshot } from './protocol.js';

const SNAP_HZ = 18;

export class CoopHost {
  constructor(room, selfCid) {
    this.room = room; this.selfCid = selfCid;
    this.players = [];          // [{cid, uid, name, charId, weaponId, sprite, player, isLocal, left}]
    this.frame = 0;
    this._snapAccum = 0; this._snapInterval = 1 / SNAP_HZ;
    this._nidSeq = 0;
    this._defIdx = null;
    this._subs = [];
  }
  nextNid() { return ++this._nidSeq; }
  defIdx(id) { if (!this._defIdx) { this._defIdx = new Map(); Enemies.ids().forEach((x, i) => this._defIdx.set(x, i)); } return this._defIdx.get(id) ?? 0; }

  // build avatars from the lobby roster, wire input + the world player set, then tell
  // guests to start. Called from run.js buildWorld once the local host player exists.
  setup(scene, localPlayer) {
    // stable order: host first, then by cid (so snapshot player indices are deterministic)
    const mem = this.room.members.slice().sort((a, b) => ((b.host ? 1 : 0) - (a.host ? 1 : 0)) || String(a.cid).localeCompare(String(b.cid)));
    this.players = mem.map((m) => {
      const charId = m.charId || 'hunter';
      const char = Characters.get(charId) || Characters.get('hunter');
      const isLocal = m.cid === this.selfCid;
      let player;
      if (isLocal) {
        player = localPlayer;   // the host's own keyboard-driven avatar (already built with full meta)
      } else {
        const stats = makeBaseStats();
        if (char && char.passive) { try { char.passive(stats); } catch (e) { /* */ } }
        player = new Player(localPlayer.x + (Math.random() * 24 - 12), localPlayer.y + (Math.random() * 24 - 12), stats);
        player.run = scene.run;
        player.spriteName = (char && char.sprite) || 'player';
        player.netInput = { move: { x: 0, y: 0 }, dash: false };
        player.addWeapon((m.weaponId) || (char && char.startWeapon) || 'w_soulbolt', scene.world);
      }
      player.cid = m.cid; player.netName = m.username;
      return { cid: m.cid, uid: m.uid, name: m.username, charId, weaponId: m.weaponId, sprite: player.spriteName, player, isLocal, left: false };
    });
    scene.world.players = this.players.map((p) => p.player);
    scene.world.player = localPlayer;
    scene.world.inputFor = (pl) => pl.netInput;     // local host avatar has no netInput → reads keyboard
    scene.world.onEquipPickup = null;               // co-op auto-equips the grabber (no paused menu)

    // remote input → drive the matching avatar
    this._subs.push(RT.on('input', (m) => {
      const slot = this.players.find((p) => p.cid === m.cid);
      if (slot && slot.player && !slot.left) slot.player.netInput = { move: { x: m.mv ? m.mv[0] : 0, y: m.mv ? m.mv[1] : 0 }, dash: !!m.dash };
    }));
    // a guest dropped → freeze + retire its avatar (sim keeps going for the rest)
    this._subs.push(RT.on('peer:left', (m) => {
      const slot = this.players.find((p) => p.cid === m.cid);
      if (slot && slot.player) { slot.left = true; slot.player.netInput = { move: { x: 0, y: 0 }, dash: false }; slot.player.dead = true; }
      // if that was the last avatar standing, end the run (this path bypasses player.die,
      // so re-check the game-over condition explicitly — otherwise the run hangs forever).
      if (!scene.dead && !scene.world.anyPlayerAlive()) scene.onDeath();
    }));

    RT.runStart(buildRunStart(scene));   // hand guests the map + roster so they can build their puppet world
  }

  hudData(scene) {
    let bn = null, bf = 0;
    if (scene.bossRef && !scene.bossRef.dead) { bn = scene.bossRef.def.name; bf = scene.bossRef.hp / scene.bossRef.maxHp; }
    return {
      ti: scene.map.biome.name + ' · 難度 ' + (scene.run.difficulty || 1) + ' · 威脅 ' + (scene.threat || 1),
      su: scene.cleared ? '通關！' : '',
      bn, bf, kills: scene.run.kills || 0,
    };
  }

  // count of avatars still alive + connected (run ends only when ALL are down)
  aliveCount() { return this.players.filter((p) => p.player && !p.player.dead && !p.left).length; }
  size() { return this.players.length; }

  tick(dt, scene) {
    this._snapAccum += dt;
    if (this._snapAccum >= this._snapInterval) {
      this._snapAccum = 0; this.frame++;
      if (RT.isConnected()) { try { RT.snap(encodeSnapshot(scene)); } catch (e) { /* a bad frame must never crash the host sim */ } }
    }
  }

  end(result) { if (RT.isConnected()) RT.runEnd(result || {}); this.dispose(); }
  dispose() { for (const u of this._subs) try { u(); } catch (e) { /* */ } this._subs = []; }
}
