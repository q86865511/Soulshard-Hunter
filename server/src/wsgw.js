// WebSocket transport that binds the `ws` library to the Fastify HTTP server and
// adapts each socket to the Realtime gateway's abstract "client" interface.
// Auth: the JWT is passed as `?token=` on the upgrade URL (browsers can't set
// Authorization headers on a WebSocket). Verified here before the socket is accepted.
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

export function attachRealtime(httpServer, realtime, { jwtSecret, path = '/rt', logger = null } = {}) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2_000_000 });   // headroom for large world snapshots
  let cidSeq = 0;

  httpServer.on('upgrade', (req, socket, head) => {
    let url; try { url = new URL(req.url, 'http://localhost'); } catch (e) { socket.destroy(); return; }
    if (url.pathname !== path) { socket.destroy(); return; }   // only the realtime path upgrades
    const token = url.searchParams.get('token') || '';
    let user;
    try { const p = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] }); user = { uid: String(p.uid), username: p.username }; }
    catch (e) { socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }

    wss.handleUpgrade(req, socket, head, (ws) => {
      const client = { cid: 'c' + (++cidSeq), user, send: (s) => { try { ws.send(s); } catch (e) { /* */ } }, close: () => { try { ws.close(); } catch (e) { /* */ } } };
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });
      ws.on('message', (data, isBinary) => { if (isBinary) return; Promise.resolve(realtime.onMessage(client, data.toString())).catch(() => {}); });
      ws.on('close', () => { Promise.resolve(realtime.onClose(client)).catch(() => {}); });
      ws.on('error', () => { /* errors surface as a close — nothing to do */ });
      Promise.resolve(realtime.onConnect(client)).catch((e) => { if (logger) logger.warn('rt onConnect failed: ' + (e && e.message)); });
    });
  });

  // app-level heartbeat: drop sockets that stop answering pings (half-open TCP). 12s so a
  // crashed/networkless peer is detected within ~24s at the transport level (the host's
  // own input-silence check in coophost retires a quiet avatar faster, ~5s).
  const hb = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) { try { ws.terminate(); } catch (e) { /* */ } continue; }
      ws.isAlive = false; try { ws.ping(); } catch (e) { /* */ }
    }
    try { realtime.sweep(); } catch (e) { /* expire reconnect-grace slots; never let it crash the heartbeat */ }
  }, 12000);
  if (hb.unref) hb.unref();
  wss.on('close', () => clearInterval(hb));
  return wss;
}
