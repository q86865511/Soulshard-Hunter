// Character lore (角色劇情): a short backstory + a signature battle quote per hero.
// Shown on the run-start story card (the chosen hero gets a "character moment") and
// available to any panel that wants to give a hero plot presence. Keyed by character id.

export const HERO_LORE = {
  // core six
  hunter:      { epithet: '循光者',   quote: '魂晶指引我前行 — 哪怕盡頭是深淵。',     lore: '最早循著魂晶微光踏入永夜的獵手。沒有傳奇，只有活下去的執念。' },
  pyro:        { epithet: '焚心者',   quote: '要燃燒，就燒到一無所剩。',             lore: '以自身壽命為燃料的術士，每一道火焰都在縮短他的生命。' },
  guardian:    { epithet: '不破之壁', quote: '站到我身後 — 沒有什麼能越過我。',       lore: '晶岩鑄成的守衛，曾以血肉之軀為一整座村莊擋下魂潮。' },
  ranger:      { epithet: '逐風者',   quote: '你連我的影子都追不上。',               lore: '永夜中最快的箭。據說從未有獵物見過她的正臉。' },
  stormcaller: { epithet: '喚雷者',   quote: '天怒，由我代為宣讀。',                 lore: '與雷暴締約的祭司，每一次施法都在償還那份契約。' },
  shadow:      { epithet: '無聲之刃', quote: '你甚至不會聽見結束的聲音。',           lore: '沒有名字、沒有過去的刺客，只在魂晶交易的陰影裡留下傳說。' },
  // round-2 heroes
  h2_duelist:   { epithet: '獨決者',   quote: '真正的決鬥，只需要一個回合。',         lore: '走遍諸界尋找對手的劍客，敗者無數，至今仍在尋找能逼他出第二招的人。' },
  h2_warlock:   { epithet: '償契者',   quote: '代價？我早已付清了。',                 lore: '與深淵簽下血契的咒術士，力量越強，留給自己的就越少。' },
  h2_trapper:   { epithet: '布局者',   quote: '這片獵場，每一步都是我畫好的。',       lore: '不追逐獵物，而讓獵物走進她的棋盤；潮水只是她落下的棋子。' },
  h2_voidcaller:{ epithet: '聆虛者',   quote: '虛空在低語，而我聽得懂。',             lore: '凝視深淵太久而被深淵回望的人，如今以虛空之語驅役魂潮。' },
  h2_warder:    { epithet: '守誓者',   quote: '誓言未竟，我便不倒。',                 lore: '為一個早已不在的人立下守護之誓，至今未曾離開崗位一步。' },
  // round-3 heroes
  h3_spearmaiden:{ epithet: '持槍聖女', quote: '此槍，只為信念而舉。',               lore: '神殿最後的聖女，以一桿長槍守住信仰崩塌後僅存的微光。' },
  h3_plague:    { epithet: '腐生者',   quote: '腐朽，是另一種重生。',                 lore: '在瘟疫中倖存、又學會駕馭瘟疫的醫者；治癒與毀滅在他手中同源。' },
  h3_beastfang: { epithet: '獸牙',     quote: '在這裡，我才是獵食者。',               lore: '被魂潮奪去族群的野性獵人，如今以野獸之姿反獵魂潮。' },
  h3_dragoon:   { epithet: '躍空者',   quote: '從高處俯衝，便是終結。',               lore: '失落龍騎軍團的孤兒，帶著祖傳長槍與一身俯衝的信念征戰永夜。' },
};

export function heroLore(id) { return HERO_LORE[id] || null; }
