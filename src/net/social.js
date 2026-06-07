// Friends + co-op lobby UI (Phase 2). DOM overlay (like ui.js) — real inputs/buttons
// are nicer than canvas widgets here. Offline-first: everything degrades gracefully
// when not logged in. Live-updates from RT events (friends / presence / room state).
import { Net } from './api.js';
import { RT } from './rt.js';
import { META } from '../game/state.js';
import { Characters, Weapons } from '../game/content/registry.js';
import { isUnlocked } from '../game/content/unlocks.js';

const $ = (tag, props = {}, kids = []) => {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') e.className = props[k];
    else if (k === 'html') e.innerHTML = props[k];
    else if (k === 'text') e.textContent = props[k];
    else if (k.startsWith('on') && typeof props[k] === 'function') e.addEventListener(k.slice(2), props[k]);
    else if (props[k] != null) e.setAttribute(k, props[k]);
  }
  for (const c of [].concat(kids)) if (c) e.appendChild(c);
  return e;
};

const BIOMES = [['crypt', '幽影地穴'], ['cavern', '水晶洞窟'], ['frost', '霜寒冰原'], ['inferno', '熔岩深淵'], ['void', '虛空裂界'], ['verdant', '翠林森境'], ['desert', '流沙荒漠'], ['swamp', '腐沼濕地'], ['abyss', '深淵海溝'], ['celestial', '天界雲海']];

let styled = false;
function ensureStyles() {
  if (styled) return; styled = true;
  document.head.appendChild($('style', { html: `
    .sl-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(7,9,18,.72);font:14px/1.4 system-ui,sans-serif}
    .sl-card{background:#12152a;border:1px solid #2a3052;border-radius:12px;padding:20px;width:min(94vw,560px);max-height:86vh;overflow:auto;color:#dfe3f5;box-shadow:0 18px 60px rgba(0,0,0,.6)}
    .sl-card h2{margin:0 0 12px;font-size:19px;color:#a8fff4;text-align:center}
    .sl-tabs{display:flex;gap:8px;margin-bottom:14px}
    .sl-tabs button{flex:1;padding:8px;border-radius:8px;border:1px solid #2a3052;background:#171b34;color:#9aa3c8;cursor:pointer}
    .sl-tabs button.on{background:#27306a;color:#fff}
    .sl-sec{margin:12px 0}
    .sl-sec h3{margin:0 0 8px;font-size:13px;color:#9aa3c8;font-weight:700}
    .sl-row{display:flex;gap:8px;align-items:center;margin:6px 0}
    .sl-row input,.sl-row select{flex:1;box-sizing:border-box;padding:8px 9px;border-radius:7px;border:1px solid #2a3052;background:#0e1124;color:#fff}
    .sl-list{display:flex;flex-direction:column;gap:6px}
    .sl-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #222746;border-radius:8px;background:#141832}
    .sl-item .nm{flex:1;font-weight:600}
    .sl-dot{width:9px;height:9px;border-radius:50%;background:#555c7a}
    .sl-dot.on{background:#5be36b;box-shadow:0 0 6px #5be36b}
    .sl-btn{padding:7px 12px;border-radius:7px;border:0;cursor:pointer;font-weight:700;font-size:13px}
    .sl-pri{background:#48e0d0;color:#062a27}.sl-pri:hover{background:#6cf0e2}
    .sl-pri:disabled{background:#2a4a48;color:#789;cursor:not-allowed}
    .sl-gho{background:#1b2140;color:#cdd3f0}.sl-gho:hover{background:#27305a}
    .sl-warn{background:#3a2030;color:#ffb4a8}.sl-warn:hover{background:#4a2636}
    .sl-code{font:800 22px ui-monospace,monospace;letter-spacing:3px;color:#ffd479;text-align:center;padding:8px;background:#0e1124;border-radius:8px;border:1px dashed #3a4068}
    .sl-msg{min-height:16px;margin-top:8px;font-size:12px;text-align:center;color:#ff7b6b}
    .sl-msg.ok{color:#9be36b}
    .sl-crown{color:#ffd479}
    .sl-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%);z-index:80;background:#171b34;border:1px solid #2a3052;color:#fff;padding:10px 16px;border-radius:9px;font:600 13px system-ui;opacity:0;transition:opacity .2s;max-width:80vw}
    .sl-toast.show{opacity:1}
    .sl-invite{position:fixed;right:12px;bottom:54px;z-index:75;display:flex;flex-direction:column;gap:8px}
    .sl-invite .card{background:#171b34;border:1px solid #3a4068;border-radius:10px;padding:12px 14px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5);min-width:220px}
    .sl-invite .card b{color:#ffd479}
    .sl-invite .card .row{display:flex;gap:8px;margin-top:8px}
  ` }));
}

let toastEl = null, toastTimer = null;
function toast(msg, ms = 2400) {
  ensureStyles();
  if (!toastEl) { toastEl = $('div', { class: 'sl-toast' }); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function closeModal() { const m = document.querySelector('.sl-modal'); if (m) { if (m._cleanup) m._cleanup(); m.remove(); } }

// ---- the social modal (friends + lobby) -----------------------------------
let activeTab = 'friends';
export function openSocial(tab) {
  ensureStyles();
  if (!Net.isLoggedIn()) { toast('請先在右下角登入雲端帳號，再使用好友／連線'); return; }
  closeModal();
  RT.ensure();
  if (tab) activeTab = tab;
  if (RT.room) activeTab = 'lobby';

  const body = $('div');
  const msg = $('div', { class: 'sl-msg' });
  const setMsg = (t, ok) => { msg.textContent = t || ''; msg.className = 'sl-msg' + (ok ? ' ok' : ''); };

  const tabFriends = $('button', { text: '好友' });
  const tabLobby = $('button', { text: '連線房間' });
  const setTab = (t) => { activeTab = t; tabFriends.classList.toggle('on', t === 'friends'); tabLobby.classList.toggle('on', t === 'lobby'); render(); };
  tabFriends.addEventListener('click', () => setTab('friends'));
  tabLobby.addEventListener('click', () => setTab('lobby'));

  function render() {
    body.innerHTML = '';
    if (activeTab === 'friends') body.appendChild(renderFriends(setMsg));
    else body.appendChild(renderLobby(setMsg));
  }

  const card = $('div', { class: 'sl-card' }, [
    $('h2', { text: '好友與連線合作' }),
    $('div', { class: 'sl-tabs' }, [tabFriends, tabLobby]),
    body, msg,
    $('div', { class: 'sl-row', style: 'margin-top:14px' }, [$('button', { class: 'sl-btn sl-gho', text: '關閉', style: 'flex:1', onclick: closeModal })]),
  ]);
  const modal = $('div', { class: 'sl-modal', onclick: (e) => { if (e.target === modal) closeModal(); } }, [card]);

  // live updates while open
  const reRender = () => render();
  const subs = [
    RT.on('friends', reRender), RT.on('presence', reRender),
    RT.on('room:state', () => { if (RT.room && activeTab !== 'lobby') setTab('lobby'); else reRender(); }),
    RT.on('room:closed', () => { toast('房間已關閉'); reRender(); }),
    RT.on('room:err', (m) => setMsg(m.msg || '操作失敗')),
    RT.on('invite:sent', () => setMsg('已送出邀請', true)),
  ];
  modal._cleanup = () => { for (const u of subs) try { u(); } catch (e) { /* */ } };
  document.body.appendChild(modal);
  RT.reloadFriends();
  setTab(activeTab);
}

function renderFriends(setMsg) {
  const wrap = $('div');
  // add friend
  const inp = $('input', { type: 'text', placeholder: '輸入對方帳號名稱', maxlength: 24 });
  const add = async () => {
    const u = inp.value.trim(); if (!u) return;
    try { const r = await Net.addFriend(u); inp.value = ''; setMsg(r.status === 'accepted' ? '已成為好友！' : '已送出好友邀請', true); RT.reloadFriends(); }
    catch (e) { setMsg(e && e.message ? '失敗：' + e.message : '送出失敗'); }
  };
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') add(); });
  wrap.appendChild($('div', { class: 'sl-sec' }, [
    $('h3', { text: '加好友' }),
    $('div', { class: 'sl-row' }, [inp, $('button', { class: 'sl-btn sl-pri', text: '送出', onclick: add })]),
  ]));
  // incoming
  if (RT.incoming && RT.incoming.length) {
    const list = $('div', { class: 'sl-list' });
    for (const f of RT.incoming) list.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'nm', text: f.username }),
      $('button', { class: 'sl-btn sl-pri', text: '接受', onclick: async () => { try { await Net.acceptFriend(f.id); RT.reloadFriends(); setMsg('已接受', true); } catch (e) { setMsg('失敗'); } } }),
      $('button', { class: 'sl-btn sl-gho', text: '拒絕', onclick: async () => { try { await Net.declineFriend(f.id); RT.reloadFriends(); } catch (e) { /* */ } } }),
    ]));
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '收到的邀請 (' + RT.incoming.length + ')' }), list]));
  }
  // friends
  const flist = $('div', { class: 'sl-list' });
  if (!RT.friends || !RT.friends.length) flist.appendChild($('div', { class: 'sl-item' }, [$('span', { class: 'nm', text: '尚無好友 — 在上面加一個吧' })]));
  for (const f of (RT.friends || [])) {
    flist.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'sl-dot' + (f.online ? ' on' : '') }),
      $('span', { class: 'nm', text: f.username }),
      f.online ? $('button', { class: 'sl-btn sl-pri', text: '邀請合作', onclick: () => inviteFriend(f, setMsg) }) : $('span', { style: 'color:#778;font-size:12px', text: '離線' }),
      $('button', { class: 'sl-btn sl-warn', text: '刪除', onclick: async () => { try { await Net.removeFriend(f.id); RT.reloadFriends(); } catch (e) { /* */ } } }),
    ]));
  }
  wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '好友' + (RT.outgoing && RT.outgoing.length ? '（待對方接受 ' + RT.outgoing.length + '）' : '') }), flist]));
  return wrap;
}

function inviteFriend(f, setMsg) {
  if (!RT.room) RT.createRoom(defaultCfg());   // need a room to invite into → make one
  setTimeout(() => { RT.invite(f.id); setMsg('已邀請 ' + f.username, true); openSocial('lobby'); }, RT.room ? 0 : 250);
}

function defaultCfg() {
  const c = Characters.get(META.selectedCharacter || 'hunter');
  return { biomeId: 'crypt', difficulty: 1, charId: c ? c.id : 'hunter', weaponId: c ? c.startWeapon : 'w_soulbolt' };
}

function renderLobby(setMsg) {
  const wrap = $('div');
  if (!RT.room) {
    wrap.appendChild($('div', { class: 'sl-sec' }, [
      $('h3', { text: '建立或加入房間（1~3 人即時合作）' }),
      $('div', { class: 'sl-row' }, [$('button', { class: 'sl-btn sl-pri', text: '＋ 建立房間', style: 'flex:1', onclick: () => { RT.createRoom(defaultCfg()); } })]),
    ]));
    const code = $('input', { type: 'text', placeholder: '輸入房號加入', maxlength: 6, style: 'text-transform:uppercase' });
    const join = () => { const c = code.value.trim().toUpperCase(); if (c) RT.joinRoom(c); };
    const spectate = () => { const c = code.value.trim().toUpperCase(); if (c) RT.spectateRoom(c); };   // 中途觀戰: works even on a started room
    code.addEventListener('keydown', (e) => { if (e.key === 'Enter') join(); });
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('div', { class: 'sl-row' }, [code, $('button', { class: 'sl-btn sl-gho', text: '加入', onclick: join }), $('button', { class: 'sl-btn sl-gho', text: '觀戰', onclick: spectate })])]));
    return wrap;
  }

  const room = RT.room;
  const me = room.members.find((m) => m.cid === RT.selfCid) || {};
  const isHost = room.hostCid === RT.selfCid;
  const meSpec = !!me.spectator;

  // room code
  wrap.appendChild($('div', { class: 'sl-sec' }, [
    $('h3', { text: '房號（分享給好友）' }),
    $('div', { class: 'sl-code', text: room.code }),
    $('div', { class: 'sl-row' }, [$('button', { class: 'sl-btn sl-gho', text: '複製房號', style: 'flex:1', onclick: () => { try { navigator.clipboard.writeText(room.code); toast('已複製房號'); } catch (e) { /* */ } } })]),
  ]));

  // members
  const list = $('div', { class: 'sl-list' });
  for (const m of room.members) {
    const char = Characters.get(m.charId || 'hunter');
    list.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'nm', html: (m.host ? '<span class="sl-crown">♛ </span>' : '') + m.username + (m.cid === RT.selfCid ? '（你）' : '') + (m.disconnected ? ' <span style="color:#ff9">⚠ 斷線</span>' : '') }),
      $('span', { style: 'font-size:12px;color:#9aa3c8', text: m.spectator ? '—' : (char ? char.name : (m.charId || '—')) }),
      $('span', { style: 'font-size:12px;color:' + (m.host ? '#ffd479' : (m.spectator ? '#8ab4ff' : (m.ready ? '#5be36b' : '#778'))), text: m.host ? '房主' : (m.spectator ? '👁 觀戰' : (m.ready ? '✓ 已準備' : '未準備')) }),
    ]));
  }
  const playerCount = room.members.filter((m) => !m.spectator).length;
  const specCount = room.members.length - playerCount;
  wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '隊員 (' + playerCount + '/3)' + (specCount ? '　觀戰 ' + specCount : '') }), list]));

  // my character pick (spectators have no avatar, so no pick)
  if (!meSpec) {
    const owned = Characters.all().filter((c) => isUnlocked(META, 'characters', c.id));
    const sel = $('select', {}, owned.map((c) => $('option', { value: c.id, text: c.name, selected: (me.charId || 'hunter') === c.id ? 'selected' : null })));
    sel.addEventListener('change', () => { const c = Characters.get(sel.value); RT.setBuild(sel.value, c ? c.startWeapon : 'w_soulbolt'); });
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '你的角色' }), $('div', { class: 'sl-row' }, [sel])]));
  }

  // host: biome + difficulty
  if (isHost) {
    const bsel = $('select', {}, BIOMES.map(([id, nm]) => $('option', { value: id, text: nm, selected: (room.cfg.biomeId || 'crypt') === id ? 'selected' : null })));
    const dsel = $('select', {}, ['1', '2', '3', '4', '5'].map((d) => $('option', { value: d, text: '難度 ' + d, selected: String(room.cfg.difficulty || 1) === d ? 'selected' : null })));
    const apply = () => RT.setCfg({ biomeId: bsel.value, difficulty: +dsel.value });
    bsel.addEventListener('change', apply); dsel.addEventListener('change', apply);
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '關卡設定（房主）' }), $('div', { class: 'sl-row' }, [bsel, dsel])]));
  }

  // invite online friends
  const onlineFriends = (RT.friends || []).filter((f) => f.online && !room.members.some((m) => String(m.uid) === String(f.id)));
  if (onlineFriends.length) {
    const fl = $('div', { class: 'sl-list' });
    for (const f of onlineFriends) fl.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'sl-dot on' }), $('span', { class: 'nm', text: f.username }),
      $('button', { class: 'sl-btn sl-pri', text: '邀請', onclick: () => { RT.invite(f.id); setMsg('已邀請 ' + f.username, true); } }),
    ]));
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { text: '邀請線上好友' }), fl]));
  }

  // actions
  const actions = $('div', { class: 'sl-row' });
  if (isHost) {
    const players = room.members.filter((m) => !m.spectator);   // spectators don't gate the start
    const canStart = players.length >= 2 && players.every((m) => m.host || m.ready);
    actions.appendChild($('button', { class: 'sl-btn sl-pri', text: players.length < 2 ? '需 2 人以上' : (canStart ? '開始遊戲' : '等待隊員準備'), disabled: canStart ? null : 'disabled', style: 'flex:2', onclick: () => RT.startRun() }));
  } else if (meSpec) {
    actions.appendChild($('span', { style: 'flex:2;color:#8ab4ff;font-weight:700;align-self:center', text: '👁 觀戰中（房主開始後自動進入）' }));
  } else {
    const meMember = room.members.find((m) => m.cid === RT.selfCid) || {};
    actions.appendChild($('button', { class: 'sl-btn ' + (meMember.ready ? 'sl-gho' : 'sl-pri'), text: meMember.ready ? '取消準備' : '準備', style: 'flex:2', onclick: () => RT.setReady(!meMember.ready) }));
  }
  actions.appendChild($('button', { class: 'sl-btn sl-warn', text: '離開', onclick: () => { RT.leaveRoom(); openSocial('lobby'); } }));
  wrap.appendChild($('div', { class: 'sl-sec' }, [actions]));
  return wrap;
}

// ---- incoming invite popups -----------------------------------------------
let inviteHolder = null;
function showInvite(m) {
  ensureStyles();
  if (!inviteHolder) { inviteHolder = $('div', { class: 'sl-invite' }); document.body.appendChild(inviteHolder); }
  const card = $('div', { class: 'card' }, [
    $('div', { html: '<b>' + (m.from && m.from.username || '好友') + '</b> 邀請你加入合作房間 <b>' + m.code + '</b>' }),
    $('div', { class: 'row' }, [
      $('button', { class: 'sl-btn sl-pri', text: '加入', onclick: () => { card.remove(); RT.joinRoom(m.code); openSocial('lobby'); } }),
      $('button', { class: 'sl-btn sl-gho', text: '忽略', onclick: () => card.remove() }),
    ]),
  ]);
  inviteHolder.appendChild(card);
  setTimeout(() => { if (card.parentNode) card.remove(); }, 30000);
}

// ---- boot hook -------------------------------------------------------------
export function initSocial() {
  ensureStyles();
  if (Net.isLoggedIn()) RT.ensure();
  RT.on('invite', (m) => showInvite(m));
  RT.on('rt:open', () => RT.reloadFriends());
  RT.on('room:err', (m) => toast(m && m.msg ? m.msg : '連線操作失敗'));
  RT.on('start', () => closeModal());   // run begins → drop the lobby overlay so the canvas (run / coop / spectate) is visible
}
