// Bridges realtime lobby events to scene switches. Owns BOTH `start` and `runstart`
// so a guest always has the map/roster (runstart) before entering the co-op scene:
//   every player: start -> wait for the server runstart -> enter the puppet scene.
import { RT } from '../../net/rt.js';
import { setScene } from '../scene.js';
import { refs } from '../scenes/refs.js';

let pendingGuestStart = null;


export function initCoopBridge() {
  RT.on('start', (m) => {
    if (!m || !m.room) return;
    if (!m.room.authority || m.room.protocol !== 2) {
      pendingGuestStart=null; RT.leaveRoom();
      RT.emit('room:err',{msg:'合作伺服器尚未更新，請稍後重試'}); return;
    }
    pendingGuestStart=m; // Every player waits for the trusted server map.

  });

  RT.on('runstart', (m) => {
    if (!pendingGuestStart || m.protocol!==2 || m.runId!==pendingGuestStart.room?.runId) return;
    const start = pendingGuestStart; pendingGuestStart = null;
    setScene(refs.coop, { start, runstart: m });
  });

  // Reconnected into a held in-run slot. If a run scene is live (host run.js / guest coop.js)
  // it resumes itself; if not (e.g. the page was reloaded mid-run), don't linger as a ghost
  // member — release the slot so the server can migrate/clean up.
  RT.on('resume', m => {
    if (!RT.inRun && m?.started && m.room?.authority) { pendingGuestStart=m; return; }
    if (!RT.inRun) { try { RT.leaveRoom(); } catch (e) { /* */ } }
  });
}
