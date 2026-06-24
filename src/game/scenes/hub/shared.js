// hub/shared.js — file-scope helpers & constants shared across the hub-scene mixins.
// Extracted verbatim from hub.js (R21.5 scene-file split). Pure module-level exports, no `this`.
import { P } from '../../../engine/palette.js';

export const inside = (mx, my, r) => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
// R19: outdoor anchors are scattered, so NPCs that stay in town (guide/child=plaza, merchant=market,
// oldvet=garden) keep their tile-offsets here. Keeper NPCs live INSIDE their building interior now and
// use NPC_POS_INT (offsets from the interior station anchor) instead.
export const NPC_POS = {
  guide: [-4, 3], merchant: [0, 0.5], oldvet: [0, -1.5], child: [4, 4],
};
// R19: keeper placement INSIDE the interior — symmetric, near (but clear of) the station anchor
export const NPC_POS_INT = {
  priest: [-2, 4], guildmaster: [-3, 3], receptionist: [3, 3], blacksmith: [-3, 3],
  tailor: [2, 3], curator: [-3, 4],
};
// R19: which building INTERIOR each keeper lives in (its `room`/`station`→panel mapping is in npcs.js).
// The interior area id matches these (church/guild/blacksmith/clothing/achievements). personal has no keeper.
export const KEEPER_AREA = { priest: 'church', guildmaster: 'guild', receptionist: 'guild', blacksmith: 'blacksmith', tailor: 'clothing', curator: 'achievements' };
// R19: NPCs that stay OUTSIDE in the town exterior
export const TOWN_NPC_IDS = new Set(['guide', 'child', 'merchant', 'oldvet']);
// R19: the 6 building interior areas (door target -> panel + station identity)
// R20/B3: station sprites upgraded to the large ruin_st_* centrepieces (40-56px, B1 art)
export const BUILDINGS = {
  church: { panel: 'talents', sprite: 'ruin_st_goddess', label: '女神像 · 天賦', color: P.shardL, name: '教堂', enterLabel: '進入 教堂' },
  guild: { panel: 'guild', sprite: 'ruin_st_board', label: '任務板 · 公會', color: P.goldL, name: '冒險者公會', enterLabel: '進入 公會' },
  blacksmith: { panel: 'smith', sprite: 'ruin_st_furnace', label: '鍛造爐 · 鐵匠鋪', color: P.emberL, name: '鐵匠鋪', enterLabel: '進入 鐵匠鋪' },
  clothing: { panel: 'wardrobe', sprite: 'ruin_st_mannequin', label: '衣帽店', color: P.purpleL, name: '衣帽店', enterLabel: '進入 衣帽店' },
  achievements: { panel: 'achievements', sprite: 'ruin_st_trophy', label: '成就殿堂', color: P.gold, name: '成就殿堂', enterLabel: '進入 成就殿堂' },
  personal: { panel: 'personal', sprite: 'ruin_st_bed', label: '個人小屋', color: P.greenL, name: '個人小屋', enterLabel: '進入 小屋' },
};
export const AREA_TITLE = { town: '魂 晶 遺 鎮', church: '教 堂', guild: '冒 險 者 公 會', blacksmith: '鐵 匠 鋪', clothing: '衣 帽 店', achievements: '成 就 殿 堂', personal: '個 人 小 屋' };
// task-6: a distinct colour per room so each region reads as its own space (not one flat hall)
export const ROOM_THEME = {
  church: P.shardL, guild: P.goldL, blacksmith: P.emberL, clothing: P.purpleL,
  achievements: P.gold, personal: P.greenL, plaza: P.manaL, garden: P.toxic, market: P.bronze,
};
