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

// R28/W4-H (ART-08): monochrome inline-SVG chrome icons (currentColor), replacing the
// colour-emoji the audit flagged as generic-SaaS — same `punch` knockout trick as net/ui.js's
// ICON set (a semi-transparent dark mark drawn over an opaque currentColor shape, so details
// read on any accent colour without needing to know the real background behind them).
const svgIcon = (paths, vb = '0 0 16 16') => `<svg class="icon" viewBox="${vb}" aria-hidden="true" focusable="false">${paths}</svg>`;
const ICON = {
  globe: svgIcon('<circle cx="8" cy="8" r="6.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.5 8h13M8 1.5v13M3.1 4.3c1.9 1.3 7.9 1.3 9.8 0M3.1 11.7c1.9-1.3 7.9-1.3 9.8 0" fill="none" stroke="currentColor" stroke-width="1"/>'),
  people: svgIcon('<circle cx="5.2" cy="5" r="2.1"/><circle cx="11" cy="5.4" r="1.8"/><path d="M1.2 13.6c.2-2.6 2-4.3 4-4.3s3.8 1.7 4 4.3M9.6 13.6c.1-2.1 1.5-3.6 3-3.6s2.6 1.3 2.9 3.1" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'),
  door: svgIcon('<rect x="3" y="1.6" width="9" height="12.8" rx=".6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="9.8" cy="8" r="1"/><path d="M12.6 5.4h1.6M12.6 8h1.9M12.6 10.6h1.6" stroke="currentColor" stroke-width="1.2"/>'),
  plus: svgIcon('<rect x="6.8" y="2" width="2.4" height="12"/><rect x="2" y="6.8" width="12" height="2.4"/>'),
  mail: svgIcon('<rect x="1.2" y="3" width="13.6" height="10" rx="1" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M1.8 3.8l6.2 4.8 6.2-4.8" fill="none" stroke="currentColor" stroke-width="1.3"/>'),
  crown: svgIcon('<path d="M2 12.2l1-6.4 3.3 3 1.7-5 1.7 5 3.3-3 1 6.4H2z"/>'),
  eye: svgIcon('<path d="M1 8s3-4.6 7-4.6S15 8 15 8s-3 4.6-7 4.6S1 8 1 8z" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2"/>'),
  check: svgIcon('<path d="M2 8.6l4 4 8-8.6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  warn: svgIcon('<path d="M8 1.6L15 14.4H1L8 1.6z"/><g fill="rgba(0,0,0,.55)"><rect x="7.25" y="6" width="1.5" height="4.2"/><rect x="7.25" y="11.2" width="1.5" height="1.5"/></g>'),
  ticket: svgIcon('<path d="M1 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1.1a1.3 1.3 0 0 0 0 2.6V10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8.7a1.3 1.3 0 0 0 0-2.6V5z"/>'),
  gamepad: svgIcon('<rect x="1.2" y="5.2" width="13.6" height="6.6" rx="2.6"/><g fill="rgba(0,0,0,.5)"><rect x="4" y="7" width="1.3" height="3"/><rect x="3" y="8" width="3.3" height="1.3"/><circle cx="10.8" cy="7.6" r="1"/><circle cx="12.6" cy="9.4" r="1"/></g>'),
  sword: svgIcon('<path d="M9.6 1.4l5 5-1.3 1.3-1.3-.4-3 3 .6 2-1.1 1.1-1.7-1.7-3 3-1.5.4.4-1.5 3-3-1.7-1.7 1.1-1.1 2 .6 3-3-.4-1.3z"/>'),
};

let styled = false;
function ensureStyles() {
  if (styled) return; styled = true;
  document.head.appendChild($('style', { html: `
    @keyframes sl-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
    /* R28/W4-H (ART-08): pulls from the shared :root chrome tokens (index.html) — the same
       ones src/net/ui.js's .net-* rules use — so friends/lobby and login/leaderboard read as
       one modal family instead of two independently-drifted glass panels. */
    .sl-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(20,26,54,.6),rgba(5,7,16,.82));backdrop-filter:blur(3px);font:${'var(--chrome-font-body)'}/1.5 system-ui,sans-serif}
    .sl-card{position:relative;background:linear-gradient(165deg,var(--chrome-bg-top),var(--chrome-bg-bot) 70%);border:var(--chrome-border-w) solid var(--chrome-border);border-radius:var(--chrome-radius);padding:24px;width:min(94vw,560px);max-height:86vh;overflow:auto;color:var(--chrome-text);box-shadow:0 20px 70px rgba(0,0,0,.6),inset 0 0 26px rgba(72,224,208,.12);animation:sl-in .22s ease-out}
    .sl-card::before{content:'';position:absolute;left:18px;right:18px;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--chrome-accent),var(--chrome-gold),transparent);border-radius:2px;opacity:.85}
    /* Solid white, matching the canvas panel title (hub/render.js drawPanelFrame paints its
       title with color '#fff' weight 900). The old teal->gold clipped gradient made the DOM
       read as a different product than the game it overlays, which is what ART-08 is about;
       the shard glow stays as the shared identity cue. */
    .sl-card h2{margin:0 0 4px;font-size:var(--chrome-font-title);font-weight:var(--chrome-weight-title);letter-spacing:2px;text-align:center;display:flex;align-items:center;justify-content:center;gap:8px;color:#fff;text-shadow:0 0 16px rgba(72,224,208,.3)}
    .sl-card h2 .icon{color:var(--chrome-accent-light)}
    .sl-sub{margin:0 0 14px;text-align:center;font-size:var(--chrome-font-caption);letter-spacing:2px;color:#7c87b8}
    .sl-tabs{display:flex;gap:var(--chrome-gap-sm);margin-bottom:14px}
    .sl-tabs button{flex:1;padding:9px;border-radius:var(--chrome-radius-sm);border:1px solid var(--chrome-border-soft);background:#141832;color:var(--chrome-text-dim);cursor:pointer;font-weight:var(--chrome-weight-heading);font-size:var(--chrome-font-body);transition:.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
    .sl-tabs button:hover{color:#cfe0ff;border-color:#3a4a8a}
    .sl-tabs button:focus-visible{outline:2px solid var(--chrome-focus-ring);outline-offset:1px}
    .sl-tabs button.on{background:linear-gradient(180deg,#2c3a8a,#1f2a66);color:#fff;border-color:var(--chrome-accent);box-shadow:0 0 12px rgba(72,224,208,.35)}
    .sl-sec{margin:14px 0}
    /* Section header echoes the canvas panel title band (hub/render.js drawPanelFrame: a
       full-width filled bar + separator), not a left accent tick. */
    .sl-sec h3{margin:0 0 9px;padding:6px 9px;font-size:var(--chrome-font-caption);color:var(--chrome-text-dim);font-weight:var(--chrome-weight-heading);letter-spacing:1px;text-transform:uppercase;background:linear-gradient(180deg,rgba(31,37,66,.9),rgba(31,37,66,.35));border-bottom:1px solid var(--chrome-border-soft);border-radius:var(--chrome-radius-sm) var(--chrome-radius-sm) 0 0;line-height:1.1;display:flex;align-items:center;gap:6px}
    .sl-row{display:flex;gap:var(--chrome-gap-sm);align-items:center;margin:6px 0}
    .sl-row input,.sl-row select{flex:1;box-sizing:border-box;padding:9px 10px;border-radius:var(--chrome-radius-sm);border:var(--chrome-border-w) solid var(--chrome-border);background:var(--chrome-ink);color:#fff;font-size:var(--chrome-font-body);transition:.15s}
    .sl-row input:focus,.sl-row select:focus,.sl-row input:focus-visible,.sl-row select:focus-visible{outline:none;border-color:var(--chrome-accent);box-shadow:0 0 0 3px rgba(72,224,208,.28)}
    .sl-row input:disabled,.sl-row select:disabled{background:var(--chrome-disabled-bg);color:var(--chrome-disabled-fg);cursor:not-allowed}
    .sl-list{display:flex;flex-direction:column;gap:6px}
    .sl-item{display:flex;align-items:center;gap:8px;padding:10px 12px;border:1px solid #25305a;border-radius:var(--chrome-radius);background:linear-gradient(180deg,#161c3a,#121733);transition:.15s}
    .sl-item:hover{border-color:var(--chrome-accent);transform:translateX(2px);box-shadow:0 0 14px rgba(72,224,208,.12)}
    .sl-item .nm{flex:1;font-weight:var(--chrome-weight-heading)}
    .sl-dot{width:9px;height:9px;border-radius:50%;background:#555c7a;flex:none}
    .sl-dot.on{background:#5be36b;box-shadow:0 0 8px #5be36b;animation:sl-pulse 1.8s ease-in-out infinite}
    @keyframes sl-pulse{0%,100%{box-shadow:0 0 6px #5be36b}50%{box-shadow:0 0 12px #5be36b,0 0 3px #fff}}
    .sl-badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:999px;font-size:var(--chrome-font-caption);font-weight:800;letter-spacing:.5px;white-space:nowrap}
    .sl-badge.host{background:rgba(255,212,121,.16);color:var(--chrome-gold);border:1px solid rgba(255,212,121,.45)}
    .sl-badge.ready{background:rgba(91,227,107,.15);color:#7ef08e;border:1px solid rgba(91,227,107,.45)}
    .sl-badge.idle{background:rgba(120,130,160,.14);color:#9aa3c8;border:1px solid #2e3a6e}
    .sl-badge.spec{background:rgba(138,180,255,.15);color:#8ab4ff;border:1px solid rgba(138,180,255,.45)}
    .sl-badge.char{background:rgba(72,224,208,.12);color:var(--chrome-accent-light);border:1px solid rgba(72,224,208,.32)}
    .sl-btn{padding:9px 14px;border-radius:var(--chrome-radius-sm);border:0;cursor:pointer;font-weight:var(--chrome-weight-heading);font-size:var(--chrome-font-body);letter-spacing:.5px;transition:.15s;display:inline-flex;align-items:center;justify-content:center;gap:6px}
    .sl-btn:hover{transform:translateY(-1px)}
    .sl-btn:active{transform:translateY(1px)}
    .sl-btn:focus-visible{outline:2px solid var(--chrome-focus-ring);outline-offset:2px}
    .sl-btn:disabled{opacity:.55;cursor:not-allowed;transform:none;filter:none}
    .sl-pri{background:linear-gradient(180deg,var(--chrome-btn-primary-1),var(--chrome-btn-primary-2));color:var(--chrome-btn-primary-fg);box-shadow:0 2px 0 #1c8478,0 0 12px rgba(72,224,208,.4)}.sl-pri:hover{filter:brightness(1.08)}
    .sl-pri:disabled{background:var(--chrome-disabled-bg);color:var(--chrome-disabled-fg);box-shadow:none}
    .sl-gho{background:linear-gradient(180deg,var(--chrome-btn-ghost-1),var(--chrome-btn-ghost-2));color:var(--chrome-btn-ghost-fg);border:1px solid #2e3a6e}.sl-gho:hover{border-color:#4a5aa0;color:#fff}
    .sl-warn{background:linear-gradient(180deg,var(--chrome-btn-warn-1),var(--chrome-btn-warn-2));color:var(--chrome-btn-warn-fg);border:1px solid #5a3045}.sl-warn:hover{filter:brightness(1.1)}
    .sl-code{position:relative;overflow:hidden;font:900 26px ui-monospace,monospace;letter-spacing:6px;color:var(--chrome-gold);text-align:center;padding:13px;background:linear-gradient(180deg,#11142c,#0a0c1c);border-radius:var(--chrome-radius);border:1px dashed #6a5630;text-shadow:0 0 14px rgba(255,212,121,.5)}
    .sl-code::after{content:'';position:absolute;top:0;left:-60%;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent);transform:skewX(-20deg);animation:sl-shine 3.4s ease-in-out infinite}
    @keyframes sl-shine{0%,60%{left:-60%}100%{left:130%}}
    /* error state: same danger token as the login/leaderboard modal family */
    .sl-msg{min-height:16px;margin-top:8px;font-size:var(--chrome-font-caption);text-align:center;color:var(--chrome-danger);display:flex;align-items:center;justify-content:center;gap:5px}
    .sl-msg.ok{color:var(--chrome-ok)}
    .sl-crown{color:var(--chrome-gold);text-shadow:0 0 8px rgba(255,212,121,.5)}
    .sl-toast{position:fixed;left:50%;bottom:64px;transform:translateX(-50%) translateY(8px);z-index:80;background:linear-gradient(180deg,#1f2548,#141833);border:1px solid #3a4a8a;color:#fff;padding:11px 18px;border-radius:var(--chrome-radius-sm);font:${'var(--chrome-weight-heading)'} 13px system-ui;opacity:0;transition:.25s;max-width:80vw;box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 16px rgba(72,224,208,.2)}
    .sl-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
    .sl-invite{position:fixed;right:12px;bottom:54px;z-index:75;display:flex;flex-direction:column;gap:8px}
    .sl-invite .card{background:linear-gradient(165deg,var(--chrome-bg-top),#121733);border:1px solid #3a4a8a;border-radius:var(--chrome-radius);padding:12px 14px;color:#fff;box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 14px rgba(72,224,208,.2);min-width:220px;animation:sl-in .2s ease-out}
    .sl-invite .card b{color:var(--chrome-gold)}
    .sl-invite .card .row{display:flex;gap:var(--chrome-gap-sm);margin-top:8px}
    .icon{width:1em;height:1em;vertical-align:-0.15em;margin-right:5px;fill:currentColor;flex:none}
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

// Close on backdrop click only when the press AND release both land on the dim area —
// a text-selection drag out of an input must not close the modal (matches net/ui.js).
function bindBackdropClose(modal) {
  let downOnSelf = false;
  modal.addEventListener('mousedown', (e) => { downOnSelf = (e.target === modal); });
  modal.addEventListener('click', (e) => { if (e.target === modal && downOnSelf) closeModal(); downOnSelf = false; });
  return modal;
}

// ---- the social modal (friends + lobby) -----------------------------------
let activeTab = 'friends';
export function openSocial(tab) {
  ensureStyles();
  if (!Net.isLoggedIn()) { toast('請先登入雲端帳號，再使用好友／連線'); return; }
  closeModal();
  RT.ensure();
  if (tab) activeTab = tab;
  if (RT.room) activeTab = 'lobby';

  const body = $('div');
  const msg = $('div', { class: 'sl-msg' });
  const setMsg = (t, ok) => { msg.textContent = t || ''; msg.className = 'sl-msg' + (ok ? ' ok' : ''); };

  const tabFriends = $('button', { html: ICON.people + '好友' });
  const tabLobby = $('button', { html: ICON.door + '連線房間' });
  const setTab = (t) => { activeTab = t; tabFriends.classList.toggle('on', t === 'friends'); tabLobby.classList.toggle('on', t === 'lobby'); render(); };
  tabFriends.addEventListener('click', () => setTab('friends'));
  tabLobby.addEventListener('click', () => setTab('lobby'));

  function render() {
    body.innerHTML = '';
    if (activeTab === 'friends') body.appendChild(renderFriends(setMsg));
    else body.appendChild(renderLobby(setMsg));
  }

  const card = $('div', { class: 'sl-card' }, [
    $('h2', { html: ICON.globe + ' 多人連線' }),
    $('div', { class: 'sl-sub', text: 'CO-OP · 好友與即時合作' }),
    $('div', { class: 'sl-tabs' }, [tabFriends, tabLobby]),
    body, msg,
    $('div', { class: 'sl-row', style: 'margin-top:14px' }, [$('button', { class: 'sl-btn sl-gho', text: '關閉', style: 'flex:1', onclick: closeModal })]),
  ]);
  const modal = bindBackdropClose($('div', { class: 'sl-modal' }, [card]));

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
    $('h3', { html: ICON.plus + '加好友' }),
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
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.mail + '收到的邀請 (' + RT.incoming.length + ')' }), list]));
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
  wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.people + '好友' + (RT.outgoing && RT.outgoing.length ? '（待對方接受 ' + RT.outgoing.length + '）' : '') }), flist]));
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
      $('h3', { html: ICON.door + '建立或加入房間（1~3 人即時合作）' }),
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
    $('h3', { html: ICON.ticket + '房號（分享給好友）' }),
    $('div', { class: 'sl-code', text: room.code }),
    $('div', { class: 'sl-row' }, [$('button', { class: 'sl-btn sl-gho', text: '複製房號', style: 'flex:1', onclick: () => { try { navigator.clipboard.writeText(room.code); toast('已複製房號'); } catch (e) { /* */ } } })]),
  ]));

  // members
  const list = $('div', { class: 'sl-list' });
  for (const m of room.members) {
    const char = Characters.get(m.charId || 'hunter');
    const statusBadge = m.host
      ? $('span', { class: 'sl-badge host', html: ICON.crown + '房主' })
      : m.spectator ? $('span', { class: 'sl-badge spec', html: ICON.eye + '觀戰' })
        : $('span', { class: 'sl-badge ' + (m.ready ? 'ready' : 'idle'), html: m.ready ? ICON.check + '已準備' : '未準備' });
    list.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'sl-dot' + (m.disconnected ? '' : ' on') }),
      $('span', { class: 'nm', html: m.username + (m.cid === RT.selfCid ? '（你）' : '') + (m.disconnected ? ' <span style="color:#ffb454">' + ICON.warn + '斷線</span>' : '') }),
      m.spectator ? null : $('span', { class: 'sl-badge char', text: char ? char.name : (m.charId || '—') }),
      statusBadge,
    ]));
  }
  const playerCount = room.members.filter((m) => !m.spectator).length;
  const specCount = room.members.length - playerCount;
  wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.people + '隊員 (' + playerCount + '/3)' + (specCount ? '　觀戰 ' + specCount : '') }), list]));

  // my character pick (spectators have no avatar, so no pick)
  if (!meSpec) {
    const owned = Characters.all().filter((c) => isUnlocked(META, 'characters', c.id));
    const sel = $('select', {}, owned.map((c) => $('option', { value: c.id, text: c.name, selected: (me.charId || 'hunter') === c.id ? 'selected' : null })));
    sel.addEventListener('change', () => { const c = Characters.get(sel.value); RT.setBuild(sel.value, c ? c.startWeapon : 'w_soulbolt'); });
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.gamepad + '你的角色' }), $('div', { class: 'sl-row' }, [sel])]));
  }

  // host: biome + difficulty
  if (isHost) {
    const bsel = $('select', {}, BIOMES.map(([id, nm]) => $('option', { value: id, text: nm, selected: (room.cfg.biomeId || 'crypt') === id ? 'selected' : null })));
    const dsel = $('select', {}, ['1', '2', '3', '4', '5'].map((d) => $('option', { value: d, text: '難度 ' + d, selected: String(room.cfg.difficulty || 1) === d ? 'selected' : null })));
    const apply = () => RT.setCfg({ biomeId: bsel.value, difficulty: +dsel.value });
    bsel.addEventListener('change', apply); dsel.addEventListener('change', apply);
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.sword + '關卡設定（房主）' }), $('div', { class: 'sl-row' }, [bsel, dsel])]));
  }

  // invite online friends
  const onlineFriends = (RT.friends || []).filter((f) => f.online && !room.members.some((m) => String(m.uid) === String(f.id)));
  if (onlineFriends.length) {
    const fl = $('div', { class: 'sl-list' });
    for (const f of onlineFriends) fl.appendChild($('div', { class: 'sl-item' }, [
      $('span', { class: 'sl-dot on' }), $('span', { class: 'nm', text: f.username }),
      $('button', { class: 'sl-btn sl-pri', text: '邀請', onclick: () => { RT.invite(f.id); setMsg('已邀請 ' + f.username, true); } }),
    ]));
    wrap.appendChild($('div', { class: 'sl-sec' }, [$('h3', { html: ICON.mail + '邀請線上好友' }), fl]));
  }

  // actions
  const actions = $('div', { class: 'sl-row' });
  if (isHost) {
    const players = room.members.filter((m) => !m.spectator);   // spectators don't gate the start
    const canStart = players.length >= 2 && players.every((m) => m.host || m.ready);
    actions.appendChild($('button', { class: 'sl-btn sl-pri', text: players.length < 2 ? '需 2 人以上' : (canStart ? '開始遊戲' : '等待隊員準備'), disabled: canStart ? null : 'disabled', style: 'flex:2', onclick: () => RT.startRun() }));
  } else if (meSpec) {
    actions.appendChild($('span', { style: 'flex:2;color:#8ab4ff;font-weight:700;align-self:center;display:inline-flex;align-items:center', html: ICON.eye + '觀戰中（房主開始後自動進入）' }));
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
