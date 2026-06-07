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
    #net-bar{position:fixed;right:12px;bottom:12px;z-index:50;display:flex;gap:6px;font:600 12px/1 system-ui,sans-serif}
    #net-bar button{background:rgba(22,26,48,.82);color:#cdd3f0;border:1px solid #2a3052;border-radius:7px;padding:6px 10px;cursor:pointer;backdrop-filter:blur(3px)}
    #net-bar button:hover{background:rgba(40,48,90,.92);color:#fff}
    #net-bar .who{color:#ffd479}
    .net-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(7,9,18,.72);font:14px/1.4 system-ui,sans-serif}
    .net-card{background:#12152a;border:1px solid #2a3052;border-radius:12px;padding:22px;width:min(92vw,420px);color:#dfe3f5;box-shadow:0 18px 60px rgba(0,0,0,.6)}
    .net-card.wide{width:min(94vw,640px)}
    .net-card h2{margin:0 0 14px;font-size:20px;color:#a8fff4;text-align:center}
    .net-tabs{display:flex;gap:8px;margin-bottom:14px}
    .net-tabs button{flex:1;padding:8px;border-radius:8px;border:1px solid #2a3052;background:#171b34;color:#9aa3c8;cursor:pointer}
    .net-tabs button.on{background:#27306a;color:#fff}
    .net-card label{display:block;margin:10px 0 4px;color:#9aa3c8;font-size:12px}
    .net-card input,.net-card select{width:100%;box-sizing:border-box;padding:9px 10px;border-radius:8px;border:1px solid #2a3052;background:#0e1124;color:#fff;font-size:14px}
    .net-row{display:flex;gap:8px;margin-top:16px}
    .net-row button{flex:1;padding:10px;border-radius:8px;border:0;cursor:pointer;font-weight:700}
    .net-primary{background:#48e0d0;color:#062a27}
    .net-primary:hover{background:#6cf0e2}
    .net-ghost{background:#1b2140;color:#cdd3f0}
    .net-ghost:hover{background:#27305a}
    .net-msg{min-height:18px;margin-top:10px;font-size:12px;text-align:center;color:#ff7b6b}
    .net-msg.ok{color:#9be36b}
    .net-filters{display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap}
    .net-filters select{width:auto;flex:1;min-width:120px}
    .net-table{max-height:52vh;overflow:auto;border:1px solid #222746;border-radius:8px}
    .net-table table{width:100%;border-collapse:collapse;font-size:13px}
    .net-table th,.net-table td{padding:7px 9px;text-align:left;border-bottom:1px solid #1c2140;white-space:nowrap}
    .net-table th{position:sticky;top:0;background:#171b34;color:#9aa3c8}
    .net-table tr:nth-child(even) td{background:rgba(255,255,255,.02)}
    .net-table .rank{color:#ffd479;font-weight:800}
    .net-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:70;background:#171b34;border:1px solid #2a3052;color:#fff;padding:10px 16px;border-radius:9px;font:600 13px system-ui;opacity:0;transition:opacity .2s}
    .net-toast.show{opacity:1}
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

// ---- account bar ----------------------------------------------------------
let bar = null;
export function mountNetBar() {
  ensureStyles();
  if (!bar) { bar = $('div', { id: 'net-bar' }); document.body.appendChild(bar); }
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
    bar.appendChild($('button', { text: '登出', onclick: () => { RT.close(); Net.logout(); renderBar(); toast('已登出（進度仍保留在本機）'); } }));
  } else {
    bar.appendChild($('button', { text: '☁ 登入 / 註冊', onclick: openAuth }));
    bar.appendChild($('button', { text: '👥 好友 / 連線', onclick: () => openSocial() }));
  }
  bar.appendChild($('button', { text: '🏆 排行榜', onclick: openLeaderboard }));
}

// ---- auth modal -----------------------------------------------------------
export function openAuth() {
  ensureStyles(); closeModal();
  if (Net.isLoggedIn()) { openLeaderboard(); return; }   // already in → just show the board
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
  const modal = $('div', { class: 'net-modal', onclick: (e) => { if (e.target === modal) closeModal(); } }, [card]);
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
  const modal = $('div', { class: 'net-modal', onclick: (e) => { if (e.target === modal) closeModal(); } }, [card]);
  document.body.appendChild(modal);
  load();
}

// Boot hook: mount the bar and, if a token is already stored, refresh the cloud save.
export function initNet() {
  mountNetBar();
  initSocial();   // friends/lobby UI + invite popups + realtime connect when logged in
  // boot: push-up only — the player hasn't picked a slot yet and the cloud blob is account-wide,
  // so a pull here could overwrite the active slot. The full pull happens on slot enter (title.enterSlot).
  if (Net.isLoggedIn()) { syncFromCloud({ pushOnly: true }).then(() => renderBar()).catch(() => {}); }
}
