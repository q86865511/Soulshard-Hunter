# ROUND 19 SPEC — 末日遺跡城鎮改版 (Apocalyptic Ruin Town + Multi-Map Interiors)

Player-requested rework of the R18 outdoor town:
1. **末日 / 殘破 / 遺跡風格** — the whole town becomes a post-cataclysm ruin (ash, cracked stone, dead trees, soul-fire).
2. **多張地圖** — the town splits into an exterior map + 6 building INTERIOR maps; walk to a building door, press E to enter; an exit door leads back out.
3. **減少方正格局** — the exterior boundary is organic/irregular (blob-carved), districts are scattered (not a grid); interiors have non-rectangular shapes.
4. **大量環境裝飾** — ruins, broken pillars, rubble, boulders, dead trees, graves, tattered banners, soul-crystals.
5. **互動裝飾升級** — the sortie portal becomes a grand 48×64 ruin-gate dead-centre of the plaza, with symmetric flanking dressing; all stations centred/symmetric.
6. **美化** — Fable visual pass at the end.

ALL frontend, additive. `server/` untouched. Single-player & co-op protocol unchanged (the hub is offline-only). No META/save schema change.

---

## A. FROZEN ART CONTRACT (new sprites — names/sizes are FINAL, code in §B/§C depends on them)

All art files: ES modules importing `defineSprite, defineAnim` from `../engine/sprites.js` and `P, withAlpha` from `../engine/palette.js`. Painter API only (`px/rect/hline/vline/line/circle/ellipse/ring/mirrorX/outline/shadeBottom/replace` + polish helpers `glow/gradV/gradH/sparkle/star4/rimLight/softShadow/dither/speckle/aura`). Bodies end with `p.outline(P.ink)` where a silhouette wants it. Sprites bake EAGERLY — the file must execute without throwing. Style: anime-flavoured pixel ruin — desaturated stone greys/ash + ember-orange & soul-teal (`P.ember/P.emberL`, `P.shard/P.shardL`, `P.neon`) accent glows, rim light on tall props.

### A1 `src/art/town_ruin_tiles.js` — exterior + interior tilesets (16×16 unless noted)
| sprite | note |
|---|---|
| `ruin_grass` | dead/ashen grass, dark olive-grey base |
| `ruin_grass2` | variant: sparse dry blades + tiny rubble specks |
| `ruin_ashgrass` | ash-dusted patch w/ faint ember speckle |
| `ruin_path` | cracked dirt path |
| `ruin_path2` | variant w/ embedded broken cobbles |
| `ruin_plaza` | cracked flagstone, weathered |
| `ruin_plaza2` | variant: shattered slab + moss/ash in cracks |
| `ruin_wallline` | impassable border: collapsed rampart rubble + dead-tree silhouettes |
| `ruin_wallline_top` (16×8) | cap strip for the above |
| `int_wood` / `int_wood2` | interior worn plank floor + variant |
| `int_stone` / `int_stone2` | interior cracked stone floor + variant |
| `int_carpet` / `int_carpet2` | faded red carpet + worn edge variant |
| `int_wall` | interior stone-brick wall (dark, torch-warm top edge) |
| `int_wall_top` (16×8) | wall cap |

### A2 `src/art/town_ruin_facades.js` — 6 building facades, **72×72**, anchor `[0.5, 1]` (base-centre, same convention as `town_fc_*`)
`ruin_fc_church` `ruin_fc_guild` `ruin_fc_hall` `ruin_fc_smith` `ruin_fc_wardrobe` `ruin_fc_house`
Each: a RUINED but still-standing building — collapsed roof sections, cracked walls, exposed beams, moss/ash — with a **clearly readable, centred DOOR at the bottom edge** (warm light spilling out, so the player reads "enterable"). Identity cues: church=broken spire+stained glass shard glow; guild=cracked crest+notice lanterns; hall=toppled trophy column+gold trim; smith=chimney w/ live ember plume; wardrobe=torn awning+mannequin silhouette in window; house=cosy small cottage, least ruined, warm windows.

### A3 `src/art/town_ruin_decor.js` — environment props
| sprite | size | note |
|---|---|---|
| `ruin_pillar` | 12×30 | standing cracked column |
| `ruin_pillar_broken` | 12×18 | snapped stump |
| `ruin_arch` | 40×36 | free-standing broken archway |
| `ruin_rubble` | 16×10 | small rubble pile |
| `ruin_rubble2` | 20×12 | larger rubble + beam |
| `ruin_boulder` | 16×14 | mossy boulder |
| `ruin_boulder2` | 22×16 | big split boulder |
| `ruin_statue` | 20×32 | cracked goddess statue, faint holy glow |
| `ruin_deadtree` | 24×34 | bare dead tree |
| `ruin_deadtree2` | 28×38 | bigger twisted dead tree |
| `ruin_cart` | 26×18 | broken cart |
| `ruin_grave` | 12×16 | leaning gravestone |
| `ruin_banner` | 14×26, anim 2f | tattered banner, flutter |
| `ruin_bonfire` | 18×20, anim 3f | survivor bonfire, ember sparks |
| `ruin_crystal` | 14×22, anim 2f | soul-crystal shard jutting from ground, teal pulse |
| `ruin_rift` | 16×16, anim 2f | dark chasm tile w/ teal soul-glow seams (replaces creek water) |
| `ruin_bridge` | 16×16 | broken-stone bridge deck tile |
| `ruin_fence` | 16×14 | broken wooden fence (h) |

### A4 `src/art/town_ruin_stations.js` — interactables (大型化)
| sprite | size | note |
|---|---|---|
| `portal_grand` | 48×64, anim 3f | THE sortie portal: ruined twin-pillar stone gate, swirling teal/violet vortex between, runes, sparkles — the town centrepiece |
| `ruin_lamp` | 12×26, anim 2f | broken lamppost re-lit with a soul-flame |
| `ruin_well` | 22×22 | crumbled stone well |
| `ruin_fountain` | 34×28, anim 2f | broken fountain, thin water/soul trickle |
| `ruin_torchpost` | 10×24, anim 3f | standing torch for interior/door flanking |

**Interiors REUSE existing sprites** (already defined, do NOT redraw): `town_goddess town_pew town_stained town_candles town_arch` (church) · `town_board town_desk town_crate town_lantern` (guild) · `town_furnace town_anvil town_weaponrack town_grindstone` (smith) · `town_mannequin town_rack town_mirror` (wardrobe) · `town_trophyshelf town_banner_gold town_pillar` (hall) · `town_bed town_bookshelf town_rug town_plant town_chest2 town_lamp2 town_barrel` (house).

---

## B. `src/game/world.js` (owner: code agent B1 — ONLY this file)

### B-1 `makeCamp()` rewrite — irregular ruined exterior. **Return contract unchanged**: `{tw,th,tiles,floorVar,decor,rooms,tileset}` with ALL 9 room ids (`church guild blacksmith clothing achievements personal plaza garden market`), each `{col,row,cx,cy,x0,y0,x1,y1}` in PIXELS.
- Size ~64×48. Start ALL WALL; carve organic open space by stamping overlapping ellipse "blobs" around each district anchor + along connecting paths (2-3 blob radii w/ rng jitter) → the boundary becomes irregular, NOT a rectangle. Keep a 2-tile solid border minimum.
- District anchors — scattered, asymmetric (tile coords, tune as needed): plaza (32,26) centre · church (14,10) NW hill · guild (46,12) NE · achievements hall (52,28) E · blacksmith (12,30) W · clothing (44,40) SE · personal house (20,40) S · garden (30,40) S of plaza · market (50,20) — adjust so paths feel organic; do NOT place on a grid.
- Floor variant indices (tileset order frozen): 0 `ruin_grass` 1 `ruin_grass2` 2 `ruin_ashgrass` 3 `ruin_path` 4 `ruin_path2` 5 `ruin_plaza` 6 `ruin_plaza2`. Winding paths (jittered, not pure L-routes) plaza→every district. Plaza = irregular flagstone disc r≈8.
- A **rift** (replaces creek): a jagged VOID crack ~12 tiles long between plaza and garden, `ruin_rift` anim decor on the VOID tiles, crossed by a 3-tile `ruin_bridge` deck (walkable FLOOR). Detourable around the ends.
- Buildings: facade decor `ruin_fc_*` anchored 3 tiles N of porch anchor (same as now), VOID 3×3 footprint behind. Porch row stays FLOOR.
- Heavy decor (~180–240 props): symmetric pillar ring + 2 `ruin_bonfire`/`ruin_lamp` flanking the plaza portal spot; `ruin_grave` cluster by the church; `ruin_arch` over 2 path mouths; dead trees + boulders + rubble scattered (rng but seeded ok); `ruin_statue` in the garden; market = broken `town_fc_stall`s + `ruin_cart` + barrels; `ruin_crystal`s sprinkled for soul-glow; `ruin_fence` fragments. ALWAYS guard `tiles[..]===FLOOR` before placing, keep porches + plaza centre clear.
- `tileset = { floor:[7 names above], wall:'ruin_wallline', wallTop:'ruin_wallline_top' }`.

### B-2 NEW export `makeInterior(id)` for the 6 building ids. Same return shape. `rooms = { [id]: anchor, exit: anchor }` (anchors PIXELS, same fields as above).
- Per-building size/shape (NON-rectangular where it fits): church 20×18 cross-shaped nave (int_stone + int_carpet centre aisle) · guild 22×16 L-shape hall (int_wood) · blacksmith 18×14 with a forge alcove (int_stone) · clothing 18×14 with a bay (int_wood + carpet) · achievements 24×14 long gallery w/ side niches (int_stone + carpet) · personal 14×12 cosy room (int_wood + rug area).
- All WALL, carve the shape; south wall has a 2-tile doorway gap = the exit; `rooms.exit` = just inside it. `rooms[id]` = room centre (station anchor reference).
- Tileset `{ floor:['int_wood','int_wood2','int_stone','int_stone2','int_carpet','int_carpet2'], wall:'int_wall', wallTop:'int_wall_top' }` (indices frozen in that order).
- Decor: SYMMETRIC placement of the reuse-sprites per building (§A4 list) + `ruin_torchpost` pairs flanking the station & the exit. Station spot (top-centre) kept clear — hub.js places the interactive station itself.
- Do not touch anything else in world.js (World class, makeMap, etc.).

## C. `src/game/scenes/hub.js` (owner: code agent B2 — ONLY this file; world.js is read-only reference)

Multi-area town. Keep ALL panels/dialogue/tutorial/esc-menu/cheats logic working unchanged.
- `enter()`: `this.area='town'`; `this.maps={}` lazy cache (`town→makeCamp()`, building id→`makeInterior(id)`); build via `this.loadArea('town', spawn)`.
- New `loadArea(areaId, spawnPos)`: get/cache map, `this.world.loadMap(map)`, `this.rooms=map.rooms`, set hero pos + camera snap, rebuild `this.stations`/`this.npcs` for that area, reset `this.near`, reset `this.petState.x=null`, call `this.injectRoomDecor()` (which now only acts in the personal interior).
- **Town stations**: `sortie` = `portal_grand` panel-station at plaza centre (label 出擊傳送門, bob + strong glow) + **6 door stations** `{id, kind:'door', target:<buildingId>, label:'進入 ○○'}` at each porch anchor (no sprite — the facade door IS the visual; draw only the label + E prompt, plus a soft warm glow when near). Bank stays on merchant NPC.
- **Interior stations**: the building's panel station (existing sprite/label/color), centred per `rooms[id]` anchor; + an exit door station `{kind:'door', target:'town'}` at `rooms.exit` (label 離開).
- Door interaction: E/click → `loadArea(target, …)`; entering a building spawns at its `rooms.exit`; returning to town spawns at that building's porch (rooms[bid].cx, cy+8). `Sfx.play('uiClick')` + a brief fade is fine but optional.
- **NPC split**: keepers (priest/guildmaster/receptionist/blacksmith/tailor/curator) live INSIDE their interiors (place symmetric near the station via per-area NPC_POS offsets); guide+child (plaza), merchant (market), oldvet (garden) stay outside. NPCs only built for the active area.
- Hotkeys: `1/2/3/4/space` now call `openPanel('talents'/'smith'/'achievements'/'guild'/'sortie')` directly (work from anywhere — no station lookup).
- `ambientFx`: town → drifting **ash flakes + ember motes** (grey `#9aa` / `P.emberL`, slower fall) instead of sakura; occasional soul-wisp twinkle near `rooms.garden` (guard exists). Interiors → sparse warm dust motes only.
- `ROOM_THEME` wash: in town only plaza/garden/market (subtle); in an interior, one full-room warm wash of that building's theme colour.
- Top bar title: town =「魂晶遺鎮」; interiors = building name (教堂 / 冒險者公會 / 鐵匠鋪 / 衣帽店 / 成就殿堂 / 個人小屋).
- `injectRoomDecor()`: no-op unless `this.area==='personal'`; anchor = the interior's `rooms.personal`.
- Footer hint line: update to mention doors (e.g.「靠近大門按【E】進出建築」).
- Bottom-right mini hint or label for doors when near: reuse the existing near-prompt (【E】進入 / 【E】離開).

## D. `src/main.js` (owner: wiring agent) — add imports for the 4 new art files directly after `./art/town_outdoor.js`.

## E. Verification gates
- Syntax: copy each edited/new file to `%TEMP%\x.mjs` and `node --check` it (frontend files are ESM; plain `node --check` on .js misreads them as CJS).
- Sprite audit: every sprite name referenced by world.js/hub.js decor+stations+tilesets must exist in some `src/art/*.js` `defineSprite/defineAnim` (or already-registered names). Zero magenta placeholders.
- Live: `node tools/serve.mjs` → `__DBG.nav('hub')` → `pump` → enter/exit all 6 buildings, open every panel, run tutorial replay, buy-decor injection in the personal interior, pet follow across maps.
