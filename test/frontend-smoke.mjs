// Frontend smoke test (R21.8) — boots the game in headless Chromium and asserts the
// critical release path: module boot, registry counts, scene navigation, the
// first-run story pause (blocking onboarding), and the offline co-op self-tests.
//
// Run: `npm run test:frontend` (from test/). Spawns `node tools/serve.mjs` on :5173;
// fails fast if the port is already taken (close any running dev server first).
// All waits are state-condition based (waitForFunction) — no fixed sleeps.
// Writes no tracked snapshots/screenshots.
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL_BASE = 'http://localhost:5173/';

// Registry baseline (R21). When a content round adds entries, update these numbers
// in the same PR that integrates the content (see CLAUDE.md "Run / test").
const REG_BASELINE = {
  enemies: 63, items: 28, equipment: 60, abilities: 54,
  talents: 20, facilities: 11, weapons: 43, characters: 27,
};

const failures = [];
let checks = 0;
function ok(cond, msg) {
  checks++;
  if (cond) { console.log('  ok  ' + msg); }
  else { failures.push(msg); console.error('  FAIL ' + msg); }
}

async function portInUse() {
  try { await fetch(URL_BASE, { signal: AbortSignal.timeout(1500) }); return true; }
  catch { return false; }
}

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(URL_BASE, { signal: AbortSignal.timeout(1000) }); if (r.ok) return; }
    catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('dev server did not answer on ' + URL_BASE);
}

// Load the page with a FRESH save (clears the persisted META before boot).
async function freshBoot(page) {
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { localStorage.removeItem('soulshard.save.v1'); localStorage.removeItem('soulshard.save.v1.bak'); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__DBG && typeof window.__DBG.reg === 'function');
}

async function main() {
  if (await portInUse()) {
    console.error('Port 5173 is already in use — close the running dev server, then re-run this test.');
    process.exit(2);
  }
  const server = spawn(process.execPath, ['tools/serve.mjs'], { cwd: ROOT, stdio: 'ignore' });
  let browser;
  try {
    await waitForServer();
    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(String(e)));

    // ── 1. boot + registry ──────────────────────────────────────────────────
    console.log('phase 1: boot + registry');
    await freshBoot(page);
    const boot = await page.evaluate(() => ({ err: window.__GAME_ERROR__ || null, reg: window.__DBG.reg() }));
    ok(!boot.err, 'boot completes with empty __GAME_ERROR__ (got: ' + boot.err + ')');
    for (const [k, v] of Object.entries(REG_BASELINE)) {
      ok(boot.reg[k] === v, `registry ${k} === ${v} (got ${boot.reg[k]})`);
    }

    // ── 2. scene navigation renders without fatals ─────────────────────────
    console.log('phase 2: nav hub/run + render');
    const nav = await page.evaluate(() => {
      const out = {};
      try { window.__DBG.nav('hub'); window.__DBG.pump(3); out.hub = true; } catch (e) { out.hub = String(e); }
      try { window.__DBG.nav('run'); window.__DBG.pump(3); out.run = true; } catch (e) { out.run = String(e); }
      out.err = window.__GAME_ERROR__ || null;
      return out;
    });
    ok(nav.hub === true, 'nav(hub) + pump renders (got: ' + nav.hub + ')');
    ok(nav.run === true, 'nav(run) + pump renders (got: ' + nav.run + ')');
    ok(!nav.err, 'no __GAME_ERROR__ after scene navigation');

    // ── 3. story pause: the first-run chapter text must freeze the world ───
    // (hudTut is isolated via META.tutorialHUDDone so only the story gate is measured)
    console.log('phase 3: story pause (blocking onboarding)');
    await freshBoot(page);
    const story = await page.evaluate(() => {
      window.__DBG.meta().tutorialHUDDone = true;   // isolate: hudTut must not interfere
      window.__DBG.nav('run');
      const s = window.__DBG.scene();
      if (!s.story) return { noStory: true };
      const before = { time: s.run.time, hp: s.player.hp, enemies: s.world.enemies.length };
      // pump 120 sim frames (2s) while the story overlay is up — CLAUDE.md trap ④:
      // clear any modal choice each frame so a freeze can't be blamed on them.
      for (let i = 0; i < 120; i++) {
        s.choice = null; s.equipChoice = null; s.eventChoice = null; s.curseChoice = null; s.anvilChoice = null;
        s.update(1 / 60);
      }
      const frozen = { time: s.run.time, hp: s.player.hp, enemies: s.world.enemies.length, storyStill: !!s.story };
      // let the story expire naturally (t=6.5s → 390 frames total), then run 60 more
      for (let i = 0; i < 340; i++) {
        s.choice = null; s.equipChoice = null; s.eventChoice = null; s.curseChoice = null; s.anvilChoice = null;
        s.player.hp = s.player.maxHp;   // anti-AFK / contact damage must not kill the probe
        s.update(1 / 60);
      }
      const after = { time: s.run.time, storyGone: !s.story };
      return { before, frozen, after };
    });
    ok(!story.noStory, 'fresh save first run shows a story chapter');
    if (!story.noStory) {
      ok(story.frozen.storyStill, 'story still up after 120 frames (dur 6.5s)');
      ok(story.frozen.time === story.before.time, `run.time frozen during story (${story.before.time} -> ${story.frozen.time})`);
      ok(story.frozen.hp === story.before.hp, `player HP unchanged during story (${story.before.hp} -> ${story.frozen.hp})`);
      ok(story.frozen.enemies === story.before.enemies, `enemy count unchanged during story (${story.before.enemies} -> ${story.frozen.enemies})`);
      ok(story.after.storyGone, 'story expires naturally');
      ok(story.after.time > 0.5, `run.time resumes after story (got ${story.after.time})`);
    }

    // ── 4. tutorial chain: hudTut still pops ~2s into ACTUAL battle ─────────
    console.log('phase 4: hudTut timing chain');
    await freshBoot(page);
    const tut = await page.evaluate(() => {
      window.__DBG.nav('run');
      const s = window.__DBG.scene();
      s.player.takeDamage = () => {};   // godmode: the probe must survive to 2s of battle
      for (let i = 0; i < 540 && !s.hudTut; i++) {   // story (≤390) + 2s battle (120) + slack
        s.choice = null; s.equipChoice = null; s.eventChoice = null; s.curseChoice = null; s.anvilChoice = null;
        s.player.hp = s.player.maxHp;
        s.update(1 / 60);
      }
      return { hudTut: !!s.hudTut, storyGone: !s.story, time: s.run.time };
    });
    ok(tut.storyGone, 'story finished before hudTut check');
    ok(tut.hudTut, `hudTut pops ~2s into actual battle (run.time ${tut.time})`);

    // ── 5. codex: discovery data layer + hub panel + goals (R22) ────────────
    console.log('phase 5: codex + goals');
    await freshBoot(page);
    const codex = await page.evaluate(async () => {
      const out = {};
      const m = window.__DBG.meta();
      out.freshEmpty = !!m.codex && ['w', 'a', 'boss', 'rec'].every((k) => m.codex[k] && Object.keys(m.codex[k]).length === 0);
      window.__DBG.nav('run');
      const s = window.__DBG.scene();
      s.player.addWeapon('w_lightning', s.world);
      out.weaponSeen = m.codex.w.w_lightning === true;
      // manufacture an evolve on the starting weapon: max level + grant its req passive
      const cx = await import('/src/game/content/codex.js');
      const rec = cx.allRecipes().find((r) => r.baseId === 'w_soulbolt');
      const inst = s.player.weapons.find((w) => w.def.id === 'w_soulbolt');
      if (rec && inst) {
        inst.level = 7;
        if (rec.reqId) s.run.abilityLevels[rec.reqId] = 1;
        s.player.checkEvolve(inst, s.world);
        out.recipeSeen = m.codex.rec.w_soulbolt === true && m.codex.w[rec.evoId] === true;
      } else out.recipeSeen = 'setup-failed';
      const g = await import('/src/game/content/goals.js');
      const goals = g.goalsFor(m);
      out.goals = Array.isArray(goals) && goals.length >= 1 && goals.length <= 3 && goals.every((x) => x.title);
      window.__DBG.nav('hub');
      const h = window.__DBG.scene();
      out.station = (h.stations || []).some((x) => x.id === 'codex');
      h.openPanel('codex');
      out.tabs = [];
      for (let t = 0; t < 5; t++) { h.codexTab = t; try { h.render(); out.tabs.push(true); } catch (e) { out.tabs.push(String(e)); } }
      h.panel = null; h.openPanel('achievements');
      try { h.render(); out.achievements = true; } catch (e) { out.achievements = String(e); }
      out.err = window.__GAME_ERROR__ || null;
      return out;
    });
    ok(codex.freshEmpty === true, 'fresh save codex is empty');
    ok(codex.weaponSeen === true, 'addWeapon marks codex.w');
    ok(codex.recipeSeen === true, 'checkEvolve marks codex.rec + evolved weapon (got ' + codex.recipeSeen + ')');
    ok(codex.goals === true, 'goalsFor returns 1-3 titled goals');
    ok(codex.station === true, 'hub has the codex station');
    ok(codex.tabs.every((t) => t === true), 'codex panel renders all 5 tabs (' + JSON.stringify(codex.tabs) + ')');
    ok(codex.achievements === true, 'achievements panel renders with the focus tab default');
    ok(!codex.err, 'no __GAME_ERROR__ after codex phase');

    // ── 6. offline co-op self-tests ─────────────────────────────────────────
    console.log('phase 6: co-op self-tests');
    await freshBoot(page);
    const coop = await page.evaluate(() => {
      const out = {};
      try { out.rt = window.__DBG.coopRoundTrip(); } catch (e) { out.rtError = String(e && e.stack || e); }
      try { out.boss = window.__DBG.coopBossSyncTest(); } catch (e) { out.bossError = String(e && e.stack || e); }
      // R22 codex pollution guard: the host records its OWN weapon, never the guest's
      const cw = (window.__DBG.meta().codex || {}).w || {};
      out.codexHostOwn = cw.w_soulbolt === true;
      out.codexGuestLeak = cw.w_homing === true;
      out.err = window.__GAME_ERROR__ || null;
      return out;
    });
    ok(!coop.rtError, 'coopRoundTrip ran (error: ' + coop.rtError + ')');
    if (coop.rt) {
      ok(coop.rt.guestRendered === true, 'coopRoundTrip guestRendered (error: ' + coop.rt.guestError + ')');
      ok(coop.rt.mvLiftRoundTrip === true, 'coopRoundTrip mvLift tuple round-trips (got ' + coop.rt.mvLiftRoundTrip + ')');
    }
    ok(!coop.bossError, 'coopBossSyncTest ran (error: ' + coop.bossError + ')');
    if (coop.boss) {
      ok(coop.boss.guestRenderedOk === true, 'coopBossSyncTest guest rendered ok');
      ok((coop.boss.errors || []).length === 0, 'coopBossSyncTest no errors (' + JSON.stringify(coop.boss.errors) + ')');
    }
    ok(coop.codexHostOwn === true, 'coop host records its own starting weapon in codex');
    ok(coop.codexGuestLeak === false, 'coop guest weapon does NOT leak into host codex');
    ok(!coop.err, 'no __GAME_ERROR__ after co-op self-tests');

    // ── 7. accessibility settings + assist mode (R23) ───────────────────────
    console.log('phase 7: accessibility + assist');
    await freshBoot(page);
    const acc = await page.evaluate(() => {
      const out = {};
      const s = window.__DBG.meta().settings;
      out.defaults = typeof s.shake === 'number' && s.flash === true && typeof s.particles === 'number' && s.dmgNums === true;
      out.assistDefault = JSON.stringify(window.__DBG.meta().assist) === JSON.stringify({ hp: 1, dmg: 1, speed: 1 });
      // assist run: multipliers locked at run start, run flagged as assisted
      Object.assign(window.__DBG.meta().assist, { hp: 0.5, dmg: 0.5, speed: 0.8 });
      window.__DBG.nav('run');
      const sc = window.__DBG.scene();
      out.assistRun = sc.run.assist === true && sc.run.assistHpMul === 0.5 && sc.run.assistDmgMul === 0.5 && sc.run.assistSpeedMul === 0.8;
      out.err = window.__GAME_ERROR__ || null;
      return out;
    });
    ok(acc.defaults === true, 'settings defaults: shake is a number, flash/particles/dmgNums present');
    ok(acc.assistDefault === true, 'META.assist defaults to all 1');
    ok(acc.assistRun === true, 'assist multipliers lock onto the run and flag it assisted');
    ok(!acc.err, 'no __GAME_ERROR__ after assist run');
    // legacy migration: a bool shake save normalizes to a number on load
    const legacy = await page.evaluate(() => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('soulshard.save.v1')) || 'soulshard.save.v1.slot0';
      const m = JSON.parse(JSON.stringify(window.__DBG.meta()));
      m.settings.shake = true; delete m.settings.flash; delete m.settings.particles; delete m.settings.dmgNums; delete m.assist;
      localStorage.setItem(key, JSON.stringify(m));
      return key;
    });
    void legacy;
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__DBG && typeof window.__DBG.reg === 'function');
    const mig = await page.evaluate(() => {
      const s = window.__DBG.meta().settings;
      return { shake: s.shake, flash: s.flash, particles: s.particles, dmgNums: s.dmgNums, assist: window.__DBG.meta().assist };
    });
    ok(mig.shake === 1, 'legacy bool shake:true migrates to 1 (got ' + mig.shake + ')');
    ok(mig.flash === true && mig.particles === 1 && mig.dmgNums === true, 'missing accessibility fields backfilled');
    ok(!!mig.assist && mig.assist.hp === 1, 'META.assist backfilled on legacy save');

    ok(pageErrors.length === 0, 'no uncaught page errors (' + JSON.stringify(pageErrors.slice(0, 3)) + ')');
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }

  console.log(`\n${checks - failures.length}/${checks} assertions passed`);
  if (failures.length) {
    console.error('\nFAILURES:\n- ' + failures.join('\n- '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
