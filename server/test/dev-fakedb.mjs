// Run the REAL backend against an in-memory pool (no Postgres needed) — for local
// frontend testing only. Data is wiped on restart. Listens on :8787.
//   node test/dev-fakedb.mjs
process.env.SOULSHARD_NO_LISTEN = '1';
const { buildApp } = await import('../src/server.js');
const { makeFakePool } = await import('./fakepool.mjs');

const app = await buildApp(makeFakePool(), { logger: true, rateMax: 100000 });
const port = Number(process.env.PORT || 8787);
await app.listen({ port, host: '0.0.0.0' });
console.log(`[dev-fakedb] in-memory backend on http://localhost:${port} (NO persistence)`);
