// Tiny static dev server that disables caching (so edited ES modules always
// reload). Serves the project root on port 5173.
import http from 'http';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const port = 5173;
const TYPES = {
  '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html; charset=utf-8',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  // dev-only: accept a base64 canvas capture and write it to disk for inspection
  // (headless preview tabs are background-throttled, so preview_screenshot stalls).
  if (req.method === 'POST' && p === '/__shot') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      try {
        const b64 = body.replace(/^data:image\/\w+;base64,/, '');
        fs.writeFileSync(path.join(root, '_shot.png'), Buffer.from(b64, 'base64'));
        res.writeHead(200, { 'Access-Control-Allow-Origin': '*' }); res.end('ok');
      } catch (e) { res.writeHead(500); res.end(String(e)); }
    });
    return;
  }
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(root, path.normalize(p));
  // Compare against root + separator: a bare startsWith(root) also accepts SIBLING dirs
  // (…/Soulshard-Hunter-bak/secret.txt starts with …/Soulshard-Hunter). path.normalize
  // currently clamps a leading `..` on an absolute path, so no live escape was reproducible —
  // this is the correct check regardless of that. `fp === root` stays allowed (→ index.html).
  if (fp !== root && !fp.startsWith(root + path.sep)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 ' + p); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    });
    res.end(data);
  });
// Loopback only: this is a dev server with a write-to-disk POST /__shot endpoint and
// Access-Control-Allow-Origin:*, so it must never be reachable from the LAN.
}).listen(port, '127.0.0.1', () => console.log('dev server (no-cache) on http://localhost:' + port));
