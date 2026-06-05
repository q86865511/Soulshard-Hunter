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
  BIGBOSS_TIME: 20 * 60,                     // the level's final boss at 20:00
  REAPER_DELAY: 30,                          // killable Reaper 30s after big boss dies
  THREAT_PERIOD: 100,                        // sec per +1 threat (1 -> ~13 over 20 min)
  // The Reaper is the hidden ENDGAME superboss — a huge DPS check that only a heavily
  // stacked build can out-damage (hpScale = (BASE + threat*PER) * diffMul). Damage is
  // high but tempered so a stacked/defensive build survives a few hits (not a one-shot).
  REAPER_HP_BASE: 8, REAPER_HP_PER_THREAT: 1.4,
  REAPER_DMG_BASE: 1.45, REAPER_DMG_PER_THREAT: 0.045,

  // ---- weapons / fusion (user clarification) ----------------------------
  WEAPON_MAX_LEVEL: 7,                       // weapons cap at level 7 ("maxed")
  // fusion (合成) unlocks when the player has an evolvable maxed weapon AND either
  // >= FUSE_MAXED_WEAPONS maxed weapons, OR 1 maxed weapon + >= FUSE_PASSIVES passive(s).
  FUSE_MAXED_WEAPONS: 2,
  FUSE_PASSIVES: 1,

  // ---- player nerfs (D1 / 原#6, 原#12 power-creep pass) ------------------
  PLAYER_DAMAGE_MULT: 0.78,                  // global scale on ALL player weapon damage
  ABILITY_DAMAGE_MULT: 0.8,                  // global scale on passive/ability damage
  LIFESTEAL_MULT: 0.38,                      // 原#12: lifesteal toned down (was 0.45)
  LIFESTEAL_CAP: 0.14,                       // 原#12: hard cap lowered (was 0.20)
  DODGE_MULT: 0.5,                           // dodge effectiveness (was too strong)
  DODGE_CAP: 0.32,                           // 原#12: dodge cap lowered (was 0.35)
  REGEN_MULT: 0.7,                           // 原#12: global scale on hpRegen (heal-over-time)
  DEFENSE_MULT: 0.85,                        // 原#12: global scale on flat defense (less damage-reduction)

  // ---- enemy buffs (D1 / 原#6, E3 / 原#17) ------------------------------
  ENEMY_HP_MULT: 1.35,                       // trash-mob HP up
  ENEMY_DMG_MULT: 1.3,                        // trash-mob damage up (eased from 1.4 for fair early game)
  BOSS_HP_MULT: 1.3,                         // boss HP up (on top of per-boss scaling)
  BOSS_DMG_MULT: 1.35,                       // boss damage up
  ENEMY_SPEEDUP_PER_MIN: 0.05,               // enemies move faster over time (D4)
  ENEMY_SPEEDUP_CAP: 0.6,                    // ...capped at +60%

  // ---- loot / economy (D1 / 原#6, C3 / 原#21) ---------------------------
  GOLD_DROP_MULT: 0.5,                        // gold per kill (was 0.62)
  DROP_CHANCE_MULT: 0.6,                      // equip/item/heart drop chance off mobs
  SHARD_DROP_MULT: 1.2,                       // 原#4: soulshard drop rate up (was 0.95)
  MOB_SHARD_BASE: 0.06,                       // 原#4: any mob has this base chance to drop a shard
  MOB_SHARD_BOSS: 0.0,                        // bosses use their own e.shard; no base bonus

  // ---- soulshard shop (C1 / C3) — prices LOWERED, esp. the stat anvils -----
  ANVIL_BASE_PRICE: 26,                       // base soulshard cost of a stat anvil (was 40-55)
  ANVIL_PRICE_GROWTH: 1.2,                    // price multiplier per anvil bought (was 1.3)
  GEAR_ANVIL_BASE_PRICE: 60,                  // base soulshard cost of an equipment anvil (#3: 3-choice)
  GEAR_ANVIL_GROWTH: 1.25,

  // ---- ranged vs melee composition (D4 / 原#15, D5 / 原#16) -------------
  RANGED_FIRE_MULT: 1.55,                     // ranged-enemy fire cooldowns lengthened
  RANGED_SPAWN_WEIGHT: 0.4,                   // ranged enemies far less likely to spawn
  MAX_ENEMY_BURST: 3,                         // cap non-boss shooter burst (D5 bullet density)

  // ---- surround monsters (D2 / 原#5, 原#9 must-clear) -------------------
  SURROUND_PERIOD: [40, 26],                  // [base, +random] sec between surround events
  SURROUND_COUNT_BASE: 13,                    // 原#9: bigger ring (was 9) (+threat)
  SURROUND_HP_MULT: 6,                        // surround mobs are tanky (eased a touch from 7 — there are more of them)
  SURROUND_DMG_MULT: 0.85,
  SURROUND_RADIUS: 210,                       // starting ring radius
  SURROUND_SPEED_MULT: 0.45,                  // 原#9: surround mobs crawl slowly (must be killed, not outrun)
  SURROUND_MUST_CLEAR: true,                  // 原#9: event ends only when the ring is cleared (or the safety timeout)
  SURROUND_LIFE: 30,                          // 原#9: safety timeout so it can never soft-lock (was 16)

  // ---- auto-aim (原#5): shorter range + line-of-sight ------------------
  AIM_RANGE: 250,                             // max auto-target distance in world px (was effectively ~700)
  AIM_LOS: true,                              // skip targets with a wall between them and the player

  // ---- anti-AFK (原#15): idle players bleed a little -------------------
  AFK_GRACE: 6,                               // seconds of standing still before the drain starts
  AFK_DRAIN_FRAC: 0.012,                      // per-second HP loss as a fraction of maxHp while idle
  AFK_DRAIN_MIN: 1,                           // ...but at least this many HP/sec

  // ---- spawn pacing (原#3): a touch denser ----------------------------
  SPAWN_CAP_BASE: 9,                          // base concurrent-enemy cap (was 7)
  SPAWN_CAP_PER_THREAT: 5.5,                  // +cap per threat level (was 5)
  SPAWN_CAP_MAX: 120,                         // hard ceiling (was 100)
  SPAWN_INTERVAL_BASE: 1.8,                   // base seconds between spawn groups (was 2.1)
  SPAWN_INTERVAL_MIN: 0.5,                    // fastest spawn interval (was 0.6)

  // ---- Higgs zoning bombard (D3 / 原#7) ---------------------------------
  HIGGS_DURATION: 11,                         // the bombard event lasts this long
  HIGGS_INTERVAL: 1.5,                        // drop a delayed bomb every N sec
  HIGGS_RADIUS: 42,
  HIGGS_DMG: 20,
  SPECIAL_EVENT_FREQ_MULT: 0.8,               // special events fire a bit more often

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
};

// Effective weapon level cap: evolved weapons are terminal (level 1), everything
// else caps at WEAPON_MAX_LEVEL. Single source of truth for "is this maxed?".
export function weaponMaxLevel(def) { return def && def.evolved ? 1 : BALANCE.WEAPON_MAX_LEVEL; }
export function isWeaponMaxed(inst) { return inst && inst.level >= weaponMaxLevel(inst.def); }
