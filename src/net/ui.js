// DOM overlays for the cloud features: a small account/leaderboard bar plus two
// modals (login/register, leaderboard). HTML overlays are used on purpose — real
// <input> fields (password masking, autofill) and a scrollable table are far
// nicer here than hand-drawn canvas widgets. Everything is offline-tolerant.
import { Net } from './api.js';
import { RT } from './rt.js';
import { openSocial, initSocial } from './social.js';
import { syncFromCloud, lastGuestRun, clearLastGuestRun } from '../game/state.js';
import { getScene } from '../game/scene.js';
import { refs } from '../game/scenes/refs.js';

const inRun = () => { try { return getScene() === refs.run; } catch (e) { return false; } };

const $ = (tag, props = {}, kids = []) => {
  const e = document.createElement(tag);
  for (const k in props) {
    if (k === 'class') e.className = props[k];
    else if (k === 'html') e.innerHTML = props[k];
    else if (k === 'text') e.textContent = props[k];
    else if (k.startsWith('on') && typeof props[k] === 'function') e.addEventListener(k.slice(2), props[k]);
    else e.setAttribute(k, props[k]);
  }
  for (const c of [].concat(kids)) if (c) e.appendChild(c);
  return e;
};

const BIOME_LABELS = { '': '全部生態', crypt: '幽影地穴', cavern: '水晶洞窟', frost: '霜寒冰原', inferno: '熔岩深淵', void: '虛空裂界', verdant: '翠林森境', desert: '流沙荒漠', swamp: '腐沼濕地', abyss: '深淵海溝', celestial: '天界雲海' };

let styled = false;
function ensureStyles() {
  if (styled) return; styled = true;
  document.head.appendChild($('style', { html: `
    #net-bar{position:fixed;right:12px;bottom:12px;z-index:50;display:flex;gap:6px;font:700 12px/1 system-ui,sans-serif}
    #net-bar button{background:linear-gradient(180deg,rgba(30,36,66,.9),rgba(18,22,42,.92));color:#cdd3f0;border:1px solid #2a3a6a;border-radius:8px;padding:7px 11px;cursor:pointer;backdrop-filter:blur(4px);transition:.15s;box-shadow:0 2px 8px rgba(0,0,0,.3)}
    #net-bar button:hover{border-color:#48e0d0;color:#fff;box-shadow:0 0 12px rgba(72,224,208,.5);transform:translateY(-1px)}
    #net-bar .who{color:#ffd479;border-color:#5a4a2a}
    @keyframes nt-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}
    .net-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 40%,rgba(20,26,54,.6),rgba(5,7,16,.82));backdrop-filter:blur(5px);font:14px/1.5 system-ui,sans-serif}
    .net-card{position:relative;background:linear-gradient(165deg,#1a2042,#0e1126 70%);border:1px solid #34407a;border-radius:14px;padding:24px;width:min(92vw,430px);color:#dfe3f5;box-shadow:0 20px 70px rgba(0,0,0,.6),inset 0 0 26px rgba(72,224,208,.12);animation:nt-in .22s ease-out}
    .net-card::before{content:'';position:absolute;left:18px;right:18px;top:0;height:2px;background:linear-gradient(90deg,transparent,#48e0d0,#ffd479,transparent);border-radius:2px;opacity:.85}
    .net-card.wide{width:min(94vw,660px)}
    .net-card h2{margin:0 0 16px;font-size:21px;font-weight:900;letter-spacing:2px;text-align:center;background:linear-gradient(90deg,#a8fff4,#ffd479);-webkit-background-clip:text;background-clip:text;color:transparent;text-shadow:0 0 18px rgba(72,224,208,.3)}
    .net-tabs{display:flex;gap:8px;margin-bottom:14px}
    .net-tabs button{flex:1;padding:9px;border-radius:9px;border:1px solid #2a3052;background:#141832;color:#9aa3c8;cursor:pointer;font-weight:700;transition:.15s}
    .net-tabs button:hover{color:#cfe0ff;border-color:#3a4a8a}
    .net-tabs button.on{background:linear-gradient(180deg,#2c3a8a,#1f2a66);color:#fff;border-color:#48e0d0;box-shadow:0 0 12px rgba(72,224,208,.35)}
    .net-card label{display:block;margin:11px 0 4px;color:#8ea0d8;font-size:11px;letter-spacing:1px;text-transform:uppercase}
    .net-card input,.net-card select{width:100%;box-sizing:border-box;padding:10px 11px;border-radius:9px;border:1px solid #2a3a6a;background:#0b0e20;color:#fff;font-size:14px;transition:.15s}
    .net-card input:focus,.net-card select:focus{outline:none;border-color:#48e0d0;box-shadow:0 0 10px rgba(72,224,208,.35)}
    .net-row{display:flex;gap:8px;margin-top:16px}
    .net-row button{flex:1;padding:11px;border-radius:9px;border:0;cursor:pointer;font-weight:800;letter-spacing:1px;transition:.15s}
    .net-row button:active{transform:translateY(1px)}
    .net-primary{background:linear-gradient(180deg,#5cf0e0,#2bb5a6);color:#04221f;box-shadow:0 3px 0 #1c8478,0 0 14px rgba(72,224,208,.45)}
    .net-primary:hover{filter:brightness(1.08)}
    .net-primary:disabled{background:#2a4a48;color:#789;box-shadow:none;cursor:not-allowed}
    .net-ghost{background:linear-gradient(180deg,#202852,#171d3c);color:#cdd3f0;border:1px solid #2e3a6e}
    .net-ghost:hover{border-color:#4a5aa0;color:#fff}
    .net-warn{background:linear-gradient(180deg,#43243a,#321c2c);color:#ffb4a8;border:1px solid #5a3045;border-radius:7px;cursor:pointer}
    .net-warn:hover{filter:brightness(1.12)}
    .net-msg{min-height:18px;margin-top:10px;font-size:12px;text-align:center;color:#ff8a7a}
    .net-msg.ok{color:#9be36b}
    .net-filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .net-filters select{width:auto;flex:1;min-width:120px}
    .net-table{max-height:52vh;overflow:auto;border:1px solid #2a3056;border-radius:10px;box-shadow:inset 0 0 0 1px rgba(72,224,208,.08)}
    .net-table table{width:100%;border-collapse:collapse;font-size:13px}
    .net-table th,.net-table td{padding:8px 10px;text-align:left;border-bottom:1px solid #1c2140;white-space:nowrap}
    .net-table th{position:sticky;top:0;background:linear-gradient(180deg,#222a52,#171b34);color:#a8fff4;font-size:11px;letter-spacing:1px;text-transform:uppercase}
    .net-table tr:nth-child(even) td{background:rgba(255,255,255,.025)}
    .net-table tbody tr:hover td{background:rgba(72,224,208,.07)}
    .net-table .rank{color:#ffd479;font-weight:900;text-shadow:0 0 8px rgba(255,212,121,.4)}
    .net-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(8px);z-index:70;background:linear-gradient(180deg,#1f2548,#141833);border:1px solid #3a4a8a;color:#fff;padding:11px 18px;border-radius:10px;font:700 13px system-ui;opacity:0;transition:.25s;box-shadow:0 8px 30px rgba(0,0,0,.5),0 0 16px rgba(72,224,208,.2)}
    .net-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
  ` }));
}

let toastEl = null, toastTimer = null;
function toast(msg, ms = 2200) {
  ensureStyles();
  if (!toastEl) { toastEl = $('div', { class: 'net-toast' }); document.body.appendChild(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), ms);
}

function closeModal() { const m = document.querySelector('.net-modal'); if (m) m.remove(); }
export function isModalOpen() { return !!document.querySelector('.net-modal'); }

// Backdrop click-to-close that ignores text-selection drags: only close when the press
// AND release both land on the dim backdrop (not when a drag started inside an <input>
// and ended on the backdrop — that used to close the modal while selecting text).
function bindBackdropClose(modal) {
  let downOnSelf = false;
  modal.addEventListener('mousedown', (e) => { downOnSelf = (e.target === modal); });
  modal.addEventListener('click', (e) => { if (e.target === modal && downOnSelf) closeModal(); downOnSelf = false; });
  return modal;
}

// ---- account bar ----------------------------------------------------------
let bar = null;
export function mountNetBar() {
  ensureStyles();
  // The corner bar is hidden by default now — login / 多人連線 / 排行榜 / 帳號 live in the
  // centred title menu and the in-town Esc menu instead (a deliberate UX move off the tiny
  // bottom-right chip). We still keep the element + onSessionExpired wiring for the toast path.
  if (!bar) { bar = $('div', { id: 'net-bar', style: 'display:none' }); document.body.appendChild(bar); }
  Net.onSessionExpired = () => { RT.close(); renderBar(); toast('雲端登入已過期，請重新登入'); };   // a background 401 also tears down the realtime socket (match the explicit-logout path)
  renderBar();
}
function renderBar() {
  if (!bar) return;
  bar.innerHTML = '';
  if (Net.isLoggedIn()) {
    const u = Net.currentUser() || {};
    bar.appendChild($('button', { class: 'who', text: '☁ ' + (u.username || '已登入'), title: '雲端存檔已啟用', onclick: openAuth }));
    bar.appendChild($('button', { text: '👥 好友 / 連線', onclick: () => openSocial() }));
    if (Net.isAdmin()) bar.appendChild($('button', { text: '🛠 管理', title: '管理者主控台', onclick: openAdmin }));
    bar.appendChild($('button', { text: '登出', onclick: () => { RT.close(); Net.logout(); renderBar(); toast('已登出（進度仍保留在本機）'); } }));
  } else {
    bar.appendChild($('button', { text: '☁ 登入 / 註冊', onclick: openAuth }));
    bar.appendChild($('button', { text: '👥 好友 / 連線', onclick: () => openSocial() }));
  }
  bar.appendChild($('button', { text: '🏆 排行榜', onclick: openLeaderboard }));
}

export { toast as netToast };

// ---- account panel (logged-in) --------------------------------------------
// #4 fix: the 帳號 entry used to just reopen the leaderboard. Now it shows real account info.
export function openAccountPanel() {
  ensureStyles(); closeModal();
  const u = Net.currentUser() || {};
  const line = (k, v, col) => $('div', { style: 'display:flex;justify-content:space-between;gap:12px;padding:9px 2px;border-bottom:1px solid #1c2140' }, [
    $('span', { style: 'color:#8ea0d8;font-size:12px', text: k }),
    $('span', { style: 'color:' + (col || '#fff') + ';font-weight:800', text: v }),
  ]);
  const info = $('div', {}, [
    line('帳號名稱', u.username || '—', '#ffd479'),
    line('雲端存檔', '自動同步中', '#9be36b'),
    Net.isAdmin() ? line('權限', '管理員 🛠', '#a8fff4') : null,
    line('好友代碼', u.username || '—'),
  ]);
  const card = $('div', { class: 'net-card' }, [
    $('h2', { text: '☁ 雲端帳號' }),
    info,
    $('div', { class: 'net-row' }, [
      $('button', { class: 'net-ghost', text: '🏆 排行榜', onclick: () => { closeModal(); openLeaderboard(); } }),
      Net.isAdmin() ? $('button', { class: 'net-ghost', text: '🛠 管理', onclick: () => { closeModal(); openAdmin(); } }) : null,
    ].filter(Boolean)),
    $('div', { class: 'net-row' }, [
      $('button', { class: 'net-warn', text: '登出', onclick: () => { RT.close(); Net.logout(); renderBar(); closeModal(); toast('已登出（進度仍保留在本機）'); } }),
      $('button', { class: 'net-primary', text: '關閉', onclick: closeModal }),
    ]),
  ]);
  const modal = bindBackdropClose($('div', { class: 'net-modal' }, [card]));
  document.body.appendChild(modal);
}

// ---- auth modal -----------------------------------------------------------
export function openAuth() {
  ensureStyles(); closeModal();
  if (Net.isLoggedIn()) { openAccountPanel(); return; }   // logged in → account info (not the leaderboard)
  let tab = 'login';
  const user = $('input', { type: 'text', autocomplete: 'username', placeholder: '3–24 字元，英數與底線' });
  const pass = $('input', { type: 'password', autocomplete: 'current-password', placeholder: '至少 6 字元' });
  const email = $('input', { type: 'email', autocomplete: 'email', placeholder: '（選填，用於找回帳號）' });
  const emailWrap = $('div', {}, [$('label', { text: '電子郵件' }), email]);
  const msg = $('div', { class: 'net-msg' });
  const tabLogin = $('button', { class: 'on', text: '登入' });
  const tabReg = $('button', { text: '註冊' });
  const submit = $('button', { class: 'net-primary', text: '登入' });

  const setTab = (t) => {
    tab = t;
    tabLogin.classList.toggle('on', t === 'login');
    tabReg.classList.toggle('on', t === 'register');
    emailWrap.style.display = t === 'register' ? '' : 'none';
    submit.textContent = t === 'login' ? '登入' : '建立帳號';
    pass.setAttribute('autocomplete', t === 'login' ? 'current-password' : 'new-password');
    msg.textContent = '';
  };
  tabLogin.addEventListener('click', () => setTab('login'));
  tabReg.addEventListener('click', () => setTab('register'));

  const doSubmit = async () => {
    if (inRun()) { msg.textContent = '請先結束本局再登入（避免覆蓋進度）'; return; }   // logging in swaps META — don't do it mid-run
    const u = user.value.trim(), p = pass.value;
    if (!u || !p) { msg.textContent = '請填寫帳號與密碼'; return; }
    submit.disabled = true; msg.className = 'net-msg'; msg.textContent = '連線中…';
    try {
      if (tab === 'register') await Net.register(u, p, email.value.trim());
      else await Net.login(u, p);
      msg.className = 'net-msg ok'; msg.textContent = '成功！同步雲端存檔中…';
      const s = await syncFromCloud();
      renderBar();
      RT.ensure();   // open the realtime connection so friends see you online
      toast(s.pulled ? '已載入雲端存檔' : '帳號已建立，進度已上傳雲端');
      closeModal();
    } catch (e) {
      submit.disabled = false; msg.className = 'net-msg';
      msg.textContent = e && e.message ? '失敗：' + e.message : '連線失敗（伺服器未啟動？）';
    }
  };
  submit.addEventListener('click', doSubmit);
  pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') doSubmit(); });

  const card = $('div', { class: 'net-card' }, [
    $('h2', { text: '魂晶獵手 · 雲端帳號' }),
    $('div', { class: 'net-tabs' }, [tabLogin, tabReg]),
    $('label', { text: '帳號' }), user,
    $('label', { text: '密碼' }), pass,
    emailWrap,
    msg,
    $('div', { class: 'net-row' }, [
      submit,
      $('button', { class: 'net-ghost', text: '訪客遊玩', onclick: () => { closeModal(); toast('以訪客模式遊玩（進度僅存本機）'); } }),
    ]),
  ]);
  setTab('login');
  const modal = bindBackdropClose($('div', { class: 'net-modal' }, [card]));
  document.body.appendChild(modal);
  setTimeout(() => user.focus(), 30);
}

// ---- leaderboard modal ----------------------------------------------------
const fmtTime = (s) => Math.floor((s || 0) / 60) + ':' + String(Math.floor((s || 0) % 60)).padStart(2, '0');

export function openLeaderboard() {
  ensureStyles(); closeModal();
  const biome = $('select', {}, Object.keys(BIOME_LABELS).map((k) => $('option', { value: k, text: BIOME_LABELS[k] })));
  const diff = $('select', {}, ['', '1', '2', '3', '4', '5'].map((d) => $('option', { value: d, text: d ? '難度 ' + d : '全難度' })));
  const period = $('select', {}, [['', '歷來'], ['week', '本週'], ['day', '今日']].map(([v, t]) => $('option', { value: v, text: t })));
  const body = $('div', { class: 'net-table' });
  const msg = $('div', { class: 'net-msg' });

  const load = async () => {
    body.innerHTML = ''; msg.className = 'net-msg'; msg.textContent = '載入中…';
    try {
      const r = await Net.leaderboard({ biome: biome.value, difficulty: diff.value, period: period.value, limit: 50 });
      const rows = (r && r.rows) || [];
      msg.textContent = rows.length ? '' : '尚無紀錄 — 成為第一個上榜的獵手！';
      const table = $('table', {}, [
        $('thead', {}, [$('tr', {}, ['#', '獵手', '分數', '難度', '生態', '層', '擊殺', '時間', ''].map((h) => $('th', { text: h })))]),
      ]);
      const tb = $('tbody');
      rows.forEach((row, i) => {
        const tags = (row.cleared ? '通關 ' : '') + (row.reaper ? '☠斬死神' : '');
        tb.appendChild($('tr', {}, [
          $('td', { class: 'rank', text: '#' + (i + 1) }),
          $('td', { text: row.username || '—' }),
          $('td', { text: String(row.score) }),
          $('td', { text: 'D' + (row.difficulty || 1) }),
          $('td', { text: BIOME_LABELS[row.biome] || row.biome || '—' }),
          $('td', { text: String(row.stage || 0) }),
          $('td', { text: String(row.kills || 0) }),
          $('td', { text: fmtTime(row.time_s) }),
          $('td', { text: tags }),
        ]));
      });
      table.appendChild(tb); body.appendChild(table);
    } catch (e) {
      msg.textContent = '無法載入排行榜（伺服器未啟動？以訪客模式仍可遊玩）';
    }
  };
  [biome, diff, period].forEach((s) => s.addEventListener('change', load));

  // guest upload: not logged in but just finished a run → let them post it under a self-name
  let guestSection = null;
  if (!Net.isLoggedIn() && lastGuestRun) {
    const nameInp = $('input', { type: 'text', placeholder: '暱稱（把最近一場成績上傳排行榜）', maxlength: 16, style: 'flex:2' });
    const up = $('button', { class: 'net-primary', text: '上傳成績', style: 'flex:1' });
    up.addEventListener('click', async () => {
      const nm = nameInp.value.trim(); if (!nm) { msg.className = 'net-msg'; msg.textContent = '請先輸入暱稱'; return; }
      up.disabled = true;
      try { await Net.postGuestRun({ ...lastGuestRun, name: nm }); clearLastGuestRun(); toast('成績已上傳排行榜！'); if (guestSection) guestSection.remove(); load(); }
      catch (e) { up.disabled = false; msg.className = 'net-msg'; msg.textContent = e && e.message ? '上傳失敗：' + e.message : '上傳失敗（伺服器未啟動？）'; }
    });
    guestSection = $('div', {}, [$('div', { style: 'font-size:12px;color:#9aa3c8;margin-top:6px' }, [document.createTextNode('🎮 訪客模式 — 輸入暱稱即可上傳本機最近一場成績')]), $('div', { class: 'net-row', style: 'margin-top:6px' }, [nameInp, up])]);
  }

  const card = $('div', { class: 'net-card wide' }, [
    $('h2', { text: '🏆 共享排行榜' }),
    $('div', { class: 'net-filters' }, [biome, diff, period]),
    msg, body, guestSection,
    $('div', { class: 'net-row' }, [
      $('button', { class: 'net-ghost', text: '重新整理', onclick: load }),
      $('button', { class: 'net-primary', text: '關閉', onclick: closeModal }),
    ]),
  ]);
  const modal = bindBackdropClose($('div', { class: 'net-modal' }, [card]));
  document.body.appendChild(modal);
  load();
}

// ---- admin dashboard ------------------------------------------------------
const fmtUptime = (s) => { s = Math.floor(s || 0); const h = (s / 3600) | 0, m = ((s % 3600) / 60) | 0; return (h ? h + ' 小時 ' : '') + m + ' 分'; };
const fmtAgo = (ts) => { const d = Math.max(0, Date.now() - (ts || 0)); const m = Math.floor(d / 60000); return m <= 0 ? '剛剛' : (m < 60 ? m + ' 分鐘前' : Math.floor(m / 60) + ' 小時前'); };
const sectionTitle = (t) => $('div', { style: 'font-size:12px;color:#8ea0d8;letter-spacing:1px;margin:14px 0 6px;text-transform:uppercase;font-weight:700', text: t });

const adminBtn = (label, cls, onclick) => $('button', { class: cls, style: 'flex:none;padding:5px 10px;font-size:12px', text: label, onclick });
const tableInto = (el, head, rows) => {
  el.innerHTML = '';
  if (!rows.length) { el.appendChild($('div', { style: 'padding:12px;color:#9aa3c8;text-align:center', text: '（無資料）' })); return; }
  const tb = $('tbody'); rows.forEach((r) => tb.appendChild($('tr', {}, r)));
  el.appendChild($('table', {}, [$('thead', {}, [$('tr', {}, head.map((h) => $('th', { text: h })))]), tb]));
};
let adminTab = 'overview';

export function openAdmin() {
  ensureStyles(); closeModal();
  if (!Net.isAdmin()) { toast('需要管理員權限'); return; }
  const status = $('div', { class: 'net-msg ok' });
  const body = $('div', { style: 'min-height:170px' });
  const msg = $('div', { class: 'net-msg' });
  const setMsg = (t, ok) => { msg.textContent = t || ''; msg.className = 'net-msg' + (ok ? ' ok' : ''); };

  const tabDefs = [['overview', '總覽'], ['players', '玩家'], ['runs', '對局'], ['cast', '廣播']];
  const tabBtns = tabDefs.map(([id, label]) => $('button', { text: label, onclick: () => { adminTab = id; syncTabs(); render(); } }));
  const syncTabs = () => tabBtns.forEach((b, i) => b.classList.toggle('on', tabDefs[i][0] === adminTab));

  const refreshStatus = async () => {
    try { const r = await Net.adminOverview(); status.className = 'net-msg ok'; status.textContent = `🟢 線上 ${r.totals.users} 人 · ${r.totals.conns} 連線 · 訪客 ${r.totals.guests || 0} · ${r.totals.rooms} 房間 · 已運行 ${fmtUptime(r.health.uptime)}`; return r; }
    catch (e) { status.className = 'net-msg'; status.textContent = (e && e.status === 403) ? '需要管理員權限（在 server/.env 的 ADMIN_USERS 加入你的帳號並重啟）' : '無法載入（伺服器未啟動？）'; return null; }
  };

  async function render() {
    setMsg('');
    body.innerHTML = '';
    if (adminTab === 'overview') {
      const r = await refreshStatus(); if (!r) return;
      const online = $('div', { class: 'net-table' }), rooms = $('div', { class: 'net-table' });
      tableInto(online, ['玩家', 'UID', '連線', '房間'], (r.online || []).map((u) => [$('td', { text: u.username }), $('td', { text: '#' + u.uid }), $('td', { text: String(u.conns) }), $('td', { text: (u.rooms && u.rooms.join(', ')) || '—' })]));
      tableInto(rooms, ['房號', '狀態', '人數', '成員'], (r.rooms || []).map((rm) => [$('td', { class: 'rank', text: rm.code }), $('td', { text: rm.started ? (rm.runEnded ? '已結束' : '遊戲中') : '大廳' }), $('td', { text: String((rm.members || []).length) }), $('td', { text: (rm.members || []).map((m) => m.username + (m.host ? '♛' : '') + (m.spectator ? '(觀)' : '') + (m.disconnected ? '⚠' : '')).join('、') || '—' })]));
      body.append(sectionTitle('線上玩家'), online, sectionTitle('房間'), rooms);
    } else if (adminTab === 'players') {
      const r = await refreshStatus(); if (!r) return;
      const online = $('div', { class: 'net-table' });
      tableInto(online, ['玩家', 'UID', 'IP', '操作'], (r.online || []).map((u) => [
        $('td', { text: u.username }), $('td', { text: '#' + u.uid }), $('td', { text: u.ip || '—' }),
        $('td', { style: 'display:flex;gap:4px' }, [
          adminBtn('踢出', 'net-ghost', async () => { try { await Net.adminKick(u.uid); toast('已踢出 ' + u.username); render(); } catch (e) { setMsg('踢出失敗'); } }),
          adminBtn('封帳號', 'net-warn', async () => { try { await Net.adminBan('user', u.username, 'admin'); toast('已封鎖帳號 ' + u.username); render(); } catch (e) { setMsg('封鎖失敗'); } }),
          u.ip ? adminBtn('封IP', 'net-warn', async () => { try { await Net.adminBan('ip', u.ip, 'admin'); toast('已封鎖 IP ' + u.ip); render(); } catch (e) { setMsg('封鎖失敗'); } }) : null,
        ]),
      ]));
      const rooms = $('div', { class: 'net-table' });
      tableInto(rooms, ['房號', '狀態', '人數', ''], (r.rooms || []).map((rm) => [$('td', { class: 'rank', text: rm.code }), $('td', { text: rm.started ? (rm.runEnded ? '已結束' : '遊戲中') : '大廳' }), $('td', { text: String((rm.members || []).length) }), $('td', {}, [adminBtn('關閉', 'net-warn', async () => { try { await Net.adminCloseRoom(rm.code); toast('已關閉 ' + rm.code); render(); } catch (e) { setMsg('關閉失敗'); } })])]));
      const banTable = $('div', { class: 'net-table' });
      try { const bl = (await Net.adminBans()).bans || []; tableInto(banTable, ['類型', '對象', '原因', ''], bl.map((b) => [$('td', { text: b.kind === 'user' ? '帳號' : 'IP' }), $('td', { text: b.value }), $('td', { text: b.reason || '—' }), $('td', {}, [adminBtn('解除', 'net-ghost', async () => { try { await Net.adminUnban(b.kind, b.value); toast('已解除封鎖'); render(); } catch (e) { setMsg('解除失敗'); } })])])); } catch (e) { /* */ }
      const kindSel = $('select', { style: 'flex:none;width:88px' }, [$('option', { value: 'user', text: '帳號' }), $('option', { value: 'ip', text: 'IP' })]);
      const valInp = $('input', { type: 'text', placeholder: '帳號或 IP', style: 'flex:1' });
      const reasonInp = $('input', { type: 'text', placeholder: '原因（選填）', style: 'flex:1' });
      const banRow = $('div', { class: 'net-row', style: 'margin-top:8px' }, [kindSel, valInp, reasonInp, $('button', { class: 'net-warn', style: 'flex:none;padding:0 14px', text: '封鎖', onclick: async () => { const v = valInp.value.trim(); if (!v) return setMsg('請輸入對象'); try { await Net.adminBan(kindSel.value, v, reasonInp.value.trim()); toast('已封鎖 ' + v); valInp.value = ''; reasonInp.value = ''; render(); } catch (e) { setMsg('封鎖失敗'); } } })]);
      // not-logged-in guests: they hold no live connection (single-player is offline / the WS needs a
      // login), so we surface the only footprint the server can see — guests who recently uploaded a
      // score — by IP, so they can still be banned.
      const guests = $('div', { class: 'net-table' });
      tableInto(guests, ['訪客', 'IP', '最後活動', '次數', '操作'], (r.guests || []).map((g) => [
        $('td', { text: g.name || '訪客' }), $('td', { text: g.ip || '—' }), $('td', { text: fmtAgo(g.lastSeen) }), $('td', { text: String(g.hits || 0) }),
        $('td', {}, [g.banned
          ? adminBtn('解除', 'net-ghost', async () => { try { await Net.adminUnban('ip', g.ip); toast('已解除 ' + g.ip); render(); } catch (e) { setMsg('解除失敗'); } })
          : adminBtn('封IP', 'net-warn', async () => { try { await Net.adminBan('ip', g.ip, 'guest'); toast('已封鎖 IP ' + g.ip); render(); } catch (e) { setMsg('封鎖失敗'); } })]),
      ]));
      const guestHint = $('div', { style: 'font-size:10px;color:#778;margin:2px 2px 0', text: '訪客無常駐連線（單人離線／連線需登入），此處顯示近 15 分鐘曾上傳成績的未登入玩家。' });
      body.append(sectionTitle('線上玩家'), online, sectionTitle('未登入訪客（近期活躍）'), guests, guestHint, sectionTitle('房間'), rooms, sectionTitle('封鎖名單'), banTable, banRow);
    } else if (adminTab === 'runs') {
      const runsTable = $('div', { class: 'net-table' });
      try {
        const rows = (await Net.adminRuns(60)).rows || [];
        tableInto(runsTable, ['玩家', '分數', '難度', '生態', '層', '擊殺', '時間', ''], rows.map((r) => [
          $('td', { text: (r.username || '—') + (r.guest ? '(訪)' : '') }), $('td', { text: String(r.score) }), $('td', { text: 'D' + (r.difficulty || 1) }),
          $('td', { text: BIOME_LABELS[r.biome] || r.biome || '—' }), $('td', { text: String(r.stage || 0) }), $('td', { text: String(r.kills || 0) }), $('td', { text: fmtTime(r.time_s) }),
          $('td', {}, [adminBtn('刪除', 'net-warn', async () => { try { await Net.adminDeleteRun(r.id); toast('已刪除該紀錄'); render(); } catch (e) { setMsg('刪除失敗'); } })]),
        ]));
      } catch (e) { setMsg('無法載入對局'); }
      body.append(sectionTitle('近期對局（刪除作弊 / 垃圾紀錄）'), runsTable);
    } else {
      const ta = $('input', { type: 'text', placeholder: '輸入要廣播給所有線上玩家的訊息', style: 'width:100%;margin-top:6px' });
      ta.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendBtn.click(); });
      const sendBtn = $('button', { class: 'net-primary', text: '📢 發送廣播', onclick: async () => { const t = ta.value.trim(); if (!t) return setMsg('請輸入內容'); try { const r = await Net.adminBroadcast(t); toast('已廣播給 ' + (r.sent || 0) + ' 個連線'); ta.value = ''; setMsg('已送出', true); } catch (e) { setMsg('廣播失敗'); } } });
      body.append(sectionTitle('全服廣播'), ta, $('div', { class: 'net-row' }, [sendBtn]));
    }
  }

  const card = $('div', { class: 'net-card wide' }, [
    $('h2', { text: '🛠 管理者主控台' }), status,
    $('div', { class: 'net-tabs' }, tabBtns),
    body, msg,
    $('div', { class: 'net-row' }, [$('button', { class: 'net-ghost', text: '重新整理', onclick: render }), $('button', { class: 'net-primary', text: '關閉', onclick: closeModal })]),
  ]);
  const modal = bindBackdropClose($('div', { class: 'net-modal' }, [card]));
  document.body.appendChild(modal);
  syncTabs(); render();
  const timer = setInterval(() => { if (!document.body.contains(modal)) { clearInterval(timer); return; } if (adminTab === 'overview' || adminTab === 'players') render(); }, 5000);   // live auto-refresh
}

// Boot hook: mount the bar and, if a token is already stored, refresh the cloud save.
export function initNet() {
  mountNetBar();
  initSocial();   // friends/lobby UI + invite popups + realtime connect when logged in
  RT.on('broadcast', (m) => toast('📢 公告：' + (m && m.text ? m.text : ''), 6000));   // admin broadcast → banner for every connected client
  // boot: push-up only — the player hasn't picked a slot yet and the cloud blob is account-wide,
  // so a pull here could overwrite the active slot. The full pull happens on slot enter (title.enterSlot).
  if (Net.isLoggedIn()) {
    syncFromCloud({ pushOnly: true }).then(() => renderBar()).catch(() => {});
    Net.refreshMe().then(() => renderBar()).catch(() => {});   // refresh the admin flag for a returning session
  }
}
