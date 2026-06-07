// Bridges realtime lobby events to scene switches. Owns BOTH `start` and `runstart`
// so a guest always has the map/roster (runstart) before entering the co-op scene:
//   host: start -> build a host run (run.js + CoopHost) which then emits runstart
//   guest: start -> wait -> runstart -> enter the puppet co-op scene
import { RT } from '../../net/rt.js';
import { CoopHost } from './coophost.js';
import { newRun } from '../state.js';
import { setScene } from '../scene.js';
import { refs } from '../scenes/refs.js';

let pendingGuestStart = null;

function hostMemberOf(room, cid) { return (room.members || []).find((m) => m.cid === cid) || {}; }

export function initCoopBridge() {
  RT.on('start', (m) => {
    if (!m || !m.room) return;
    if (m.role === 'host') {
      pendingGuestStart = null;
      const me = hostMemberOf(m.room, m.you);
      const cfg = m.room.cfg || {};
      const run = newRun({
        biomeId: cfg.biomeId || 'crypt',
        difficulty: cfg.difficulty || 1,
        characterId: me.charId || undefined,
        startWeapon: me.weaponId || undefined,
      });
      const coop = new CoopHost(m.room, m.you);
      setScene(refs.run, { run, coop });
    } else {
      pendingGuestStart = m;   // guest: hold until the host's runstart (map + roster) arrives
    }
  });

  RT.on('runstart', (m) => {
    if (!pendingGuestStart) return;
    const start = pendingGuestStart; pendingGuestStart = null;
    setScene(refs.coop, { start, runstart: m });
  });

  // Reconnected into a held in-run slot. If a run scene is live (host run.js / guest coop.js)
  // it resumes itself; if not (e.g. the page was reloaded mid-run), don't linger as a ghost
  // member — release the slot so the server can migrate/clean up.
  RT.on('resume', () => { if (!RT.inRun) { try { RT.leaveRoom(); } catch (e) { /* */ } } });
}
