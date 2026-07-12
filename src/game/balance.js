// ---------------------------------------------------------------------------
// Central balance config. The spec asks that every difficulty / economy / pacing
// magic number live in ONE tunable place instead of being scattered through the
// gameplay code. Gameplay reads from BALANCE; tune here and re-simulate.
//
// Initial values are intentionally CONSERVATIVE (the spec's "-300%" is treated as
// "scale player power DOWN and enemy power UP via coefficients, then playtest").
// ---------------------------------------------------------------------------
export const BALANCE = {
  // ---- run timeline (E2 / 原#13) ----------------------------------------
  LEVEL_TIME: 20 * 60,                       // a run lasts 20 minutes
  MINIBOSS_TIMES: [5 * 60, 10 * 60, 15 * 60], // a DISTINCT mini-boss every 5 min
  REAPER_DELAY: 30,                          // killable Reaper 30s after big boss dies
  THREAT_PERIOD: 99,                         // round-6: ceiling now hits the documented ~13 (was 112 → capped at 11) + brisker ramp
  THREAT_CEIL: 13,                           // reported stage cap (= floor(LEVEL_TIME/THREAT_PERIOD)+1); threat itself keeps climbing during the Reaper window
  // The Reaper is the hidden ENDGAME superboss — a huge DPS check that only a heavily
  // stacked build can out-damage (hpScale = (BASE + threat*PER) * diffMul). Damage is
  // high but tempered so a stacked/defensive build survives a few hits (not a one-shot).
  REAPER_HP_BASE: 8, REAPER_HP_PER_THREAT: 1.4,
  REAPER_DMG_BASE: 1.35, REAPER_DMG_PER_THREAT: 0.03,   // round-6: ease the late-game near-one-shot contact (was 1.45 / 0.045); still a DPS check
  REAPER_GRACE: 0.6,                          // round16/10.9: post-clear invuln window so a boss death-blast / lingering AoE during the clear→Reaper transition can't false-trigger game over
  ENDLESS_BOSS_INTERVAL: 180,                 // round16/6.6 無盡挑戰: a cross-biome boss every N seconds (no 20-min cap / no Reaper; threat keeps climbing)
  // ---- R18/B7 endless deep rework -----------------------------------------
  CURSE_INTERVAL: 300,                        // 無盡: a 3-of-12 curse choice every N seconds (first at 5:00)
  ENDLESS_STAGE_CAP: 99,                      // endless reports threat up to this (normal stays at THREAT_CEIL)
  ENDLESS_MILESTONES: [900, 1200, 1500, 1800, 2400],   // seconds → banner + in-run reward
  ENDLESS_MILESTONE_GOLD: [300, 500, 800, 1200, 2000],
  ENDLESS_MILESTONE_SHARD: [30, 50, 80, 120, 200],

  // ---- weapons / fusion (user clarification) ----------------------------
  WEAPON_MAX_LEVEL: 7,                       // weapons cap at level 7 ("maxed")
  // fusion (合成) unlocks when the player has an evolvable maxed weapon AND either
  // >= FUSE_MAXED_WEAPONS maxed weapons, OR 1 maxed weapon + >= FUSE_PASSIVES passive(s).
  FUSE_MAXED_WEAPONS: 2,
  FUSE_PASSIVES: 1,

  // ---- player nerfs (D1 / 原#6, 原#12 power-creep pass) ------------------
  PLAYER_DAMAGE_MULT: 0.85,                  // global scale on player weapon damage (sim-tuned; was 0.78, too low vs denser spawns)
  ABILITY_DAMAGE_MULT: 0.8,                  // global scale on passive/ability damage
  LIFESTEAL_MULT: 0.40,                      // 原#12: lifesteal toned down (was 0.45) — eased after sim
  LIFESTEAL_CAP: 0.15,                       // 原#12: hard cap lowered (was 0.20)
  DODGE_MULT: 0.5,                           // dodge effectiveness (was too strong)
  DODGE_CAP: 0.32,                           // 原#12: dodge cap lowered (was 0.35)
  REGEN_MULT: 0.6,                           // round-6: regen builds out-healed the swarm — base now sits just under the AFK idle drain
  CRIT_CAP: 0.6,                             // round-6: cap total crit chance (uncapped stacking → guaranteed crit compounding critMult)
  FIRE_RATE_CAP: 2.4,                         // round-6: cap the effective fire-rate multiplier (haste×forge×frenzy×tempo could compound past ×15)
  DEFENSE_MULT: 0.9,                         // 原#12: flat-defense scale (eased from 0.85 after sim)

  // ---- enemy buffs (D1 / 原#6, E3 / 原#17) ------------------------------
  ENEMY_HP_MULT: 1.45,                        // round-5 task-11: beefier mobs (was 1.15) — they linger, so the swarm stays thick
  ENEMY_DMG_MULT: 1.15,                       // round-6: contact bites more (was 1.08) but not brutal in the opening; threat-dmgScale + diffMul carry the late game / D2-D5
  BOSS_HP_MULT: 1.3,                         // boss HP up (on top of per-boss scaling)
  BOSS_DMG_MULT: 1.35,                       // boss damage up
  ENEMY_SPEEDUP_PER_MIN: 0.05,               // enemies move faster over time (D4)
  ENEMY_SPEEDUP_CAP: 0.6,                    // ...capped at +60%

  // ---- loot / economy (D1 / 原#6, C3 / 原#21) ---------------------------
  GOLD_DROP_MULT: 0.35,                       // round16/9.1: gold per kill nerf (太好賺) — 0.5 → 0.35
  GOLD_MULT_CAP: 3.0,                          // round16/9.1: hard ceiling on the goldMult stat so stacked gold builds can't run away
  DROP_CHANCE_MULT: 0.6,                      // equip/item/heart drop chance off mobs
  GEAR_DROP_MULT: 0.7,                        // round16/10.5: extra cut on MOB equipment drops only (boss gear unchanged) — fewer mid-combat equip-choice interrupts
  // round16/9.2 → R17/8.3: town-spend base-cost multipliers, raised again ×1.5 per player
  // feedback (out-of-run growth still accumulated too fast). gen/talents + gen/facilities
  // now consume these too (they had hardcoded costs and silently skipped the R16 hike).
  TALENT_COST_MUL: 3.0,
  FACILITY_COST_MUL: 3.0,
  FORGE_LEVEL_MUL: 3.0,
  FORGE_EFFECT_MUL: 3.0,
  ANVIL_DIMINISH: 0.85,                        // R17/8.2: each repeat purchase of the SAME stat anvil yields ×0.85 of the previous gain
  HUB_COST_GROWTH: 1.08,                       // round16/9.3: VS-style dynamic pricing — each purchase in a panel raises that panel's prices +8%
  // round16/6.5 劇情難度 (difficulty 0): enemies very weak, loot generous, almost unloseable; excluded from the leaderboard.
  STORY_DIFF_MUL: 0.5,                        // enemy hp/dmg scalar (vs 1.0 at D1)
  STORY_LUCK_BONUS: 0.5,                      // +luck for richer drops
  STORY_DROP_QUALITY: 2,                      // +dropQuality (better equip/item rolls)
  SHARD_DROP_MULT: 1.2,                       // 原#4: soulshard drop rate up (was 0.95)
  MOB_SHARD_BASE: 0.06,                       // 原#4: any mob has this base chance to drop a shard

  // ---- round-17 -----------------------------------------------------------
  NOVA_CHANCE: [0.25, 0.35, 0.45],            // R17/1.9: 魂爆 procs by chance per kill (was every kill); explosion damage compensated up
  PICKUP_PULL_FACTOR: 1.5,                    // R17/1.3: in-range pull speed = player speed × FACTOR + FLAT — fast builds could outrun coins
  PICKUP_PULL_FLAT: 60,
  // R17/7.1-7.2: vault guardians wake at a random time instead of spawning at 0:00
  // (players grabbed a key in ~20s). Scales are PRE-elite (constructor elite adds ×3.2 hp /
  // ×1.5 dmg) → effective ≈ ×7.7 hp, ×1.5 dmg — meaner than the old ×6/×1.3.
  GUARDIAN_DELAY_MIN: 90,                     // earliest wake (sec)
  GUARDIAN_DELAY_MAX: 240,                    // latest wake (sec)
  GUARDIAN_HP_SCALE: 2.4,
  GUARDIAN_DMG_SCALE: 1.0,

  // ---- soulshard shop (C1 / C3) — prices LOWERED, esp. the stat anvils -----
  ANVIL_BASE_PRICE: 26,                       // base soulshard cost of a stat anvil (was 40-55)
  ANVIL_PRICE_GROWTH: 1.35,                   // round-6: throttle unlimited in-run stat stacking (was 1.2; the dense swarm bankrolled too many)
  GEAR_ANVIL_BASE_PRICE: 60,                  // base soulshard cost of an equipment anvil (#3: 3-choice)
  GEAR_ANVIL_GROWTH: 1.25,

  // ---- ranged vs melee composition (D4 / 原#15, D5 / 原#16) -------------
  RANGED_FIRE_MULT: 1.55,                     // ranged-enemy fire cooldowns lengthened
  RANGED_SPAWN_WEIGHT: 0.4,                   // ranged enemies far less likely to spawn
  MAX_ENEMY_BURST: 3,                         // cap non-boss shooter burst (D5 bullet density)

  // ---- R18/B4 biome enemy affinity (swarm pool leans toward the biome theme) ----
  BIOME_AFFINITY_BOOST: 5.5,                  // x weight for enemies tagged to the current biome
  BIOME_FOREIGN_DAMP: 0.2,                    // x weight for enemies tagged to OTHER biomes (never 0 → pool never empties)

  // ---- surround 魂牢 (D2 / 原#5; task-4 rework) -------------------------
  // A ring of monsters CLOSES IN on the player. You aren't held until the whole
  // ring is dead — you break out by carving a gap (kill SURROUND_BREACH_KILLS) OR
  // by backing into a wall. The lock slowly tightens so the circle visibly collapses.
  SURROUND_PERIOD: [40, 26],                  // [base, +random] sec between surround events
  SURROUND_COUNT_BASE: 10,                    // ring size (+ ~0.5/threat). Fewer than before — you only need a gap
  SURROUND_HP_MULT: 3.2,                      // tanky but killable: you must drop a few to open a gap
  SURROUND_DMG_MULT: 1.0,                     // round-6: full contact damage inside the 魂牢 (was 0.8)
  SURROUND_RADIUS: 175,                       // starting ring radius (tighter than the old 210)
  SURROUND_SPEED_MULT: 0.85,                  // task-4: they ACTIVELY close in (was a 0.45 crawl)
  SURROUND_MUST_CLEAR: true,                  // hold the player in the kill-zone until they breach
  SURROUND_BREACH_KILLS: 4,                   // round-6: a real must-clear (was 2 → escaped in ~1s)
  SURROUND_CLOSE_SPEED: 10,                   // round-6: ring collapses faster (was 6)
  SURROUND_LOCK_MIN: 120,                     // round-6: tighter kill-zone (was 150)
  SURROUND_LIFE: 22,                          // safety timeout so it can never soft-lock

  // ---- auto-aim (原#5): shorter range + line-of-sight ------------------
  AIM_RANGE: 300,                             // max auto-target distance (sim: 250 let swarms close in; still << old ~700)
  AIM_LOS: true,                              // skip targets with a wall between them and the player

  // ---- anti-AFK (原#15): idle players bleed a little -------------------
  AFK_GRACE: 6,                               // seconds of standing still before the drain starts
  AFK_DRAIN_FRAC: 0.012,                      // per-second HP loss as a fraction of maxHp while idle
  AFK_DRAIN_MIN: 1,                           // ...but at least this many HP/sec

  // ---- spawn pacing (原#3 / round-5 task-11): a relentless swarm — far denser than
  // round 4, still eased by EARLY_GRACE so the opening isn't instant death --
  SPAWN_CAP_BASE: 14,                         // base concurrent-enemy cap (task-11: was 7 — you're now surrounded fast)
  SPAWN_CAP_PER_THREAT: 7,                    // +cap per threat level (was 4.8)
  SPAWN_CAP_MAX: 260,                         // hard ceiling (was 115 — late game is a sea of enemies)
  SPAWN_INTERVAL_BASE: 1.25,                  // base seconds between spawn groups (was 2.0 — groups arrive twice as often)
  SPAWN_INTERVAL_MIN: 0.3,                    // fastest spawn interval (was 0.55)
  EARLY_GRACE: 120,                           // round-6: slightly shorter on-ramp (was 140) — mid-game bite arrives a touch sooner, opening stays survivable
  EARLY_DMG_GRACE: 0.5,                        // keep the gentle opening (the difficulty lives in the mid/late game, not a brutal start)

  // ---- Higgs zoning bombard (D3 / 原#7) ---------------------------------
  HIGGS_DURATION: 11,                         // the bombard event lasts this long
  HIGGS_INTERVAL: 1.5,                        // drop a delayed bomb every N sec
  HIGGS_RADIUS: 42,
  HIGGS_DMG: 20,
  SPECIAL_EVENT_FREQ_MULT: 0.8,               // special events fire a bit more often

  // ---- R20/B5 expanded event roster ---------------------------------------
  // triggerEvent picks from this weight table (gates: bombers th>=2, bombs th>=3,
  // boulders th>=4; an already-active higgs/surround/goblin zeroes its own weight).
  EVENT_WEIGHTS: { mushrooms: 24, higgs: 20, surround: 16, bombers: 12, bombs: 12, boulders: 10, goblin: 6 },
  EVT_BOMBER_COUNT: 6,                        // + threat/2 kamikaze imps per squad
  EVT_BOMBER_FUSE: 6,                         // sec until forced self-detonation (±20%)
  EVT_BOMBER_BLAST_R: 46,                     // per-instance deathBlast radius
  EVT_BOMBER_BLAST_DMG: 26,                   // base blast dmg (scaled by diff/threat in run.js)
  EVT_BOMB_COUNT: [5, 3],                     // [base, +random] lattice mines per volley
  EVT_BOMB_FUSE: 2.5,                         // sec until the cross shockwave
  EVT_BOMB_ARM_LEN: 3,                        // cross arm reach, in tiles
  EVT_BOMB_DMG: 22,                           // base cross dmg (scaled in run.js)
  EVT_BOULDER_COUNT: [3, 2],                  // [base, +random] telegraphed lanes
  EVT_BOULDER_SPEED: 150,                     // px/s fixed lane speed
  EVT_BOULDER_LIFE: 6,                        // sec before a boulder crumbles off-lane
  EVT_GOBLIN_LIFE: 12,                        // sec before the treasure goblin escapes

  // ---- R20/B6 boss moves ----------------------------------------------------
  BOSSMOVE_CD_MULT: 1,                        // global cooldown scaler for all named moves
  BOSSMOVE_FIRST_CD: 5,                       // sec after spawn before the first move
  BOSSMOVE_SLAM_AIR: 0.9,                     // leap_slam airborne time (dodge window)
  BOSSMOVE_SLAM_RADIUS: 64,                   // slam AoE
  BOSSMOVE_SLAM_DMG_MULT: 1.6,                // × boss contact damage
  BOSSMOVE_PILLAR_HP: 60,                     // boss_pillar def hp (×(1+stage·0.12) at spawn)
  BOSSMOVE_PILLAR_LIFE: 8,                    // sec before pillars crumble
  BOSSMOVE_PILLAR_COUNT: 9,                   // ring slots (one random gap stays open)
  BOSSMOVE_PILLAR_RING: 86,                   // cage radius around the player
  BOSSMOVE_CHARGE_SPEED: 330,                 // dash px/s
  BOSSMOVE_CHARGE_TIME: 0.42,                 // per-dash duration (×3 dashes)
  BOSSMOVE_CHARGE_DMG_MULT: 1.25,             // × boss contact damage per dash hit
  BOSSMOVE_SHOCK_RAYS: 4,                     // + phase radial fronts
  BOSSMOVE_SHOCK_SPEED: 230,                  // front march px/s
  BOSSMOVE_SHOCK_REACH: 260,                  // front max distance
  BOSSMOVE_SHOCK_DMG_MULT: 0.9,               // × boss contact damage on front touch

  // ---- status effects (D6 / 原#18) --------------------------------------
  // durations in seconds; control effects (stun/knockup) are halved on bosses.
  STATUS: {
    slow:    { dur: 2.4, mult: 0.5 },         // movement speed -> 50%
    bleed:   { dur: 3.0, dps: 7 },            // damage-over-time
    burn:    { dur: 2.5, dps: 9 },            // damage-over-time
    poison:  { dur: 4.0, dps: 5 },            // damage-over-time
    stun:    { dur: 0.9 },                     // can't move/act
    knockup: { dur: 0.55 },                    // launched, can't act (boss control)
  },
  BOSS_CONTROL_RESIST: 0.5,                   // boss control durations * this

  // ---- traps / map (E1 / 原#9) ------------------------------------------
  TRAP_DMG_MULT: 1.7,                         // raise trap damage
  MAP_W: 138, MAP_H: 102,                     // bigger battleground (was 104 x 76)

  // ---- R26/B1 decoration density (× area factor k in maps.js) -------------
  DECOR: { SINGLES: 75, CLUSTERS: 20, WALL: 24, DECALS: 360 },   // R26/B1b density pass (was 55/14/20/90); DECALS = render-only ground-mark channel (empty pools → no-op)

  // ---- R26/B1 scene-composition FX (render-only tuning) ------------------
  SCENE_FX: {
    PLAYER_RING_R: 20, PLAYER_RING_A: 0.12,   // local-player cold-white ground pool (identity)
    SURROUND_N: 4, SURROUND_R: 14,            // ≥N enemies within R px of the player → "surrounded" beacon
    SURROUND_A_MIN: 0.25, SURROUND_A_MAX: 0.45,  // beacon silhouette pulse range
    WALL_AO_ALPHA: 0.35,                       // south-edge wall-foot ambient-occlusion strength
  },

  // ---- R26/B2 ruin-town ambience -----------------------------------------
  // Cool, low-saturation vignette over the hub — unifies the 末日遺鎮 mood and frames
  // the scattered districts. Tint is a desaturated cold navy; strength kept faint.
  HUB_VIGNETTE: { strength: 0.4, rgb: '20,28,52' },
};

// Effective weapon level cap: evolved weapons are terminal (level 1), everything
// else caps at WEAPON_MAX_LEVEL. Single source of truth for "is this maxed?".
export function weaponMaxLevel(def) { return def && def.evolved ? 1 : BALANCE.WEAPON_MAX_LEVEL; }
export function isWeaponMaxed(inst) { return inst && inst.level >= weaponMaxLevel(inst.def); }
