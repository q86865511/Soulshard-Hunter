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

  // ---- weapons / fusion (user clarification) ----------------------------
  WEAPON_MAX_LEVEL: 7,                       // weapons cap at level 7 ("maxed")
  // fusion (合成) unlocks when the player has an evolvable maxed weapon AND either
  // >= FUSE_MAXED_WEAPONS maxed weapons, OR 1 maxed weapon + >= FUSE_PASSIVES passive(s).
  FUSE_MAXED_WEAPONS: 2,
  FUSE_PASSIVES: 1,

  // ---- player nerfs (D1 / 原#6) -----------------------------------------
  PLAYER_DAMAGE_MULT: 0.78,                  // global scale on ALL player weapon damage
  ABILITY_DAMAGE_MULT: 0.8,                  // global scale on passive/ability damage
  LIFESTEAL_MULT: 0.45,                      // lifesteal effectiveness (was too strong)
  LIFESTEAL_CAP: 0.20,                       // hard cap on effective lifesteal fraction
  DODGE_MULT: 0.5,                           // dodge effectiveness (was too strong)
  DODGE_CAP: 0.35,                           // hard cap on effective dodge chance

  // ---- enemy buffs (D1 / 原#6, E3 / 原#17) ------------------------------
  ENEMY_HP_MULT: 1.35,                       // trash-mob HP up
  ENEMY_DMG_MULT: 1.4,                       // trash-mob damage up
  BOSS_HP_MULT: 1.3,                         // boss HP up (on top of per-boss scaling)
  BOSS_DMG_MULT: 1.35,                       // boss damage up
  ENEMY_SPEEDUP_PER_MIN: 0.05,               // enemies move faster over time (D4)
  ENEMY_SPEEDUP_CAP: 0.6,                    // ...capped at +60%

  // ---- loot / economy (D1 / 原#6, C3 / 原#21) ---------------------------
  GOLD_DROP_MULT: 0.5,                        // gold per kill (was 0.62)
  DROP_CHANCE_MULT: 0.6,                      // equip/item/heart drop chance off mobs
  SHARD_DROP_MULT: 0.95,                      // soulshard drop rate

  // ---- soulshard shop (C1 / C3) — prices LOWERED, esp. the stat anvils -----
  ANVIL_BASE_PRICE: 26,                       // base soulshard cost of a stat anvil (was 40-55)
  ANVIL_PRICE_GROWTH: 1.2,                    // price multiplier per anvil bought (was 1.3)
  GEAR_MARKUP: 1.3,                           // shop gear price multiplier (was 1.6)

  // ---- ranged vs melee composition (D4 / 原#15, D5 / 原#16) -------------
  RANGED_FIRE_MULT: 1.55,                     // ranged-enemy fire cooldowns lengthened
  RANGED_SPAWN_WEIGHT: 0.4,                   // ranged enemies far less likely to spawn
  MAX_ENEMY_BURST: 3,                         // cap non-boss shooter burst (D5 bullet density)

  // ---- surround monsters (D2 / 原#5) ------------------------------------
  SURROUND_PERIOD: [40, 26],                  // [base, +random] sec between surround events
  SURROUND_COUNT_BASE: 9,                     // ring size base (+threat)
  SURROUND_HP_MULT: 7,                        // surround mobs are VERY tanky
  SURROUND_DMG_MULT: 0.9,
  SURROUND_RADIUS: 200,                       // starting ring radius
  SURROUND_CLOSE_SPEED: 12,                   // px/sec the ring contracts
  SURROUND_MIN_RADIUS: 52,                    // ring stops contracting here
  SURROUND_LIFE: 16,                          // event duration (sec)

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
