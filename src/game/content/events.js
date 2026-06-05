// Mini-boss reward EVENTS (原#3) — LoL-Arena-augment style. Killing a mini-boss
// drops a random 3-of-these choice, each "hosted" by a flavour non-hero NPC. Effects
// are deliberately varied: stat boons, risk/reward curses, sacrifices, and timed
// challenge mini-quests. apply(s) receives the run scene and uses its helpers
// (grantLevelUps / sacrificeWeapon / allWeaponsLevelUp / startChallenge).
export const EVENTS = [
  // --- straight boons -------------------------------------------------------
  { id: 'ev_rage', host: '狂戰士', name: '狂暴之血', desc: '傷害 +28%', apply: (s) => { s.player.stats.damageMult *= 1.28; } },
  { id: 'ev_rapid', host: '槍匠', name: '連射改造', desc: '射速 +20%', apply: (s) => { s.player.stats.fireRateMult *= 1.2; } },
  { id: 'ev_wall', host: '守衛', name: '鐵壁', desc: '減傷 +3、生命上限 +30', apply: (s) => { s.player.stats.defense += 3; s.player.stats.maxHp += 30; s.player.heal(30); } },
  { id: 'ev_lethal', host: '刺客', name: '致命專注', desc: '暴擊率 +12%、暴傷 +0.5', apply: (s) => { s.player.stats.critChance += 0.12; s.player.stats.critMult += 0.5; } },
  { id: 'ev_wind', host: '風行者', name: '疾風', desc: '移速 +18%、衝刺冷卻 -25%', apply: (s) => { s.player.stats.speed *= 1.18; s.player.stats.dashCd *= 0.75; } },
  { id: 'ev_vamp', host: '血祭司', name: '嗜血', desc: '吸血 +6%', apply: (s) => { s.player.stats.lifesteal = (s.player.stats.lifesteal || 0) + 0.06; } },
  { id: 'ev_spread', host: '砲手', name: '擴散彈', desc: '投射物 +2', apply: (s) => { s.player.stats.projCountAdd = (s.player.stats.projCountAdd || 0) + 2; } },
  { id: 'ev_pierce', host: '穿甲師', name: '破甲', desc: '穿透 +2、傷害 +10%', apply: (s) => { s.player.stats.pierceAdd = (s.player.stats.pierceAdd || 0) + 2; s.player.stats.damageMult *= 1.1; } },
  { id: 'ev_giant', host: '煉金術士', name: '巨化', desc: '範圍 +25%、傷害 +12%', apply: (s) => { s.player.stats.area = (s.player.stats.area || 1) * 1.25; s.player.stats.damageMult *= 1.12; } },
  { id: 'ev_luck', host: '占卜師', name: '命運眷顧', desc: '幸運 +0.4、金幣 +20%', apply: (s) => { s.player.stats.luck = (s.player.stats.luck || 0) + 0.4; s.player.stats.goldMult *= 1.2; } },
  // --- risk / reward (curse-like) ------------------------------------------
  { id: 'ev_gamble', host: '賭徒', name: '孤注一擲', desc: '傷害 +60%，但生命上限 -30%', apply: (s) => { const st = s.player.stats; st.damageMult *= 1.6; st.maxHp = Math.round(st.maxHp * 0.7); s.player.hp = Math.min(s.player.hp, st.maxHp); } },
  { id: 'ev_zeal', host: '狂信者', name: '獻祭', desc: '射速 +45%，但減傷 -4', apply: (s) => { s.player.stats.fireRateMult *= 1.45; s.player.stats.defense -= 4; } },
  { id: 'ev_glass', host: '玻璃匠', name: '琉璃之軀', desc: '暴擊 +25%、暴傷 +0.8，但生命 -18%', apply: (s) => { const st = s.player.stats; st.critChance += 0.25; st.critMult += 0.8; st.maxHp = Math.round(st.maxHp * 0.82); s.player.hp = Math.min(s.player.hp, st.maxHp); } },
  // --- sacrifices / trades --------------------------------------------------
  { id: 'ev_collector', host: '收藏家', name: '以一換三', desc: '犧牲一把武器 → 立即額外 3 次升級', apply: (s) => { s.grantLevelUps(s.sacrificeWeapon() ? 3 : 2); } },
  { id: 'ev_reforge', host: '軍械庫', name: '全軍重鑄', desc: '全武器 +1 級，並額外 1 次升級', apply: (s) => { s.allWeaponsLevelUp(); s.grantLevelUps(1); } },
  { id: 'ev_soultrade', host: '死靈術士', name: '靈魂交易', desc: '生命上限 -20% → 傷害 +40%、射速 +20%', apply: (s) => { const st = s.player.stats; st.maxHp = Math.round(st.maxHp * 0.8); s.player.hp = Math.min(s.player.hp, st.maxHp); st.damageMult *= 1.4; st.fireRateMult *= 1.2; } },
  // --- timed challenge mini-quests -----------------------------------------
  { id: 'ev_trial', host: '試煉者', name: '無傷試煉', desc: '12 秒內不受傷 → 額外 3 次升級', apply: (s) => s.startChallenge({ name: '無傷試煉', dur: 12, type: 'nohit', reward: (sc) => sc.grantLevelUps(3) }) },
  { id: 'ev_hunt', host: '獵首人', name: '獵殺契約', desc: '15 秒內擊殺 40 名敵人 → 金幣魂晶與升級', apply: (s) => s.startChallenge({ name: '獵殺契約', dur: 15, type: 'kills', need: 40, reward: (sc) => { sc.run.gold += 800; sc.run.shards += 60; sc.grantLevelUps(2); } }) },
  { id: 'ev_ascetic', host: '苦行僧', name: '極限耐性', desc: '16 秒內不受傷 → 永久 +40 生命上限並全回復', apply: (s) => s.startChallenge({ name: '極限耐性', dur: 16, type: 'nohit', reward: (sc) => { sc.player.stats.maxHp += 40; sc.player.heal(9999); } }) },
  { id: 'ev_purge', host: '劊子手', name: '血腥契約', desc: '20 秒內擊殺 70 名敵人 → 傷害 +30% 永久', apply: (s) => s.startChallenge({ name: '血腥契約', dur: 20, type: 'kills', need: 70, reward: (sc) => { sc.player.stats.damageMult *= 1.3; } }) },
  // --- resources ------------------------------------------------------------
  { id: 'ev_merchant', host: '商人', name: '財富', desc: '+1500 金幣、+120 魂晶', apply: (s) => { s.run.gold += 1500; s.run.shards += 120; } },
  { id: 'ev_grace', host: '聖者', name: '恩典', desc: '全回復、生命上限 +25', apply: (s) => { s.player.stats.maxHp += 25; s.player.heal(9999); } },
];
