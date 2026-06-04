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
};

http.createServer((req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const fp = path.join(root, path.normalize(p));
  if (!fp.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('404 ' + p); return; }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(fp).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
    });
    res.end(data);
  });
}).listen(port, () => console.log('dev server (no-cache) on http://localhost:' + port));
