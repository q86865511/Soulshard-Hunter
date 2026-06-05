// Tiny WebAudio chiptune engine: procedural SFX + a light looping soundtrack.
// All sound is synthesised — no audio assets needed.

let ctx = null;
let master = null, sfxGain = null, musicGain = null;
let muted = false;
let started = false;
const vol = { master: 0.9, sfx: 0.75, music: 0.5 };
let musicPlaying = false;

function ensure() {
  if (ctx) return ctx;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = muted ? 0 : vol.master; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx; sfxGain.connect(master);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.0; musicGain.connect(master);
  } catch (e) { ctx = null; }
  return ctx;
}

const noteFreq = (semi, base = 440) => base * Math.pow(2, semi / 12);

function tone(freq, dur, { type = 'square', gain = 0.2, attack = 0.005, decay = null, to = null, glideT = null, target = null } = {}) {
  if (!ensure() || muted) return;
  const tgt = target || sfxGain;
  if (!tgt || !isFinite(freq)) return;            // resolve target AFTER ensure() built the graph
  try {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to != null) o.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + (glideT ?? dur));
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (decay ?? dur));
    o.connect(g); g.connect(tgt);
    o.start(t); o.stop(t + (decay ?? dur) + 0.02);
  } catch (e) { /* never let audio crash the game */ }
}

function noise(dur, { gain = 0.2, type = 'highpass', freq = 1000, q = 1, target = null } = {}) {
  if (!ensure() || muted) return;
  const tgt = target || sfxGain;
  if (!tgt) return;
  try {
    const t = ctx.currentTime;
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(tgt);
    src.start(t); src.stop(t + dur + 0.02);
  } catch (e) { /* never let audio crash the game */ }
}

// ---- SFX bank --------------------------------------------------------------
const BANK = {
  shoot() { tone(620 + Math.random() * 60, 0.09, { type: 'square', gain: 0.10, to: 360 }); },
  shootBig() { tone(300, 0.16, { type: 'sawtooth', gain: 0.16, to: 140 }); noise(0.1, { gain: 0.08, freq: 800 }); },
  hit() { noise(0.06, { gain: 0.12, freq: 2600, type: 'highpass' }); tone(420, 0.05, { type: 'square', gain: 0.05, to: 260 }); },
  crit() { noise(0.08, { gain: 0.16, freq: 3200 }); tone(900, 0.1, { type: 'square', gain: 0.1, to: 500 }); },
  kill() { tone(280, 0.18, { type: 'triangle', gain: 0.14, to: 90 }); noise(0.12, { gain: 0.08, freq: 1200 }); },
  hurt() { tone(220, 0.22, { type: 'sawtooth', gain: 0.18, to: 70 }); noise(0.12, { gain: 0.1, freq: 500, type: 'lowpass' }); },
  coin() { tone(880, 0.06, { type: 'square', gain: 0.08 }); setTimeout(() => tone(1320, 0.07, { type: 'square', gain: 0.08 }), 55); },
  shard() { tone(1200, 0.1, { type: 'sine', gain: 0.1, to: 1700 }); },
  heart() { tone(520, 0.1, { type: 'sine', gain: 0.12, to: 780 }); },
  pickup() { tone(660, 0.07, { type: 'triangle', gain: 0.1, to: 990 }); },
  levelup() { [0, 4, 7, 12].forEach((s, i) => setTimeout(() => tone(noteFreq(s, 523), 0.18, { type: 'triangle', gain: 0.14 }), i * 70)); },
  dash() { tone(300, 0.16, { type: 'sine', gain: 0.1, to: 760 }); noise(0.12, { gain: 0.06, freq: 1800 }); },
  buy() { tone(700, 0.07, { type: 'square', gain: 0.1 }); setTimeout(() => tone(1050, 0.1, { type: 'square', gain: 0.1 }), 60); },
  equip() { [0, 5, 9].forEach((s, i) => setTimeout(() => tone(noteFreq(s, 587), 0.14, { type: 'square', gain: 0.1 }), i * 60)); },
  boss() { tone(70, 1.1, { type: 'sawtooth', gain: 0.22, to: 48 }); noise(0.9, { gain: 0.12, freq: 240, type: 'lowpass' }); setTimeout(() => tone(110, 0.6, { type: 'square', gain: 0.12, to: 90 }), 200); },
  portal() { tone(400, 0.3, { type: 'sine', gain: 0.12, to: 900 }); },
  death() { [0, -2, -4, -7].forEach((s, i) => setTimeout(() => tone(noteFreq(s, 330), 0.3, { type: 'sawtooth', gain: 0.16 }), i * 130)); },
  uiMove() { tone(520, 0.04, { type: 'square', gain: 0.05 }); },
  uiClick() { tone(760, 0.06, { type: 'square', gain: 0.08, to: 920 }); },
  explosion() { noise(0.35, { gain: 0.22, freq: 400, type: 'lowpass' }); tone(120, 0.3, { type: 'sawtooth', gain: 0.14, to: 50 }); },
};

let lastHit = 0;
export const Sfx = {
  play(name) { const f = BANK[name]; if (f) try { f(); } catch (e) { /* ignore */ } },
  hit() { const now = performance.now(); if (now - lastHit > 28) { lastHit = now; try { BANK.hit(); } catch (e) { /* ignore */ } } },
};

// ---- music ----------------------------------------------------------------
// A small generative engine: bass + chord pad + arpeggio + sparse lead + drums,
// over a chord-root progression. Map music is tinted per biome; a hero tint and
// a per-start lead-seed keep repeated runs from sounding identical.
let musicTimer = null;
let step = 0;
const SCALES = {
  run:  [0, 2, 3, 5, 7, 10],    // natural minor-ish, roomy
  hub:  [0, 2, 4, 7, 9],        // major pentatonic, calm
  boss: [0, 1, 3, 6, 7, 10],    // tense, diminished colour
};
const PROG = {                  // chord-root progression (cycles each 8 steps)
  run:  [0, 5, -2, 3],
  hub:  [0, 4, 5, 2],
  boss: [0, -1, 2, -3, 5, -1],
};
const BASE = { run: 174, hub: 196, boss: 150 };
const TEMPO = { run: 134, hub: 104, boss: 190 };
const BIOME_TINT = { crypt: 0, cavern: 2, frost: 3, inferno: -2, void: 5 };
let mode = 'run';          // high-level state: title/hub/run/miniboss/boss/reaper/victory/death
let procMode = 'run';      // procedural-synth fallback mode: run/hub/boss
let biomeId = 'crypt';     // current biome id (selects the run track)
let biomeTint = 0, heroTint = 0, leadSeed = 0;

function musicStep() {
  if (!ensure() || muted) return;
  const scale = SCALES[procMode] || SCALES.run;
  const prog = PROG[procMode] || PROG.run;
  const base = (BASE[procMode] || 190) * Math.pow(2, (biomeTint + heroTint) / 12);
  const root = prog[Math.floor(step / 8) % prog.length];
  // bass on the beat
  if (step % 4 === 0) tone(noteFreq(root + scale[0] - 12, base), 0.46, { type: 'triangle', gain: 0.11, target: musicGain });
  // chord pad at the top of each half-bar
  if (step % 8 === 0) {
    tone(noteFreq(root + scale[2], base), 0.72, { type: 'sine', gain: 0.05, target: musicGain });
    tone(noteFreq(root + scale[4 % scale.length], base), 0.72, { type: 'sine', gain: 0.04, target: musicGain });
  }
  // arpeggio
  if (step % 2 === 0 || procMode === 'boss') {
    const ai = (step * 2 + leadSeed) % scale.length;
    const oct = step % 8 < 4 ? 0 : 12;
    tone(noteFreq(root + scale[ai] + oct, base * 2), 0.16, { type: 'square', gain: 0.04, target: musicGain });
  }
  // sparse lead melody (not in the calm hub)
  if (step % 4 === 2 && procMode !== 'hub') {
    const li = (Math.floor(step / 2) * 3 + leadSeed * 2) % scale.length;
    tone(noteFreq(root + scale[li] + 12, base * 2), 0.22, { type: 'triangle', gain: 0.05, target: musicGain });
  }
  // drums: soft kick on the beat, boss hat on the off-beat
  if (step % 4 === 0) noise(0.05, { gain: 0.03, freq: 200, type: 'lowpass', target: musicGain });
  if (procMode === 'boss' && step % 2 === 1) noise(0.04, { gain: 0.035, freq: 6000, target: musicGain });
  step = (step + 1) % 32;
}

// ---- streamed soundtrack (recorded MP3s) ----------------------------------
// Real tracks live in assets/music/. They STREAM via HTMLAudio (so the big files
// aren't decoded into RAM) and crossfade on state changes. If a file is missing or
// blocked, we silently fall back to the procedural synth above. Volume/mute are
// driven from Audio.apply() so the settings sliders control both engines.
const MUSIC_DIR = 'assets/music/';
const TRACK_FILES = {
  title:    '標題_Veil of Ashes.mp3',
  hub:      '大廳_Hearthwell Bells.mp3',
  crypt:    '幽影地穴_Cathedral Cinders.mp3',
  cavern:   '水晶洞窟_Granite Thrum.mp3',
  frost:    '霜寒冰原_Chrome Avalanche.mp3',
  inferno:  '熔岩深淵_Molten Brimstone.mp3',
  void:     '虛空裂界_Blackout Comet Keys.mp3',
  miniboss: '小頭目_Brass Sirens.mp3',
  boss:     '生態域主宰_Brass Furnace.mp3',
  reaper:   '死神_Gravewheel Pulse.mp3',
  victory:  '勝利結算_Brass Banquet.mp3',
  death:    '死亡_Piano Blackout.mp3',
};
const NO_LOOP = new Set(['victory', 'death']);   // play once; everything else loops
const failedTracks = new Set();   // PER-TRACK load failures — one bad file must not mute every track
const trackEls = {};
let curTrackKey = null, curTrackEl = null, fadeTimer = null, fadingEl = null;

const musicTargetVol = () => (muted ? 0 : Math.max(0, Math.min(1, vol.music * vol.master)));

function getTrackEl(key) {
  if (trackEls[key]) return trackEls[key];
  const a = document.createElement('audio');   // not `new Audio()` — the module's Audio export shadows the global
  a.preload = 'auto';
  a.loop = !NO_LOOP.has(key);
  a.volume = 0;
  a.addEventListener('error', () => {
    failedTracks.add(key);   // only THIS track falls back to synth
    if (key === curTrackKey && musicPlaying) { curTrackEl = null; curTrackKey = null; startProc(procModeFor(mode)); }   // don't sit in silence — kick the synth now
  });
  // play-once tracks (victory/death) would otherwise end into permanent silence —
  // hand back to the (calm) procedural synth when they finish.
  if (NO_LOOP.has(key)) a.addEventListener('ended', () => {
    if (key === curTrackKey && musicPlaying) { curTrackEl = null; curTrackKey = null; startProc(key === 'death' ? 'hub' : procModeFor(mode)); }
  });
  a.src = encodeURI(MUSIC_DIR + TRACK_FILES[key]);
  trackEls[key] = a;
  return a;
}

function crossfade(prev, next, target, dur = 1000) {
  // if a stopTrack() fade is mid-flight, clearing its timer would orphan that element
  // at full volume — pause it explicitly first.
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; if (fadingEl && fadingEl !== next && fadingEl !== prev) { try { fadingEl.pause(); } catch (e) {} } }
  fadingEl = null;
  const startPrev = prev ? prev.volume : 0;
  let t = 0;
  fadeTimer = setInterval(() => {
    t += 60 / dur; const k = t >= 1 ? 1 : t;
    if (next) next.volume = Math.max(0, Math.min(1, target * k));
    if (prev && prev !== next) prev.volume = Math.max(0, startPrev * (1 - k));
    if (k >= 1) { clearInterval(fadeTimer); fadeTimer = null; if (prev && prev !== next) { try { prev.pause(); } catch (e) {} } }
  }, 60);
}

function playTrack(key) {            // returns true if an MP3 is (now) playing for key
  if (failedTracks.has(key) || !TRACK_FILES[key]) return false;
  if (key === curTrackKey && curTrackEl && !curTrackEl.paused) return true;
  const next = getTrackEl(key);
  if (NO_LOOP.has(key)) { try { next.currentTime = 0; } catch (e) {} }
  next.volume = 0;
  const pr = next.play();
  if (pr && pr.catch) pr.catch(() => {});   // blocked pre-gesture; sticky-activation handles it later
  crossfade(curTrackEl, next, musicTargetVol());
  curTrackEl = next; curTrackKey = key;
  return true;
}

function stopTrack() {
  if (fadeTimer) { clearInterval(fadeTimer); fadeTimer = null; }
  const prev = curTrackEl; curTrackEl = null; curTrackKey = null;
  if (!prev) return;
  fadingEl = prev;   // mark it so a follow-up crossfade pauses it instead of orphaning it at volume
  let v = prev.volume;
  fadeTimer = setInterval(() => { v -= 0.08; prev.volume = Math.max(0, v); if (v <= 0) { clearInterval(fadeTimer); fadeTimer = null; try { prev.pause(); } catch (e) {} if (fadingEl === prev) fadingEl = null; } }, 50);
}

// ---- procedural synth fallback (only if MP3s are unavailable) --------------
function startProc(m) {
  if (!ensure()) return;
  procMode = m; step = 0; musicPlaying = true;
  leadSeed = (leadSeed + 3) % 7;
  if (musicGain) musicGain.gain.linearRampToValueAtTime(muted ? 0 : vol.music, ctx.currentTime + 1.2);
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = setInterval(musicStep, 60000 / (TEMPO[m] || 140) / 2);
}
function stopProc() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  if (musicGain && ctx) musicGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
}
const procModeFor = (m) => (m === 'hub' || m === 'victory') ? 'hub' : (m === 'run') ? 'run' : 'boss';
const resolveKey = (m, biome) => (m === 'run') ? (TRACK_FILES[biome] ? biome : 'crypt') : (TRACK_FILES[m] ? m : 'hub');

export const Music = {
  start(m = 'run') { mode = m; musicPlaying = true; this.apply(); },
  setMode(m) { if (m === mode && musicPlaying) return; mode = m; musicPlaying = true; this.apply(); },
  setBiome(id) { biomeId = id || 'crypt'; biomeTint = BIOME_TINT[id] ?? 0; if (mode === 'run') this.apply(); },
  setHero(id) { let h = 0; for (let i = 0; i < (id || '').length; i++) h = (h + id.charCodeAt(i)) % 12; heroTint = (h % 5) - 2; },
  stop() { musicPlaying = false; stopProc(); stopTrack(); },
  apply() {
    if (!musicPlaying) return;
    const key = resolveKey(mode, biomeId);
    if (playTrack(key)) { stopProc(); return; }   // recorded-track path (per-track fallback handled inside playTrack)
    startProc(procModeFor(mode));                            // synth fallback
  },
  // called on the first user gesture (autoplay unlock) + by the volume/mute UI
  refresh() {
    if (!curTrackEl) return;
    if (muted) { try { curTrackEl.pause(); } catch (e) {} }
    else { curTrackEl.volume = musicTargetVol(); if (curTrackEl.paused && !curTrackEl.ended && musicPlaying) { const pr = curTrackEl.play(); if (pr && pr.catch) pr.catch(() => {}); } }
  },
};

// debug surface for self-testing the soundtrack wiring
export const musicDebug = () => ({ key: curTrackKey, failed: failedTracks.size, playing: musicPlaying, mode, procMode, biomeId, paused: curTrackEl ? curTrackEl.paused : null, src: curTrackEl ? decodeURIComponent(curTrackEl.src.split('/').pop()) : null });

export const Audio = {
  resume() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); started = true; Music.refresh(); },
  isMuted() { return muted; },
  toggleMute() { muted = !muted; this.apply(); return muted; },
  setMuted(b) { muted = b; this.apply(); },
  getVolumes() { return { ...vol, muted }; },
  setVolumes(s) {
    if (s.master != null) vol.master = s.master;
    if (s.sfx != null) vol.sfx = s.sfx;
    if (s.music != null) vol.music = s.music;
    if (s.muted != null) muted = s.muted;
    this.apply();
  },
  apply() {
    // MP3 soundtrack volume / mute (independent of the WebAudio graph)
    if (curTrackEl) {
      if (muted) { try { curTrackEl.pause(); } catch (e) {} }
      else { curTrackEl.volume = Math.max(0, Math.min(1, vol.music * vol.master)); if (curTrackEl.paused && !curTrackEl.ended && musicPlaying) { const pr = curTrackEl.play(); if (pr && pr.catch) pr.catch(() => {}); } }
    }
    if (!ctx) return;
    if (master) master.gain.value = muted ? 0 : vol.master;
    if (sfxGain) sfxGain.gain.value = vol.sfx;
    if (musicGain) musicGain.gain.value = (muted || !musicPlaying) ? 0 : vol.music;
  },
};
