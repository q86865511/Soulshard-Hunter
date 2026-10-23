import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
test('release import map versions shared modules even without worker control', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const map = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
  for (const entry of ['/src/game/state.js', '/src/game/scenes/run.js', '/src/game/scenes/hub.js', '/src/game/content/patchnotes.js']) assert.ok(map[entry]);
  for (const [entry, target] of Object.entries(map)) {
    const url = new URL(target, 'https://game.test');
    assert.equal(url.pathname, entry);
    assert.equal(url.searchParams.get('__build'), 'r33-v2.2');
    assert.ok(readFileSync(new URL('..' + entry, import.meta.url)).length > 0);
  }
});
function fixture({ offline = false, cached = new Map() } = {}) {
  const handlers = {}, calls = [], deleted = [];
  const bucket = { addAll: async () => {}, put: async (req, res) => cached.set(typeof req === 'string' ? req : req.url, await res.text()) };
  const caches = { open: async () => bucket, keys: async () => ['soulshard-v1', 'soulshard-v2.2'], delete: async (name) => { deleted.push(name); },
    match: async (req) => { const body = cached.get(typeof req === 'string' ? req : req.url); return body === undefined ? undefined : new Response(body); } };
  vm.runInNewContext(source, { URL, caches, self: { location: { origin: 'https://game.test' }, clients: { claim: async () => {} }, skipWaiting() {}, addEventListener: (name, fn) => { handlers[name] = fn; } },
    fetch: async (req, opts) => {
      const url = typeof req === 'string' ? req : req.url; calls.push({ url, opts });
      if (offline) throw new Error('offline');
      // Simulate an edge retaining the old object even if browser cache is bypassed.
      return new Response(new URL(url).searchParams.has('__build') && opts?.cache === 'no-store' ? 'current release' : 'stale HTTP/CDN object');
    } });
  const get = async (path, init = {}) => {
    let response;
    handlers.fetch({ request: new Request('https://game.test' + path, init), respondWith: (p) => { response = p; } });
    return response ? (await response).text() : undefined;
  };
  return { handlers, calls, deleted, get };
}
test('online code bypasses stale browser and CDN objects while preserving query parameters', async () => {
  const f = fixture(); assert.equal(await f.get('/src/main.js?lang=zh'), 'current release');
  assert.equal(new URL(f.calls[0].url).searchParams.get('lang'), 'zh');
});
test('offline code still uses the original cached module URL', async () => {
  const cached = new Map([['https://game.test/src/main.js', 'offline module']]);
  assert.equal(await fixture({ offline: true, cached }).get('/src/main.js'), 'offline module');
});
test('cached media and API requests retain their existing behavior', async () => {
  const f = fixture({ cached: new Map([['https://game.test/theme.mp3', 'recorded music']]) });
  assert.equal(await f.get('/theme.mp3'), 'recorded music');
  assert.equal(await f.get('/api/save'), undefined);
  assert.equal(await f.get('/api/save', { method: 'POST' }), undefined);
  assert.equal(f.calls.length, 0);
});
test('activation retires the prior release cache and retains the current one', async () => {
  const f = fixture(); let work;
  f.handlers.activate({ waitUntil: (p) => { work = p; } }); await work;
  assert.deepEqual(f.deleted, ['soulshard-v1']);
});
