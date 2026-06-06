// Co-op wire format (Phase 2). One file owns BOTH directions so host encode and guest
// decode can never drift. Host-authoritative: the host runs the real sim and emits a
// compact world snapshot ~18Hz; guests decode it into puppet entities and render their
// own-centred view. Numbers are quantised (ints / 0-255 hp / x10 scale) to stay small.
//
// runstart (once): map blob + enemy-def index table + player roster + cfg.
// snap (per frame): players, enemies, projectiles, pickups, beams, hud.
import { Enemies } from '../content/registry.js';
import { TS } from '../world.js';

// ---- player/enemy flag bits ------------------------------------------------
export const PF = { DEAD: 1, DASH: 2, BLINK: 4, MOVING: 8 };
export const EF = { BOSS: 1, FLASH: 2, CHARGE: 4, ELITE: 8, SLOW: 16, BURN: 32, POISON: 64, BLEED: 128 };

// ---- base64 <-> Uint8Array (chunked; avoids stack overflow on big maps) ------
export function u8ToB64(u8) {
  let s = ''; const CH = 0x8000;
  for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH));
  return btoa(s);
}
export function b64ToU8(b64) {
  const bin = atob(b64); const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}

// ---- map (de)serialise (sent once at runstart) -----------------------------
export function serializeMap(map) {
  return {
    tw: map.tw, th: map.th,
    tiles: u8ToB64(map.tiles),
    floorVar: u8ToB64(map.floorVar || new Uint8Array(map.tw * map.th)),
    tileset: map.tileset || null,
    biomeId: map.biome ? map.biome.id : (map.biomeId || null),
    decor: (map.decor || []).map((d) => [d.sprite, Math.round(d.x), Math.round(d.y), d.phase || 0]),
    hazards: (map.hazards || []).map((h) => [h.kind, Math.round(h.x), Math.round(h.y), Math.round(h.r)]),
    entrance: map.entrance ? [Math.round(map.entrance.x), Math.round(map.entrance.y)] : [0, 0],
  };
}
export function deserializeMap(m) {
  return {
    tw: m.tw, th: m.th,
    tiles: b64ToU8(m.tiles),
    floorVar: b64ToU8(m.floorVar),
    tileset: m.tileset || undefined,
    biome: { id: m.biomeId, name: '' },
    decor: (m.decor || []).map(([sprite, x, y, phase]) => ({ sprite, x, y, phase })),
    hazards: (m.hazards || []).map(([kind, x, y, r]) => ({ kind, x, y, r })),
    entrance: { x: m.entrance[0], y: m.entrance[1] },
    pxW: m.tw * TS, pxH: m.th * TS, chests: [], npcs: [],
  };
}

// The enemy-def index table: host sends Enemies.ids() so guests resolve defIdx->def
// even if load order ever differs. defIdx is the index into this array.
export function enemyDefList() { return Enemies.ids(); }

// ---- runstart (host -> guests, once) ---------------------------------------
export function buildRunStart(scene) {
  const coop = scene.coop;
  return {
    map: serializeMap(scene.map),
    defs: enemyDefList(),
    players: coop.players.map((p) => ({ cid: p.cid, uid: p.uid, name: p.name, sprite: p.sprite, charId: p.charId, speed: (p.player && p.player.stats && p.player.stats.speed) || 82 })),
    cfg: { difficulty: scene.run.difficulty || 1, biomeId: scene.run.biomeId },
    biomeName: scene.map.biome.name,
  };
}

// ---- per-frame snapshot (host -> guests) -----------------------------------
export function encodeSnapshot(scene) {
  const coop = scene.coop, world = scene.world;
  // players (index-aligned to the runstart roster)
  const pl = coop.players.map((mp) => {
    const p = mp.player; if (!p) return [0, 0, 1, 0, 1, PF.DEAD, 82];
    let fl = 0; if (p.dead) fl |= PF.DEAD; if (p.dashT > 0) fl |= PF.DASH;
    if (p.invuln > 0 && Math.floor(p.t * 20) % 2 === 0 && p.dashT <= 0) fl |= PF.BLINK;
    if (p.moving) fl |= PF.MOVING;
    // t[6] = current speed so the guest's self-prediction tracks mid-run speed changes (slow/buffs/level-ups)
    return [Math.round(p.x), Math.round(p.y), p.faceX < 0 ? -1 : 1, Math.round(p.hp), Math.round(p.maxHp), fl, Math.round((p.stats && p.stats.speed) || 82)];
  });
  // enemies
  const en = [];
  for (const e of world.enemies) {
    if (e.dead) continue;
    if (e._nid == null) e._nid = coop.nextNid();
    let fl = 0; if (e.boss) fl |= EF.BOSS; if (e.flash > 0) fl |= EF.FLASH; if (e.charging) fl |= EF.CHARGE; if (e.elite) fl |= EF.ELITE;
    if (e.status) { if (e.status.slow) fl |= EF.SLOW; if (e.status.burn) fl |= EF.BURN; if (e.status.poison) fl |= EF.POISON; if (e.status.bleed) fl |= EF.BLEED; }
    en.push([e._nid, scene.coop.defIdx(e.id), Math.round(e.x), Math.round(e.y), e.facing > 0 ? 1 : -1,
      Math.max(0, Math.min(255, Math.round((e.hp / e.maxHp) * 255))), fl, Math.round((e.scale || 1) * 10)]);
  }
  // projectiles — palette-deduped sprite+colour; advanced client-side via velocity
  const ppMap = new Map(); const pp = []; const pr = [];
  const palIdx = (sprite, color) => { const k = sprite + '|' + color; let i = ppMap.get(k); if (i == null) { i = pp.length; pp.push([sprite, color]); ppMap.set(k, i); } return i; };
  for (const p of world.projectiles) {
    if (p.dead) continue;
    pr.push([Math.round(p.x), Math.round(p.y), Math.round(p.vx), Math.round(p.vy), palIdx(p.sprite, p.color), Math.round((p.scale || 1) * 10)]);
  }
  // pickups — palette-deduped sprite
  const kpMap = new Map(); const kp = []; const pk = [];
  const kIdx = (sprite) => { let i = kpMap.get(sprite); if (i == null) { i = kp.length; kp.push(sprite); kpMap.set(sprite, i); } return i; };
  for (const q of world.pickups) {
    if (q.dead || (q.hidden && !q.revealed)) continue;
    if (q._nid == null) q._nid = coop.nextNid();
    pk.push([q._nid, Math.round(q.x), Math.round(q.y - (q.z || 0)), kIdx(q.sprite)]);
  }
  // beams (lightning/laser flashes)
  const bm = world.beams.map((b) => [Math.round(b.x0), Math.round(b.y0), Math.round(b.x1), Math.round(b.y1), b.color]);
  return { f: coop.frame, tm: Math.round((scene.run.time || 0) * 100) / 100, th: scene.threat || 1, pl, en, pp, pr, kp, pk, bm, hud: coop.hudData ? coop.hudData(scene) : null };
}

// ---- guest apply (snap -> puppet state, with interpolation targets) --------
// `guest` provides: enemies(Map nid->Enemy), pickups(Map nid->obj), players(array),
// world(puppet World for Enemy construction), defList(array), makeEnemy(defIdx,x,y),
// onEnemyGone(e). Positions become interpolation TARGETS (tx,ty); the scene lerps.
export function applySnapshot(guest, snap) {
  guest.frame = snap.f; guest.time = snap.tm; guest.threat = snap.th; guest.hud = snap.hud || guest.hud;
  // players
  for (let i = 0; i < snap.pl.length; i++) {
    const t = snap.pl[i]; const pl = guest.players[i]; if (!pl) continue;
    pl.netX = t[0]; pl.netY = t[1]; pl.hp = t[3]; pl.nmax = t[4];   // Player.maxHp is a getter — store network max separately
    const fl = t[5];
    pl.dead = !!(fl & PF.DEAD); pl.dashT = (fl & PF.DASH) ? 0.16 : 0; pl.netBlink = !!(fl & PF.BLINK);
    if (t[6]) pl.nspeed = t[6];   // live speed for self-prediction
    // facing/moving/walk animation is LOCALLY predicted for our own avatar — don't let the
    // network-delayed snapshot overwrite it (would flip facing + double-advance the walk cycle).
    if (!pl.isSelf) {
      pl.faceX = t[2]; pl.moving = !!(fl & PF.MOVING); if (pl.moving) pl.walkT += 1 / 30;
      if (pl.x == null) { pl.x = pl.netX; pl.y = pl.netY; } pl.tx = pl.netX; pl.ty = pl.netY;
    }
  }
  // enemies: update/create, mark seen
  const seen = guest._seen || (guest._seen = new Set()); seen.clear();
  for (const t of snap.en) {
    const nid = t[0]; seen.add(nid);
    let e = guest.enemies.get(nid);
    if (!e) { e = guest.makeEnemy(t[1], t[2], t[3]); if (!e) continue; guest.enemies.set(nid, e); e.x = t[2]; e.y = t[3]; }
    e.tx = t[2]; e.ty = t[3]; e.facing = t[4]; e._hpFrac = t[5] / 255;
    const fl = t[6];
    e.boss = !!(fl & EF.BOSS); e.flash = (fl & EF.FLASH) ? 0.1 : 0; e.charging = !!(fl & EF.CHARGE); e.elite = !!(fl & EF.ELITE);
    e.status = { slow: !!(fl & EF.SLOW), burn: !!(fl & EF.BURN), poison: !!(fl & EF.POISON), bleed: !!(fl & EF.BLEED) };
    e.scale = t[7] / 10; e.spawnT = 0;
  }
  for (const [nid, e] of guest.enemies) if (!seen.has(nid)) { guest.onEnemyGone && guest.onEnemyGone(e); guest.enemies.delete(nid); }
  // projectiles: replace wholesale (advanced by velocity between snaps)
  guest.projectiles = snap.pr.map((t) => { const pal = snap.pp[t[4]] || ['bolt', '#fff']; return { x: t[0], y: t[1], vx: t[2], vy: t[3], sprite: pal[0], color: pal[1], scale: t[5] / 10, rot: Math.atan2(t[3], t[2]) }; });
  // pickups: update/create, drop unseen
  const seenK = guest._seenK || (guest._seenK = new Set()); seenK.clear();
  for (const t of snap.pk) {
    const nid = t[0]; seenK.add(nid);
    let q = guest.pickups.get(nid);
    if (!q) { q = { x: t[1], y: t[2], tx: t[1], ty: t[2], sprite: snap.kp[t[3]], t: Math.random() * 6 }; guest.pickups.set(nid, q); }
    else { q.tx = t[1]; q.ty = t[2]; q.sprite = snap.kp[t[3]]; }
  }
  for (const [nid] of guest.pickups) if (!seenK.has(nid)) guest.pickups.delete(nid);
  // beams
  guest.beams = snap.bm.map((b) => ({ x0: b[0], y0: b[1], x1: b[2], y1: b[3], color: b[4], life: 0.14, max: 0.14 }));
}
