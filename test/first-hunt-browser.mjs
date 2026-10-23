// R33 functional browser tests. Fresh isolated profile; all cloud requests blocked.
// Fixtures use controlled HP/time for branch coverage, not human/balance evidence.
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRODUCTION = process.argv.includes('--production');
const BASE = PRODUCTION ? 'https://soulshard.terrychou.com' : 'http://localhost:5173';
const OUT = path.join(ROOT, '.pipeline', PRODUCTION ? 'first-hunt-live' : 'first-hunt');
let checks = 0;
const ok = (condition, message) => { assert.ok(condition, message); checks++; console.log('  ok ' + message); };
let server, browser;
try {
  if (!PRODUCTION) {
    let occupied = false;
    try { occupied = (await fetch(BASE, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* free */ }
    assert.ok(!occupied, 'port 5173 must be free');
    server = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, stdio: 'ignore' });
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(BASE)).ok) break; } catch { /* startup */ }
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  console.log(`first-hunt target: ${BASE}; isolated profile; all /api requests blocked`);
  await mkdir(OUT, { recursive: true });
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, serviceWorkers: 'block' });
  await context.route('**/api/**', (route) => route.abort());
  await context.addInitScript(() => { window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; });
  const page = await context.newPage(), errors = [], uploads = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('request', (r) => { if (r.method() === 'POST' && /\/api\/(runs|guest-runs)/.test(r.url())) uploads.push(r.url()); });
  await page.goto(BASE);
  await page.waitForFunction(() => window.__DBG?.reg, null, { polling: 100 });
  await page.waitForFunction(() => !document.getElementById('loading'), null, { polling: 100 });
  await page.evaluate(async () => {
    const { META, applySettings } = await import('/src/game/state.js');
    META.settings.muted = true; META.settings.analytics = false; applySettings();
    window.__DBG.nav('hub'); window.__DBG.scene().dialogue = null;
    window.__DBG.scene().openPanel('sortie'); window.__DBG.scene().sortieTut = false;
    window.__DBG.pump(0);
  });
  const clickRect = async (name, layout = 'firstHuntLayout') => {
    const r = await page.evaluate(({ name, layout }) => {
      const r = window.__DBG.scene()[layout]()[name];
      return { x: (r.x + r.w / 2) / devicePixelRatio, y: (r.y + r.h / 2) / devicePixelRatio };
    }, { name, layout });
    await page.mouse.click(r.x, r.y);
    await page.evaluate(() => window.__DBG.pump(2, 0));
  };
  await clickRect('firstHuntBar', 'sortieLayout');
  const entered = await page.evaluate(async () => ({ panel: window.__DBG.scene().panel, error: window.__GAME_ERROR__, mouse: (await import('/src/engine/input.js')).mouse }));
  ok(entered.panel === 'firstHunt', 'sortie entry opens the first-hunt panel: ' + JSON.stringify(entered));
  await page.screenshot({ path: path.join(OUT, 'selection-1280.png') });

  const layouts = [];
  for (const viewport of [{ width: 1280, height: 720 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    layouts.push(await page.evaluate(() => {
      window.__DBG.pump(1, 0); const s = window.__DBG.scene(), L = s.firstHuntLayout(); s.render();
      return L.cards.every((r) => r.y + r.h < L.projects[0].y) && L.projects.every((r) => r.y + r.h < L.start.y) && L.restore.x + L.restore.w <= L.f.x + L.f.w;
    }));
    await page.screenshot({ path: path.join(OUT, `selection-${viewport.width}.png`) });
  }
  ok(layouts.every(Boolean), 'cards, projects and buttons do not overlap at both supported viewports');
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const hero of ['hunter', 'pyro', 'guardian']) {
    await page.evaluate((hero) => {
      window.__DBG.nav('hub'); const s = window.__DBG.scene(); s.dialogue = null; s.openPanel('firstHunt');
      s.firstHuntSelected = hero; s.render();
      const m = window.__DBG.meta();
      window.__FH_BEFORE = JSON.stringify({ stats: m.stats, levels: m.levels, gold: m.gold, guild: m.guild, selected: m.selectedCharacter });
      window.__FH_UNLOCKED = JSON.stringify(m.unlocked.characters);
    }, hero);
    await clickRect('start');
    const start = await page.evaluate(() => {
      const s = window.__DBG.scene(); s.render();
      return { mode: s.run.mode, id: s.run.characterId, story: s.story, tutorial: s.hudTut, level: s.player.weapons[0].level,
        unchangedUnlocks: JSON.stringify(window.__DBG.meta().unlocked.characters) === window.__FH_UNLOCKED, forge: s.player.weapons[0].forge };
    });
    ok(start.mode === 'first_hunt' && start.id === hero && !start.story && !start.tutorial && start.level === 2 && start.forge === null && start.unchangedUnlocks, hero + ': borrowed loadout starts without spending, blocking intro or permanent forge');
    const pulse = await page.evaluate(async (hero) => {
      const s = window.__DBG.scene(), { Enemies } = await import('/src/game/content/registry.js');
      const p = s.player;
      const target = s.world.spawnEnemy({ ...Enemies.get('slime'), hp: 1000 }, p.x + 18, p.y, { quiet: true });
      target.spawnT = 0; s.world.rebuildGrid();
      if (hero === 'hunter') s.world.collect('xp', 25, p.x, p.y);
      if (hero === 'pyro') {
        for (let i = 0; i < 4; i++) {
          const e = s.world.spawnEnemy('slime', p.x + 24 + i, p.y, { quiet: true }); e.spawnT = 0; e.hurt(10000, 0, 0, s.world);
        }
        s.world.update(1 / 120);
      }
      s.firstHuntTick(hero === 'guardian' ? 6 : 1 / 120);
      return { pulses: s.firstHunt.pulses, hp: target.hp, max: target.maxHp, guarded: p.invuln >= 1, burn: !!target.status.burn };
    }, hero);
    ok(pulse.pulses >= 1 && pulse.hp < pulse.max && (hero !== 'pyro' || pulse.burn) && (hero !== 'guardian' || pulse.guarded), hero + ': identity ability activates and damages a real enemy');
    await page.evaluate(() => {
      const s = window.__DBG.scene(); s.player.hp = s.player.maxHp; s.run.time = 19.99; s.update(0.02);
      s.render();
    });
    const pause = await page.evaluate(() => { const s = window.__DBG.scene(), t = s.run.time; s.update(1); return s.firstHuntChoice && s.run.time === t; });
    ok(pause, hero + ': first growth choice pauses the actual run clock');
    if (hero === 'hunter') await page.screenshot({ path: path.join(OUT, 'growth-choice.png') });
    await page.keyboard.press('1'); await page.evaluate(() => window.__DBG.pump(1, 0));
    ok(await page.evaluate(() => { const s = window.__DBG.scene(); return s.firstHunt.growth === 1 && s.firstHunt.power > 1; }), hero + ': keyboard growth choice applies the signature upgrade');
    const second = await page.evaluate(() => {
      const s = window.__DBG.scene(); s.run.time = 64.99; s.update(0.02); const hp = s.player.maxHp;
      s.chooseFirstHuntUpgrade('vigor'); return s.firstHunt.growth === 2 && s.player.maxHp === hp + 25;
    });
    ok(second, hero + ': second growth choice applies a different build effect');
    const boss = await page.evaluate(() => {
      const s = window.__DBG.scene(); s.run.time = 89.99; s.update(0.02); const surge = s.firstHunt.surge;
      s.run.time = 149.99; s.update(0.02);
      const e = s.bossRef; e.spawnT = 0; s.player.invuln = 0;
      s.tickFirstHuntBoss(5); const a = s.firstHunt.attack;
      const hp = s.player.hp; s.player.x += 110; s.tickFirstHuntBoss(1.2);
      const dodge = s.player.hp === hp;
      s.firstHunt.bossCd = 0; s.tickFirstHuntBoss(0.01);
      const a2 = s.firstHunt.attack; s.player.x = a2.x; s.player.y = a2.y; s.player.invuln = 0; s.player.stats.dodge = 0;
      s.tickFirstHuntBoss(1.2); const hit = s.player.hp < hp;
      e.hp = e.maxHp * 0.45; s.tickFirstHuntBoss(0.01); s.firstHunt.bossCd = 0; s.tickFirstHuntBoss(0.01);
      s.render();
      return { surge, id: e.id, circle: a?.kind === 'circle', dodge, hit, phase: s.firstHunt.bossPhase,
        cross: s.firstHunt.attack?.kind === 'cross', beam: s.world.beams.some((b) => b.color === '#ff5a3c' && b.life > 1) };
    });
    ok(boss.surge && boss.id === 'first_hunt_keeper' && boss.circle && boss.dodge && boss.hit && boss.phase === 1 && boss.cross && boss.beam, hero + ': surge, dodgeable damaging telegraph, second phase and persistent cross warning');
    if (hero === 'hunter') {
      await page.screenshot({ path: path.join(OUT, 'boss-cross.png') });
      await page.evaluate(async () => { const { META, applySettings } = await import('/src/game/state.js'); META.settings.particles = 0; META.settings.flash = false; applySettings(); window.__DBG.scene().render(); });
      await page.screenshot({ path: path.join(OUT, 'boss-particles-off.png') });
    }
    const won = await page.evaluate(() => {
      const s = window.__DBG.scene(), e = s.bossRef; s.player.hp = s.player.maxHp;
      e.iframe = 0; e.spawnT = 0; e.hurt(e.hp + 1, 0, 0, s.world); s.update(1 / 120); s.deathT = 1; s.render();
      const m = window.__DBG.meta();
      const isolated = JSON.stringify({ stats: m.stats, levels: m.levels, gold: m.gold, guild: m.guild, selected: m.selectedCharacter }) === window.__FH_BEFORE;
      const attempts = m.firstHunt.attempts; s.finishRun(true);
      return { won: s.won, receipt: s.run.firstHuntReceipt, isolated, once: m.firstHunt.attempts === attempts, reaper: s.reaperSpawned };
    });
    ok(won.won && won.receipt?.earned && won.isolated && won.once && !won.reaper, hero + ': real boss death awards once without touching campaign, economy, normal stats or Reaper');
    if (hero === 'hunter') await page.screenshot({ path: path.join(OUT, 'result.png') });
    await page.keyboard.press('Space'); await page.evaluate(() => window.__DBG.pump(2, 0));
    ok(await page.evaluate(() => window.__DBG.scene().panel === 'firstHunt'), hero + ': return opens the rebuilding panel');
    await clickRect('restore');
    const confirm = await page.evaluate(() => {
      const s = window.__DBG.scene(), r = s.confirmRects().yes;
      return { shown: !!s.confirm, x: (r.x + r.w / 2) / devicePixelRatio, y: (r.y + r.h / 2) / devicePixelRatio };
    });
    ok(confirm.shown, hero + ': spending an earned seal uses the existing confirmation');
    await page.mouse.click(confirm.x, confirm.y); await page.evaluate(() => window.__DBG.pump(1, 0));
    const restored = await page.evaluate(() => { const s = window.__DBG.scene(), m = window.__DBG.meta(); return { stage: m.firstHunt.restored, brazier: s.stations.some((s) => s.id === 'firstHunt' && s.sprite === 'fh_brazier_lit'), unlocks: m.unlocked.characters }; });
    const stage = ['hunter', 'pyro', 'guardian'].indexOf(hero) + 1;
    ok(restored.stage === stage && restored.brazier && (stage < 2 || restored.unlocks.includes('pyro')) && (stage < 3 || restored.unlocks.includes('guardian')), hero + ': seal consumed, town updated and promised character unlocked');
  }
  await page.evaluate(() => { const s = window.__DBG.scene(); s.panel = null; s.dialogue = null; s.render(); });
  await page.screenshot({ path: path.join(OUT, 'town-restored.png') });
  await page.evaluate(() => { window.__DBG.scene().openPanel('firstHunt'); window.__DBG.scene().render(); });
  await page.screenshot({ path: path.join(OUT, 'rebuilding-complete.png') });
  await page.reload(); await page.waitForFunction(() => window.__DBG?.reg, null, { polling: 100 });
  ok(await page.evaluate(() => window.__DBG.meta().firstHunt.restored === 3), 'rebuilding survives save and reload');
  // Continuous 120Hz execution, without time jumps. Health is held full only to
  // exercise the complete timeline, not to estimate player win rates or balance.
  const sustained = await page.evaluate(async () => {
    const { newRun } = await import('/src/game/state.js');
    const { setScene, applyPending } = await import('/src/game/scene.js');
    const { refs } = await import('/src/game/scenes/refs.js');
    const { updateCamera } = await import('/src/engine/renderer.js');
    const results = [];
    for (const hero of ['hunter', 'pyro', 'guardian']) {
      setScene(refs.run, { run: newRun({ mode: 'first_hunt', characterId: hero }) }); applyPending();
      const s = window.__DBG.scene(), dt = 1 / 120;
      s.world.inputFor = () => {
        const t = s.run.time, cx = s.map.center.x + Math.cos(t * 0.7) * 52, cy = s.map.center.y + Math.sin(t * 0.7) * 52;
        const dx = cx - s.player.x, dy = cy - s.player.y, len = Math.hypot(dx, dy) || 1;
        return { move: { x: dx / len, y: dy / len }, dash: false };
      };
      let sawBoss = false, maxEnemies = 0;
      for (let i = 0; i < 180 * 120 && !s.dead; i++) {
        if (s.firstHuntChoice) s.chooseFirstHuntUpgrade('resonance');
        s.player.hp = s.player.maxHp;
        s.update(dt); updateCamera(dt);
        sawBoss ||= !!s.bossRef;
        maxEnemies = Math.max(maxEnemies, s.world.enemies.length);
      }
      results.push({ hero, time: s.run.time, growth: s.firstHunt.growth, pulses: s.firstHunt.pulses, sawBoss, maxEnemies,
        finite: [s.player.x, s.player.y, s.player.hp, s.run.xp].every(Number.isFinite) });
    }
    return results;
  });
  ok(sustained.every((r) => r.time >= 150 && r.growth === 2 && r.pulses > 0 && r.sawBoss && r.maxEnemies <= 30 && r.finite), 'continuous 120Hz trial for all heroes reaches growth and boss safely: ' + JSON.stringify(sustained));
  const failed = await page.evaluate(async () => {
    const { META, newRun } = await import('/src/game/state.js');
    const { setScene, applyPending } = await import('/src/game/scene.js');
    const { refs } = await import('/src/game/scenes/refs.js');
    const before = JSON.stringify(META.firstHunt.completed);
    for (const kind of ['death', 'leave', 'cheat']) {
      setScene(refs.run, { run: newRun({ mode: 'first_hunt', characterId: 'hunter' }) }); applyPending();
      const s = window.__DBG.scene();
      if (kind === 'leave') { s.abandon(); applyPending(); }
      else if (kind === 'death') s.finishRun(false);
      else { s.run.cheated = true; s.clearLevel(); }
    }
    return JSON.stringify(META.firstHunt.completed) === before && META.firstHunt.restored === 3;
  });
  ok(failed, 'actual death, abandon and developer clear paths grant no extra seals or restorations');
  const normal = await page.evaluate(() => { window.__DBG.nav('run'); const s = window.__DBG.scene(); s.render(); return !s.firstHunt && s.run.mode === 'normal' && !!s.story && s.map.tw > 48; });
  ok(normal, 'subsequent normal run restores the original map, intro and lifecycle');
  await page.evaluate(async () => { const { META, saveMeta } = await import('/src/game/state.js'); delete META.firstHunt; saveMeta(); });
  await page.reload(); await page.waitForFunction(() => window.__DBG?.reg, null, { polling: 100 });
  const legacy = await page.evaluate(async () => {
    const { firstHuntProgress } = await import('/src/game/content/first_hunt.js');
    window.__DBG.nav('hub'); const s = window.__DBG.scene(); s.dialogue = null; s.openPanel('firstHunt'); s.render();
    return firstHuntProgress(window.__DBG.meta()).seals === 0 && firstHuntProgress(window.__DBG.meta()).restored === 0;
  });
  ok(legacy, 'actual legacy save reload opens the new panel without granting seals');
  const capped = await page.evaluate(async () => {
    const { newRun } = await import('/src/game/state.js');
    const { setScene, applyPending } = await import('/src/game/scene.js');
    const { refs } = await import('/src/game/scenes/refs.js');
    setScene(refs.run, { run: newRun({ mode: 'first_hunt' }) }); applyPending();
    const s = window.__DBG.scene(); s.run.time = 20; s.update(0);
    s.player.weapons[0].level = 7; const before = s.player.stats.damageMult;
    const once = s.chooseFirstHuntUpgrade('weapon'), twice = s.chooseFirstHuntUpgrade('weapon');
    return once && !twice && Math.abs(s.player.stats.damageMult / before - 1.15) < 1e-9;
  });
  ok(capped, 'weapon blessing converts capped levels into damage and cannot apply twice');
  ok(uploads.length === 0, 'trial never submits a normal or guest leaderboard result');
  ok(errors.length === 0, 'no browser exceptions: ' + JSON.stringify(errors));
  console.log(`${checks} first-hunt browser checks passed; evidence: ${OUT}`);
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) { const stopped = new Promise((r) => server.once('exit', r)); server.kill(); await stopped; }
}
