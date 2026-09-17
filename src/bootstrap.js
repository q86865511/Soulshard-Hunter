// content + art registration (import for side effects)
import './art/core.js';
import './art/heroes.js';   // 原#17: unique hero body archetypes (must load before characters)
import './art/icons.js';
import './art/content_icons.js';
import './art/weapons.js';
import './art/biomes.js';
import './art/biome_decor.js';   // round 6.1: rich per-biome decoration sets
import './art/hub.js';
import './art/lobby.js';
// round-5 town art (multi-room hub: NPCs + room decor)
import './art/town_floor.js';   // polished hub flooring + walls (replaces the dungeon grid)
import './art/town_outdoor.js';   // R18/B1+B2: outdoor-town tileset + building facades + nature props
import './art/town_ruin_tiles.js';    // R19: ruined-town exterior + interior floor/wall tilesets
import './art/town_ruin_facades.js';  // R19: 6 ruined building facades (72×72)
import './art/town_ruin_decor.js';    // R19: environment props (pillars, rubble, dead trees, crystals …)
import './art/town_ruin_stations.js'; // R19: interactable stations (portal_grand, lamps, torchposts …)
import './art/town_pets_decor.js';   // R18/B10: personal-room decorations + mini-pet sprites
import './art/town_npcs_a.js';
import './art/town_npcs_b.js';
import './art/town_church.js';
import './art/town_guildforge.js';
import './art/town_decor.js';
import './art/town_personal.js';
import './art/title_scene.js';          // R20.1: title-cover dark tower
import './art/town_ruin_walls.js';      // R20/B1: 2.5D wall faces + depth bands + void tile + door glow
import './art/town_ruin_facades2.js';   // R20/B1: 96×96 grand ruin facades
import './art/town_ruin_stations2.js';  // R20/B1: large interior stations + boss_pillar
import './art/town_ruin_interior.js';   // R20/B1: ruin-flavoured interior props (rint_*)
import './art/reaper.js';
import './game/content/enemies.js';
import './game/content/enemies_biome.js';  // R18/B4: 5 new biome mobs (hand-written content + art)
import './game/content/bosses_biome.js';   // R18/B3: 5 new-biome final bosses (hand-written content + art)
import './game/content/event_mobs.js';     // R20/B5: special-event mobs (bomber/bomb/boulder/goblin)
import './game/content/weapons_r20.js';    // R20/B7: final-six start weapons + evolved forms (before heroes_r20 — ids referenced there)
import './game/content/heroes_r20.js';     // R20/B7: the final 6 heroes (21→27)
import './game/content/abilities.js';
import './game/content/items.js';
import './game/content/equipment.js';
import './game/content/talents.js';
import './game/content/facilities.js';
import './game/content/weapons.js';
import './game/content/characters.js';

// workflow-generated content + art (fault-isolated via dynamic import)
import './art/gen/index.js';
import './game/content/gen/index.js';
