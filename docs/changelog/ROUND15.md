# Round 15 — account UX overhaul: centred title menu · in-town Esc menu · login input fixes

A focused pass on the cloud-account / multiplayer / leaderboard UX. The entry points moved off
the tiny bottom-right chip into the centre of the screen, two login bugs were fixed, and the
server now returns real Chinese error messages.

## Login input fixes (#1)
- **Typing was swallowed.** `engine/input.js` `keydown`/`keyup` ran `preventDefault()` on
  WASD/Space/etc. for *every* event, so those keys never reached a focused `<input>` (and worse,
  drove the hidden game behind the overlay). Added `typingInField(e)` — when the event target is
  an `INPUT`/`TEXTAREA`/`SELECT`/`contenteditable`, the handler returns early (no preventDefault,
  no key registration). Verified: W/A/S/D/Space in the login field → `defaultPrevented:false` and
  the game captured none of them.
- **Selecting text closed the modal.** The backdrop close fired on any `click` whose target was
  the dim `.net-modal` — a text-selection drag that started in an `<input>` and released on the
  backdrop counted. `net/ui.js bindBackdropClose()` now only closes when *both* the mousedown and
  the click land on the backdrop. Verified: drag-from-input keeps the modal open; a genuine
  backdrop click still closes it. Applied to all modals (auth / leaderboard / admin).

## Real Chinese error messages (#2)
`server/src/server.js` returned `'invalid input'` / `'bad username or password'` / `'… already
taken'`. Added `zodMsg(err)` mapping the first zod issue to a human message and replaced the
auth error strings:
- 帳號至少需要 3 個字元 · 帳號最多 24 個字元 · 帳號只能使用英文字母、數字與底線
- 密碼至少需要 6 個字元 · 密碼太長(…72 位元組) · 電子郵件格式不正確
- 此帳號或電子郵件已被註冊 · 帳號或密碼錯誤 · 請輸入帳號與密碼
Smoke tests +3 (now **51/51**) asserting the responses contain the Chinese reason.

## Centred main-screen menu (#3, title)
`scenes/title.js` replaced the old 開始遊戲/設定 stack with a centred menu: two big buttons
**🗡 單人遊戲** / **🌐 多人連線** plus a row **🏆 排行榜 · ☁ 登入/註冊(帳號) · ⚙ 設定**.
- 單人遊戲 → save-slot picker (unchanged single-player flow); Space still quick-starts the last slot.
- 多人連線 → `openSocial()` if logged in, else `openAuth()` + a 「需要先登入」 toast (multiplayer
  needs an account for the realtime gateway).
- The account button label reflects login state (username when signed in).
- A `isModalOpen()` guard freezes the title behind any DOM overlay (so Space/keys don't leak through).

## In-town Esc menu (#3, hub)
`scenes/hub.js`: Esc in the town now opens a small **option menu first** (繼續遊戲 · ☁ 帳號 ·
👥 多人連線 · 🏆 排行榜 · [🛠 管理 if admin] · ⚙ 設定 · 🏠 返回主畫面); picking an option opens
its page. Net options open the centred DOM overlays; 設定 opens the canvas settings; 返回主畫面
saves + returns to title. The town freezes (`isModalOpen()` guard) while a net overlay is up.

## Account panel ≠ leaderboard (#4)
The 帳號 entry used to just reopen the leaderboard when logged in. `net/ui.js openAccountPanel()`
is a new distinct panel — **☁ 雲端帳號** showing 帳號名稱 / 雲端存檔狀態 / 好友代碼 (+ 權限 for
admins) with 登出 / 排行榜 / [管理] buttons. `openAuth()` routes to it when logged in.

## Co-op page polish (`net/social.js`)
Beautified the 多人連線 (好友 / 房間 / 大廳) overlay to match the centred title/account look:
- Header is now **🌐 多人連線** + a `CO-OP · 好友與即時合作` subtitle, with the same top accent bar
  (`.sl-card::before`) as the other cards; tabs gained icons (👥 好友 / 🚪 連線房間).
- Section headers (`.sl-sec h3`) get a cyan left-accent + emoji (➕加好友 · 📩收到的邀請 · 🤝好友 ·
  🎫房號 · 🧑‍🤝‍🧑隊員 · 🎮你的角色 · ⚔關卡設定 · ✉邀請線上好友).
- Member rows now use **pill badges** (`.sl-badge` host/ready/idle/spec/char) + an online dot
  (pulsing when connected, ⚠斷線 styling when dropped) instead of plain coloured text.
- Room code block is bigger with an animated shine; buttons lift on hover; list rows glow + slide
  on hover.
- **Fixes carried over:** the stale "請先在右下角登入" hint (the corner bar is gone) → "請先登入
  雲端帳號"; and the same drag-safe `bindBackdropClose` so selecting text in the add-friend /
  room-code fields no longer closes the modal.
- Verified in preview (680×820): both tabs render centred (1280px window → equal 360px gutters),
  6 badges in a 3-member room, room-code shine, 0 console errors.

## Corner bar retired
The bottom-right `#net-bar` is hidden by default (`display:none`) — its functions now live in the
centred title menu and the in-town Esc menu. `initNet` still wires the broadcast toast +
`onSessionExpired`.

## Verification
- Server: `smoke.mjs` **51/51**, `social.smoke.mjs` 65/65.
- Browser (preview): boot clean (0 console errors); title menu structure + render screenshot;
  login keydown guard (defaultPrevented:false, game-capture none); drag-vs-click backdrop close;
  account panel structure (title ☁ 雲端帳號, not the board); every hub Esc option exercised
  (account/multi/leaderboard open a modal, settings opens settings + closes the menu, resume
  closes, 返回主畫面 runs saveMeta+setScene); hub Esc menu render screenshot via `/__shot`.
