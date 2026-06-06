// Host-side co-op handle. The host runs the normal authoritative run.js sim; this
// object adds the remote avatars, feeds them their networked input, and broadcasts a
// world snapshot ~18Hz. Guests are pure renderers of these snapshots (see coop.js).
import { RT } from '../../net/rt.js';
import { Player } from '../player.js';
import { Characters, Enemies } from '../content/registry.js';
import { makeBaseStats } from '../state.js';
import { BALANCE } from '../balance.js';
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
    this.scene = scene;
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

    // remote input → drive the matching avatar (+ reset its disconnect-silence timer)
    this._subs.push(RT.on('input', (m) => {
      const slot = this.players.find((p) => p.cid === m.cid);
      if (slot && slot.player && !slot.left) { slot.player.netInput = { move: { x: m.mv ? m.mv[0] : 0, y: m.mv ? m.mv[1] : 0 }, dash: !!m.dash }; slot.silentT = 0; }
    }));
    // a guest dropped (clean WS close) → freeze + retire its avatar (sim keeps going for the rest)
    this._subs.push(RT.on('peer:left', (m) => this.retire(m.cid)));
    // a guest picked a level-up option → apply it to that guest's avatar
    this._subs.push(RT.on('levelpick', (m) => {
      const slot = this.players.find((p) => p.cid === m.cid);
      if (slot && this.scene && this.scene.applyCoopGuestPick) this.scene.applyCoopGuestPick(slot, m.i | 0);
    }));

    RT.runStart(buildRunStart(scene));   // hand guests the map + roster so they can build their puppet world
  }

  // retire a remote avatar (disconnect, by clean close OR input-silence timeout) + end-check
  retire(cid) {
    const slot = this.players.find((p) => p.cid === cid);
    if (slot && slot.player && !slot.left) { slot.left = true; slot.player.netInput = { move: { x: 0, y: 0 }, dash: false }; slot.player.dead = true; }
    if (this.scene && !this.scene.dead && !this.scene.world.anyPlayerAlive()) this.scene.onDeath();
  }

  // host->guest: hand a guest its level-up choices (the host owns the apply via levelpick)
  sendLevelup(slot, opts) { slot.pendingOpts = opts; if (RT.isConnected()) RT.send({ t: 'levelup', cid: slot.cid, opts }); }

  hudData(scene) {
    let bn = null, bf = 0;
    if (scene.bossRef && !scene.bossRef.dead) { bn = scene.bossRef.def.name; bf = scene.bossRef.hp / scene.bossRef.maxHp; }
    // sub-label mirrors the host's stage HUD (next-boss countdown / wave / cleared state)
    let su = '';
    if (scene.cleared) su = scene.reaperSpawned ? '☠ 死神戰' : '通關！按 E 離場';
    else if (scene.finalBoss) su = '最終決戰！';
    else if (!bn) {
      const times = BALANCE.MINIBOSS_TIMES || [];
      const nextMini = scene.miniIdx < times.length ? times[scene.miniIdx] : null;
      const tgt = nextMini != null ? nextMini : BALANCE.LEVEL_TIME;
      const r = Math.max(0, tgt - (scene.run.time || 0)), mm = Math.floor(r / 60), ss = Math.floor(r % 60);
      su = (nextMini != null ? '距小王 ' : '距最終首領 ') + mm + ':' + String(ss).padStart(2, '0');
    }
    return {
      ti: scene.map.biome.name + ' · 難度 ' + (scene.run.difficulty || 1) + ' · 威脅 ' + (scene.threat || 1),
      su, bn, bf, kills: scene.run.kills || 0,
      banner: scene.bannerT > 0 ? scene.banner : '', bannerT: Math.max(0, scene.bannerT || 0),   // sync the big centre announcements to guests
    };
  }

  // count of avatars still alive + connected (run ends only when ALL are down)
  aliveCount() { return this.players.filter((p) => p.player && !p.player.dead && !p.left).length; }
  size() { return this.players.length; }

  tick(dt, scene) {
    // disconnect detection that doesn't wait for the WS heartbeat: a connected guest sends
    // input ~30Hz even when standing still, so >4s of silence means it's gone — retire it.
    for (const slot of this.players) {
      if (slot.isLocal || slot.left || !slot.player) continue;
      slot.silentT = (slot.silentT || 0) + dt;
      if (slot.silentT > 4) this.retire(slot.cid);
    }
    this._snapAccum += dt;
    if (this._snapAccum >= this._snapInterval) {
      this._snapAccum = 0; this.frame++;
      if (RT.isConnected()) { try { RT.snap(encodeSnapshot(scene)); } catch (e) { /* a bad frame must never crash the host sim */ } }
    }
  }

  end(result) { if (RT.isConnected()) RT.runEnd(result || {}); this.dispose(); }
  dispose() { for (const u of this._subs) try { u(); } catch (e) { /* */ } this._subs = []; }
}
