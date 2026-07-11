// run/loop.js — loop methods of the run scene (R21.3 scene-file split).
// Mixed into runScene via Object.assign in run.js; all state lives on `this`.
import { Sfx } from '../../../engine/audio.js';
import { mouse, pressed } from '../../../engine/input.js';
import { dist } from '../../../engine/math.js';
import { P } from '../../../engine/palette.js';
import { setShakeScale } from '../../../engine/renderer.js';
import { BALANCE } from '../../balance.js';
import { Cheats } from '../../cheats.js';
import { checkBonds } from '../../content/bonds.js';
import { updatePetFollow } from '../../content/pets.js';
import { fusionAvailable } from '../../progression.js';
import { setScene } from '../../scene.js';
import { META } from '../../state.js';
import { settingsUI } from '../../ui/settings.js';
import { Tele } from '../../../net/telemetry.js';
import { refs } from '../refs.js';

export const loopMixin = {

  // 4.7: the 空白 used to launch from the hub carried into the run and instantly
  // skipped the intro. Require space to be RELEASED first (arm), then a fresh press skips.
  storyTick(dt) {
    this.story.t -= dt;
    if (!pressed('space')) this.story.armed = true;
    if (this.story.t <= 0) { Tele.ev('tutorial_step', { step: 'story_done' }); this.story = null; }   // P1-3: natural end
    else if (this.story.armed && pressed('space')) { Tele.ev('tutorial_step', { step: 'story_skipped' }); this.story = null; }   // P1-3: space-skip
  },

  // ---- update --------------------------------------------------------------
  update(dt) {
    this.t += dt;
    if (Cheats.toast > 0) Cheats.toast -= dt;
    if (Cheats.enabled) this.cheatInput();           // F2 dev panel clicks
    if (settingsUI.open) { settingsUI.update(); return; }
    if (this.dead) {
      this.deathT += dt; this.world.particles.update(dt);
      if (this.deathT > 0.8 && (pressed('space') || pressed('enter') || mouse.justDown)) setScene(refs.hub, {});
      return;
    }
    if (this.paused) { this.updatePause(); return; }
    if (this.leaveConfirm) { this.updateLeaveConfirm(); return; }   // R17/1.7: post-clear leave needs a confirm
    if (this.hudTut) { this.updateHudTut(); return; }   // 6.3A first-run HUD walkthrough pauses the field
    if (this.hiddenPanel) { this.updateHidden(dt); return; }   // a hidden room pauses the run for its choice
    if (this.choice) { this.updateChoice(); return; }
    if (this.equipChoice) { this.updateEquipChoice(); return; }   // B1 equip menu pauses the field
    if (this.eventChoice) { this.updateEventChoice(); return; }   // 原#3 mini-boss event pauses the field
    if (this.curseChoice) { this.updateCurseChoice(); return; }   // R18/B7 endless curse pauses the field (before the level-up open below)
    // R21.8: the chapter-intro story is a blocking onboarding state — freeze the world,
    // in-run clock, spawns and AFK drain while it's up (solo/host-less only: online co-op
    // can't freeze the SHARED world, so coop keeps the non-blocking countdown below).
    if (this.story && !this.coop) { this.storyTick(dt); return; }
    if (this.coop) {
      // online co-op can't freeze the SHARED world: Esc opens a non-blocking leave menu,
      // Tab build-review / minimap are view-only overlays, the in-run shop is disabled.
      if (pressed('pause') || pressed('escape')) { this.coopMenu = !this.coopMenu; Sfx.play('uiClick'); }
      if (this.coopMenu && this.updateCoopMenu()) return;        // returns true only if we left the run
      if (this.coopPick) this.updateCoopPick(dt);                // non-blocking level-up pick (world keeps running)
      if (pressed('build')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
      if (pressed('minimap')) { this.bigMap = !this.bigMap; Sfx.play('uiClick'); }
    } else {
      if (pressed('pause') || (pressed('escape') && !this.shopOpen)) { this.paused = true; this.confirmQuit = false; Sfx.play('uiClick'); return; }   // when the shop is open, Esc backs out of it (handled below) rather than opening pause over it
      if (pressed('build')) { this.showBuild = !this.showBuild; Sfx.play('uiClick'); }
      if (pressed('minimap')) { this.bigMap = !this.bigMap; Sfx.play('uiClick'); }
      if (pressed('shop') && !this.shopChoice) {                          // 原#4: B opens the soulshard / anvil shop anywhere
        if (Cheats.eatShop) Cheats.eatShop = false;                       // task 1: this B is part of the Konami code — don't pop the shop
        else { this.shopOpen = !this.shopOpen; Sfx.play('uiClick'); }
      }
      if (this.showBuild) return;   // freeze the field while reviewing your build
      if (this.shopOpen) { this.updateShopPanel(); return; }   // modal shop also freezes the field
    }

    if (Cheats.enabled && Cheats.fast) dt *= 3;   // F2 time-warp
    this.run.time += dt;
    // 6.3A: 2s into the FIRST battle (after any intro), pause once for a HUD walkthrough.
    if (!META.tutorialHUDDone && !this._hudTutShown && !this.coop && !this.story && this.run.time >= 2) { this.hudTut = true; this._hudTutShown = true; return; }
    this.tickBattleHints(dt);   // 6.2 first-battle combat hints
    this.threat = 1 + Math.floor(this.run.time / BALANCE.THREAT_PERIOD);   // ~1 -> 13 over the 20-min level
    // report-cap stage at the threat ceiling (threat keeps climbing past 20:00 during the Reaper window;
    // an uncapped stage would trip the server's anti-cheat plausibility gate on legit clear+reaper runs)
    this.run.stage = Math.min(this.threat, this.endless ? BALANCE.ENDLESS_STAGE_CAP : BALANCE.THREAT_CEIL); this.run.floor = this.threat;   // R18/B7: endless reports up to 99
    this.world.threat = this.threat;   // hazards read this to scale (capped)
    // screen shake stays gentle by default, swelling only when near death
    const hpFrac = this.player.maxHp ? this.player.hp / this.player.maxHp : 1;
    setShakeScale(hpFrac < 0.25 ? 1.0 : 0.42);
    this.world.update(dt);
    if (this.dailyTempoMul !== 1) { this.world.playerTempo *= this.dailyTempoMul; this.world.enemyTempo *= this.dailyTempoMul; }   // R18/B9 m_tempo: faster attack cadence (world recomputes tempo each tick)
    if (this.petId && this.player && !this.player.dead) updatePetFollow(this.petState, this.player.x, this.player.y, this.player.facing, dt);   // R18/B10 pet trails the local player
    // R17/1.4: a key pickup was just small floating text and easy to miss — surface it as a banner.
    // Increase-only detection: opening the vault DECREMENTS world.keys and must not retrigger.
    const wk = this.world.keys | 0;
    if (wk > (this._lastKeys | 0)) { this.banner = '🔑 獲得鑰匙！可開啟封鎖的寶庫寶箱'; this.bannerT = 3.2; Sfx.play('levelup'); }
    this._lastKeys = wk;
    if (Cheats.enabled && Cheats.godmode && this.player) this.player.hp = this.player.maxHp;   // F2 invincibility
    this.aimCamera();
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.story) this.storyTick(dt);   // coop only after R21.8 (solo returns at the blocking gate above) — the shared world keeps running under the overlay

    if (this.challenge) this.updateChallenge(dt);   // 原#3 timed challenge
    this.endlessTick(dt);   // R18/B7: curse trigger + soul-tax drain + milestones (endless only)
    this.spawnTick(dt);
    this.miniBossTick();
    this.eventsTick();
    this.updateEvents(dt);
    this.interactablesTick(dt);   // 原#2: refresh map interactables over time
    this.guardianTick();          // R17/7.1: randomized guardian wake-ups
    this.finalTick(dt);
    this.nearShrine = !!(this.shrinePos && !this.shrineUsed && dist(this.player.x, this.player.y, this.shrinePos.x, this.shrinePos.y) < 20);
    this.nearNpc = null;
    for (const n of this.npcs) { if (!n.used && dist(this.player.x, this.player.y, n.x, n.y) < 22) { this.nearNpc = n; break; } }
    this.nearHidden = null;
    for (const h of (this.hiddenRooms || [])) {
      if (h.used) continue;
      const dd = dist(this.player.x, this.player.y, h.x, h.y);
      if (!h.found && dd < 46) { h.found = true; this.banner = '✦ 發現隱藏房間！'; this.bannerT = 2.0; try { this.world.particles.ring(h.x, h.y, P.shardL, 20, 110); Sfx.play('levelup'); } catch (e) { /* */ } }   // 隱藏: only revealed on approach
      if (h.found && dd < 24) { this.nearHidden = h; break; }
    }
    if (this.world.vaultNear && pressed('interact')) { this.openVault(this.world.vaultNear); }   // R17/7.3: key-use confirm beats everything
    else if (this.nearShrine && pressed('interact')) { this.useShrine(); }
    else if (this.nearNpc && pressed('interact')) { this.useNpc(this.nearNpc); }
    else if (this.nearHidden && pressed('interact')) { this.openHidden(this.nearHidden); }
    else if (this.cleared && pressed('interact')) {   // leave as a win during the Reaper window
      // R17/1.7: E used to end the run INSTANTLY anywhere outside an interactable's 22px ring —
      // confirm first. Co-op can't freeze the shared world, so it keeps the immediate exit.
      if (this.coop) { this.finishRun(true); return; }
      this.leaveConfirm = true; Sfx.play('uiClick'); return;
    }
    // C2: surface a "can-fuse" hint (without revealing the recipe) on the rising edge
    const fr = fusionAvailable(this.run, this.player);
    if (fr && !this.fusionReady) { this.banner = '✦ 可進行武器合成 — 升級時將出現合成選項'; this.bannerT = 2.8; }
    this.fusionReady = fr;
    // 原#13: re-evaluate bond synergies on a light throttle; announce newly completed ones
    this.bondT = (this.bondT || 0) - dt;
    if (this.bondT <= 0) {
      this.bondT = 0.5;
      const nb = checkBonds(this.run, this.player);
      if (nb.length) {
        const n = nb[0];
        this.banner = (n.toTier > 1 ? ('★ 羈絆升階 · ' + n.bond.name + ' 第' + n.toTier + ' 階（' + n.tier.bonusDesc + '）')
          : ('★ 羈絆達成 · ' + n.bond.name + '（' + n.tier.bonusDesc + '）'));
        this.bannerT = 2.8; Sfx.play('levelup'); this.world.particles.ring(this.player.x, this.player.y, P.goldL, 26, 150);
        try { for (const x of nb) if (x.fromTier === 0 && !META.bondsSeen.includes(x.bond.id)) META.bondsSeen.push(x.bond.id); } catch (e) { /* */ }   // 8.2: live-record for the 圖鑑
      }
    }
    if (this.levelQueue > 0) { if (this.coop) this.coopLevelUp(); else if (!this.choice) this.openChoice(); }
    if (this.coop) this.coop.tick(dt, this);   // broadcast a world snapshot to guests (~18Hz)
  },
};
