// run/events.js — events methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { TAU, clamp, dist, rng } from '../../../engine/math.js';
import { P, withAlpha } from '../../../engine/palette.js';
import { addShake, fillCircleWorld, glowWorld, strokeCircleWorld, uiScale, uiText, worldToScreen } from '../../../engine/renderer.js';
import { BALANCE } from '../../balance.js';
import { biomeWeight } from '../../content/biome_tags.js';
import { Enemies } from '../../content/registry.js';
import { TS } from '../../world.js';
import { REAPER_ID, SURROUND_PROBES } from './shared.js';

export const eventsMixin = {
  // ---- special harasser events: mushrooms / surround ring (D2) / Higgs (D3) -
  eventsTick() {
    if (this.boss || this.finalBoss || this.cleared) return;
    if (this.run.time >= this.nextEventAt) {
      this.triggerEvent();
      const [evBase, evRand] = BALANCE.SURROUND_PERIOD;   // wire the (previously dead) config
      this.nextEventAt = this.run.time + (evBase + rng.next() * evRand) * BALANCE.SPECIAL_EVENT_FREQ_MULT;
    }
  },
  // R20/B5: weighted roster (BALANCE.EVENT_WEIGHTS) with threat gates; an event that's
  // already active zeroes its own weight so it can't double-stack.
  triggerEvent() {
    const W = BALANCE.EVENT_WEIGHTS, th = this.threat;
    const opts = [
      [W.mushrooms, () => this.evMushrooms()],
      [this.higgs ? 0 : W.higgs, () => this.evHiggs()],
      [this.surround ? 0 : W.surround, () => this.evSurround()],
      [th >= 2 ? W.bombers : 0, () => this.evBombers()],
      [th >= 3 ? W.bombs : 0, () => this.evBombs()],
      [th >= 4 ? W.boulders : 0, () => this.evBoulders()],
      [this.evtGoblin ? 0 : W.goblin, () => this.evGoblin()],
    ].filter((o) => o[0] > 0);
    if (!opts.length) return;
    rng.weighted(opts, (o) => o[0])[1]();
  },
  evMushrooms() {
    const n = 5 + Math.floor(this.threat / 2);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * TAU, r = 28 + rng.next() * 132;
      const x = clamp(this.player.x + Math.cos(a) * r, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(this.player.y + Math.sin(a) * r, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      this.evtMines.push({ x, y, arm: 0.9, life: 9, r: 34, dmg: 16 + Math.min(this.threat, 10) * 2, pulse: rng.next() * TAU });
    }
    this.banner = '提摩的蘑菇地雷！小心腳下'; this.bannerT = 2.6; Sfx.play('boss');
  },
  // D2 (task-4): a ring of monsters rings the player and actively closes in. You
  // are NOT held until the whole ring dies — carve a gap (kill SURROUND_BREACH_KILLS)
  // or back into a wall to break out.
  evSurround() {
    if (this.surround) return;
    let pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID && (d.ai === 'chase' || d.ai === 'charger' || d.ai === 'wander'));
    if (!pool.length) pool = Enemies.upTo(this.tierCapNow()).filter((d) => !d.boss && d.id !== REAPER_ID);
    if (!pool.length) return;
    const def = rng.weighted(pool, (x) => biomeWeight(x, this.run.biomeId));   // R18/B4: 魂牢 chasers lean to the biome too
    const n = BALANCE.SURROUND_COUNT_BASE + Math.floor(this.threat * 0.5);
    const hpScale = BALANCE.SURROUND_HP_MULT * (1 + this.threat * 0.1) * this.diffMul * this.curseHpMul;   // R18/B7
    const dmgScale = BALANCE.SURROUND_DMG_MULT * this.diffMul * this.earlyDmgGrace() * this.curseDmgMul;   // honour the opening softener
    const cx = this.player.x, cy = this.player.y;
    const ring = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rng.next() * 0.1;
      const x = clamp(cx + Math.cos(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(cy + Math.sin(a) * BALANCE.SURROUND_RADIUS, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      // tanky chasers that close the net — but killable enough to punch a hole through
      const e = this.world.spawnEnemy(def, x, y, { hpScale, dmgScale, speedScale: BALANCE.SURROUND_SPEED_MULT, quiet: true });
      if (e) { e.tint = P.purpleL; e.surround = true; ring.push(e); }
    }
    const breachNeed = Math.min(BALANCE.SURROUND_BREACH_KILLS, ring.length);   // never require more kills than actually spawned (some ring slots land on walls)
    this.surround = { enemies: ring, t: BALANCE.SURROUND_LIFE, cx, cy, lockR: BALANCE.SURROUND_RADIUS + 48, total: ring.length, breachNeed, breached: false, wasWall: false };
    this.banner = '魂牢降臨！怪群收攏包圍 — 殺出缺口（×' + breachNeed + '）或貼牆突圍！'; this.bannerT = 3.6; Sfx.play('boss'); addShake(6);
  },
  // D3: the Higgs bomb now LINGERS — it lobs delayed blasts every couple seconds
  // to zone the player, instead of one big burst.
  evHiggs() {
    if (this.higgs) return;
    this.higgs = { t: BALANCE.HIGGS_DURATION, next: 0.2 };
    this.banner = '希格斯的炸彈雨！持續轟炸卡位'; this.bannerT = 2.8; Sfx.play('boss'); addShake(4);
  },
  // ---- R20/B5 new events. All four ride on plain enemy entities so co-op guests see
  // them through the normal `en` snapshot channel; telegraphs go through world.addBeam
  // (the `bm` channel). Protocol byte-unchanged.
  // 自爆小隊: a squad of kamikaze imps with per-instance scaled deathBlasts + a hard fuse.
  evBombers() {
    const n = BALANCE.EVT_BOMBER_COUNT + Math.floor(this.threat / 2);
    const hpScale = (1 + this.threat * 0.08) * this.diffMul * this.curseHpMul;
    const dmgScale = this.diffMul * this.earlyDmgGrace() * this.curseDmgMul;
    const blast = Math.round((BALANCE.EVT_BOMBER_BLAST_DMG + Math.min(this.threat, 10) * 2) * dmgScale);
    let made = 0;
    for (let i = 0; i < n; i++) {
      const a = rng.next() * TAU, r = 170 + rng.next() * 90;
      const x = clamp(this.player.x + Math.cos(a) * r, TS * 2, this.world.pxW - TS * 2);
      const y = clamp(this.player.y + Math.sin(a) * r, TS * 2, this.world.pxH - TS * 2);
      if (this.world.solidAt(x, y)) continue;
      const e = this.world.spawnEnemy('evt_bomber', x, y, { hpScale, dmgScale, quiet: true });
      if (!e) continue;
      e.deathBlast = { r: BALANCE.EVT_BOMBER_BLAST_R, dmg: blast, color: P.ember };   // per-instance → scales with difficulty (def has none)
      e.evtFuse = BALANCE.EVT_BOMBER_FUSE * (0.8 + rng.next() * 0.4);
      this.evtBombers.push(e); made++;
    }
    if (made) { this.banner = '自爆狂徒衝鋒！在貼臉前放倒他們'; this.bannerT = 2.8; Sfx.play('boss'); }
  },
  // 棋盤詭雷: lattice-snapped stationary mines that pop a CROSS shockwave (bomberman).
  // Shooting one detonates it early — the cross also clears mobs, so it's a tool too.
  evBombs() {
    const n = BALANCE.EVT_BOMB_COUNT[0] + rng.int(0, BALANCE.EVT_BOMB_COUNT[1]);
    const dmg = (BALANCE.EVT_BOMB_DMG + Math.min(this.threat, 12) * 1.5) * this.diffMul * this.earlyDmgGrace() * this.curseDmgMul;
    let made = 0;
    for (let i = 0; i < n; i++) {
      const tx = Math.floor(this.player.x / TS) + rng.int(-7, 7), ty = Math.floor(this.player.y / TS) + rng.int(-5, 5);
      const x = (tx + 0.5) * TS, y = (ty + 0.5) * TS;
      if (x < TS * 2 || y < TS * 2 || x > this.world.pxW - TS * 2 || y > this.world.pxH - TS * 2 || this.world.solidAt(x, y)) continue;
      if (dist(x, y, this.player.x, this.player.y) < 24) continue;   // never directly under your feet
      const e = this.world.spawnEnemy('evt_bomb', x, y, { hpScale: 1 + this.threat * 0.06, quiet: true });
      if (!e) continue;
      e.evtFuse = BALANCE.EVT_BOMB_FUSE + i * 0.22; e.evtDmg = dmg; e.evtTel = 0;
      this.evtBombs.push(e); made++;
    }
    if (made) { this.banner = '魂晶詭雷布陣！十字衝擊波 — 離開直線'; this.bannerT = 2.8; Sfx.play('boss'); }
  },
  // the cross detonation: 4 arms of stepped AoE + beams; arms hurt the player too.
  evtBombCross(e) {
    const L = BALANCE.EVT_BOMB_ARM_LEN, dmg = e.evtDmg || BALANCE.EVT_BOMB_DMG, p = this.player;
    this.world.spawnExplosion(e.x, e.y, 18, P.laser, dmg * 0.7, { knockback: 60 });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let s = 1; s <= L; s++) {
        const x = e.x + dx * s * TS, y = e.y + dy * s * TS;
        this.world.particles.burst(x, y, 6, { color: [P.laser, P.shardL, '#ffffff'], speed: 50, size: 2, life: 0.3, glow: true });
        this.world.dealAreaDamage(x, y, 12, dmg * 0.55, { knockback: 50 });
      }
      this.world.addBeam(e.x, e.y, e.x + dx * L * TS, e.y + dy * L * TS, P.laser);
    }
    if (p && !p.dead) {   // player check: within half a tile of either axis line, inside arm reach
      const ax = Math.abs(p.x - e.x), ay = Math.abs(p.y - e.y), reach = L * TS + 8;
      if ((ay < 10 + p.radius && ax < reach) || (ax < 10 + p.radius && ay < reach)) p.takeDamage(dmg, Math.atan2(p.y - e.y, p.x - e.x), this.world);
    }
    addShake(3); Sfx.play('boss');
  },
  // 滾石突進: telegraphed straight lanes, then heavy rolling crushers along them.
  evBoulders() {
    const n = BALANCE.EVT_BOULDER_COUNT[0] + rng.int(0, BALANCE.EVT_BOULDER_COUNT[1]);
    const dmgScale = this.diffMul * this.earlyDmgGrace() * this.curseDmgMul;
    const p = this.player;
    for (let i = 0; i < n; i++) {
      const off = (rng.next() - 0.5) * 220, dir = rng.chance(0.5) ? 1 : -1;
      let x0, y0, dx, dy;
      if (rng.chance(0.5)) { x0 = p.x - dir * 260; y0 = p.y + off; dx = dir; dy = 0; }
      else { y0 = p.y - dir * 260; x0 = p.x + off; dx = 0; dy = dir; }
      this.evtLanes.push({ t: 1.0 + i * 0.35, x0, y0, dx, dy, dmgScale, tel: 0 });
    }
    this.banner = '滾岩衝撞！盯緊直線預警'; this.bannerT = 2.8; Sfx.play('boss'); addShake(3);
  },
  // 寶藏哥布林: spawns already fleeing; catch it inside EVT_GOBLIN_LIFE for the payout.
  evGoblin() {
    if (this.evtGoblin) return;
    const p = this.player, a = rng.next() * TAU;
    const x = clamp(p.x + Math.cos(a) * 150, TS * 2, this.world.pxW - TS * 2);
    const y = clamp(p.y + Math.sin(a) * 150, TS * 2, this.world.pxH - TS * 2);
    const e = this.world.spawnEnemy('evt_goblin', x, y, { hpScale: (1 + this.threat * 0.18) * this.diffMul });
    if (!e) return;
    e.fleeing = true;                      // reuse the thief bolt-for-it movement (×1.7 speed)
    e.evtLife = BALANCE.EVT_GOBLIN_LIFE;
    this.evtGoblin = e;
    this.banner = '寶藏哥布林出沒！在牠遁走前攔下'; this.bannerT = 3.0; Sfx.play('coin');
  },
  eventExplode(x, y, r, dmg) {
    this.world.spawnExplosion(x, y, r, P.ember, dmg * 0.7, { knockback: 80 });
    const p = this.player;
    if (p && !p.dead && dist(p.x, p.y, x, y) < r + p.radius) p.takeDamage(dmg, Math.atan2(p.y - y, p.x - x), this.world);
  },
  updateEvents(dt) {
    for (let i = this.evtMines.length - 1; i >= 0; i--) {
      const m = this.evtMines[i]; m.arm -= dt; m.life -= dt; m.pulse += dt * 6;
      let go = m.life <= 0;
      if (m.arm <= 0 && !go && dist(this.player.x, this.player.y, m.x, m.y) < 16) go = true;
      if (go) { this.eventExplode(m.x, m.y, m.r, m.dmg); this.evtMines.splice(i, 1); }
    }
    if (this.higgs) {
      this.higgs.t -= dt; this.higgs.next -= dt;
      if (this.higgs.next <= 0 && this.higgs.t > 0) {
        this.higgs.next = BALANCE.HIGGS_INTERVAL;
        const k = 1 + (rng.chance(0.5) ? 1 : 0);
        for (let j = 0; j < k; j++) {
          const a = rng.next() * TAU, r = rng.next() * 72;
          const x = clamp(this.player.x + Math.cos(a) * r, TS * 2, this.world.pxW - TS * 2);
          const y = clamp(this.player.y + Math.sin(a) * r, TS * 2, this.world.pxH - TS * 2);
          this.evtStrikes.push({ x, y, t: 1.0, max: 1.0, r: BALANCE.HIGGS_RADIUS, dmg: (BALANCE.HIGGS_DMG + Math.min(this.threat, 12)) * this.earlyDmgGrace() });
        }
      }
      if (this.higgs.t <= 0) this.higgs = null;
    }
    if (this.surround) {
      const sur = this.surround;
      sur.t -= dt;
      sur.enemies = sur.enemies.filter((e) => e && !e.dead);
      const killed = sur.total - sur.enemies.length;
      const p = this.player, sx = sur.cx, sy = sur.cy;
      // task-4 breach: carved a gap (killed >= breach) OR pressed into a wall (撞牆) for ~0.6s
      let wall = false;
      for (const o of SURROUND_PROBES) if (this.world.solidAt(p.x + o[0], p.y + o[1])) { wall = true; break; }
      sur.wallT = wall ? (sur.wallT || 0) + dt : 0;   // bal: require a SUSTAINED wall-press, not a 1-frame brush
      const wallBreach = sur.wallT >= 0.6;
      if (killed >= sur.breachNeed || wallBreach) { sur.breached = true; sur.wasWall = sur.wasWall || wallBreach; }
      // the ring tightens — the lock radius creeps inward so the circle visibly collapses
      sur.lockR = Math.max(BALANCE.SURROUND_LOCK_MIN, sur.lockR - BALANCE.SURROUND_CLOSE_SPEED * dt);
      // hold the player in the kill-zone until they breach (or the ring empties / times out)
      if (BALANCE.SURROUND_MUST_CLEAR && sur.enemies.length >= 2 && !sur.breached) {
        const dx = p.x - sx, dy = p.y - sy, d = Math.hypot(dx, dy);
        if (d > sur.lockR) {
          const k = sur.lockR / d;   // pull the player back inside the ring — via moveActor so they can't be shoved INTO a wall (player doesn't phase walls)
          this.world.moveActor(p, (sx + dx * k) - p.x, (sy + dy * k) - p.y); p.vx *= -0.3; p.vy *= -0.3;
          if (Math.random() < 0.16) this.world.particles.text(p.x, p.y - 16, '殺出缺口！', { color: P.purpleL, size: 10 });
        }
      }
      if (sur.t <= 0 || !sur.enemies.length || sur.breached) {
        if (sur.breached && sur.enemies.length) { this.banner = sur.wasWall ? '貼牆突圍！' : '殺出缺口，突破魂牢！'; this.bannerT = 2.2; }
        else if (!sur.enemies.length && sur.total) { this.banner = '魂牢清空！'; this.bannerT = 2.2; }
        this.surround = null;
      }
    }
    for (let i = this.evtStrikes.length - 1; i >= 0; i--) {
      const s = this.evtStrikes[i]; s.t -= dt;
      if (s.t <= 0) { this.eventExplode(s.x, s.y, s.r, s.dmg); this.evtStrikes.splice(i, 1); }
    }
    // ---- R20/B5 arms ------------------------------------------------------
    // bombers: tick the hard fuse — a fuse-out just sets dead, and the normal death
    // pipeline (world.update) fires the per-instance deathBlast + loot next frame.
    if (this.evtBombers.length) {
      for (const e of this.evtBombers) {
        if (e.dead) continue;
        e.evtFuse -= dt;
        if (e.evtFuse <= 0) e.dead = true;
        else if (e.evtFuse < 2 && (e.evtFuse % 0.3) < dt * 2) e.flash = 0.06;   // accelerating warning blink
      }
      this.evtBombers = this.evtBombers.filter((e) => !e.dead);
    }
    // cross-mines: fuse + last-second beam telegraph; detonation fires whether the fuse
    // ran out OR the player shot it (its normal death loot already happened — the cross is extra).
    for (let i = this.evtBombs.length - 1; i >= 0; i--) {
      const e = this.evtBombs[i];
      if (!e.dead) {
        e.evtFuse -= dt; e.evtTel -= dt;
        if (e.evtFuse <= 0) { e.dead = true; continue; }   // detonate next pass (keeps kill + fuse paths identical)
        if (e.evtFuse < 1.0 && e.evtTel <= 0) {
          e.evtTel = 0.09; const L = BALANCE.EVT_BOMB_ARM_LEN * TS;
          this.world.addBeam(e.x - L, e.y, e.x + L, e.y, withAlpha(P.laser, 0.5));
          this.world.addBeam(e.x, e.y - L, e.x, e.y + L, withAlpha(P.laser, 0.5));
          e.flash = 0.04;
        }
        continue;
      }
      this.evtBombCross(e);
      this.evtBombs.splice(i, 1);
    }
    // boulder lanes: telegraph countdown → spawn the crusher on its fixed trajectory
    for (let i = this.evtLanes.length - 1; i >= 0; i--) {
      const ln = this.evtLanes[i]; ln.t -= dt; ln.tel -= dt;
      if (ln.tel <= 0) { ln.tel = 0.09; this.world.addBeam(ln.x0, ln.y0, ln.x0 + ln.dx * 540, ln.y0 + ln.dy * 540, withAlpha(P.emberL, 0.45)); }
      if (ln.t > 0) continue;
      this.evtLanes.splice(i, 1);
      const x = clamp(ln.x0, TS, this.world.pxW - TS), y = clamp(ln.y0, TS, this.world.pxH - TS);
      const e = this.world.spawnEnemy('evt_boulder', x, y, { dmgScale: ln.dmgScale, hpScale: 1 + this.threat * 0.15, quiet: true });
      if (e) { e.evtVX = ln.dx * BALANCE.EVT_BOULDER_SPEED; e.evtVY = ln.dy * BALANCE.EVT_BOULDER_SPEED; e.evtLife = BALANCE.EVT_BOULDER_LIFE; this.evtBoulders.push(e); addShake(2); }
    }
    // boulders: manual straight integration (overrides AI drift/knockback so the lane stays honest)
    for (let i = this.evtBoulders.length - 1; i >= 0; i--) {
      const e = this.evtBoulders[i];
      if (e.dead) { this.evtBoulders.splice(i, 1); continue; }   // smashed by the player — normal loot path
      e.evtLife -= dt;
      e.x += e.evtVX * dt; e.y += e.evtVY * dt;
      e.vx = 0; e.vy = 0;
      if (e.evtLife <= 0 || e.x < -40 || e.y < -40 || e.x > this.world.pxW + 40 || e.y > this.world.pxH + 40) {
        e.dead = true; e.processed = true;   // silent crumble: no loot, no kill count
        this.world.particles.burst(e.x, e.y, 10, { color: [P.gray3, P.gray2], speed: 60, size: 2.5, life: 0.4 });
        this.evtBoulders.splice(i, 1);
      }
    }
    // treasure goblin: escape timer; a real kill pays a guaranteed equip on top of dropLoot's gold
    if (this.evtGoblin) {
      const g = this.evtGoblin;
      if (g.dead) {
        const d = this.world.rollEquipment(2 + (this.run.dropQuality || 0));
        if (d) this.world.addPickup('equip', g.x, g.y, 1, { def: d });
        this.world.particles.text(g.x, g.y - 18, '寶藏入手！', { color: P.goldL, size: 14, weight: '900' });
        this.evtGoblin = null;
      } else {
        g.evtLife -= dt;
        if ((g.evtLife % 0.5) < dt * 2) this.world.particles.burst(g.x, g.y - 8, 2, { color: [P.goldL], speed: 20, size: 1.5, life: 0.4, glow: true });   // coin-glint trail
        if (g.evtLife <= 0) {
          g.dead = true; g.processed = true;   // vanished — no loot for the slow
          this.world.particles.text(g.x, g.y - 14, '哥布林遁走了…', { color: P.gray4, size: 12 });
          this.world.particles.ring(g.x, g.y, P.goldL, 12, 60);
          this.evtGoblin = null;
        }
      }
    }
  },
  drawEvents() {
    for (const m of this.evtMines) {
      const armed = m.arm <= 0;
      glowWorld(m.x, m.y, armed ? 8 : 5, armed ? P.red : P.toxic, 0.3 + (armed ? 0.25 * (0.5 + 0.5 * Math.sin(m.pulse)) : 0));
      fillCircleWorld(m.x, m.y, 3.5, P.toxic); fillCircleWorld(m.x, m.y - 1, 2.3, P.redL);
      if (armed) strokeCircleWorld(m.x, m.y, m.r, withAlpha(P.red, 0.22), 1.5);
    }
    if (this.surround && this.surround.enemies.length) {
      const sr = this.surround.lockR;
      strokeCircleWorld(this.surround.cx, this.surround.cy, sr, withAlpha(P.purpleL, 0.16 + 0.1 * Math.sin(this.t * 4)), 2.5);
      strokeCircleWorld(this.surround.cx, this.surround.cy, sr - 3, withAlpha(P.purpleL, 0.08), 1);
      const ns = worldToScreen(this.surround.cx, this.surround.cy - sr - 6);
      const need = Math.max(0, (this.surround.breachNeed || BALANCE.SURROUND_BREACH_KILLS) - (this.surround.total - this.surround.enemies.length));
      const msg = need > 0 ? ('魂牢 · 殺出缺口還需 ×' + need + '（或貼牆）') : '魂牢 · 缺口已開，快突圍！';
      uiText(msg, ns.x, ns.y, { size: 11 * uiScale(), align: 'center', color: P.purpleL, weight: '800' });
    }
    for (const s of this.evtStrikes) {
      const k = 1 - clamp(s.t / s.max, 0, 1);
      strokeCircleWorld(s.x, s.y, s.r, withAlpha(P.redL, 0.4 + 0.4 * k), 2);
      fillCircleWorld(s.x, s.y, s.r * k, withAlpha(P.ember, 0.12));
    }
    // R20/B5 overlays (host-side flair; the synced telegraphs are the beams above)
    for (const e of this.evtBombers) if (!e.dead && e.evtFuse < 2.4) glowWorld(e.x, e.y, 8, P.ember, 0.18 + 0.18 * Math.sin(this.t * (10 - e.evtFuse * 3)));
    for (const e of this.evtBombs) if (!e.dead) {
      glowWorld(e.x, e.y, 7, P.laser, 0.22 + 0.18 * Math.sin(this.t * 6));
      if (e.evtFuse < 1.0) strokeCircleWorld(e.x, e.y, 10 + (1 - e.evtFuse) * 4, withAlpha(P.laser, 0.5), 1.5);
    }
    if (this.evtGoblin && !this.evtGoblin.dead) glowWorld(this.evtGoblin.x, this.evtGoblin.y, 10, P.goldL, 0.3);
  },
};
