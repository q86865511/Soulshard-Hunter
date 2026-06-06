// Run the REAL backend against an in-memory pool (no Postgres needed) — for local
// frontend testing only. Data is wiped on restart. Listens on :8787.
// Includes the Phase 2 realtime co-op gateway (WebSocket at /rt) so two browser
// tabs can lobby + play co-op against this dev server.
//   node test/dev-fakedb.mjs
process.env.SOULSHARD_NO_LISTEN = '1';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-fakedb-secret';   // must match the WS verifier below
const { buildApp } = await import('../src/server.js');
const { makeFakePool } = await import('./fakepool.mjs');
const { attachRealtime } = await import('../src/wsgw.js');

const app = await buildApp(makeFakePool(), { logger: true, rateMax: 100000 });
const port = Number(process.env.PORT || 8787);
await app.listen({ port, host: '0.0.0.0' });
attachRealtime(app.server, app.realtime, { jwtSecret: process.env.JWT_SECRET, logger: app.log });
console.log(`[dev-fakedb] in-memory backend on http://localhost:${port} (NO persistence) — realtime co-op ws://localhost:${port}/rt`);
