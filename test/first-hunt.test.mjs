import test from 'node:test';
import assert from 'node:assert/strict';
import { createFirstHuntMap, firstHuntProgress, restoreFirstHuntCamp, settleFirstHunt } from '../src/game/content/first_hunt.js';
import { GAME_VERSION, PATCH_NOTES } from '../src/game/content/patchnotes.js';

const clear = (id, extra = {}) => ({ mode: 'first_hunt', characterId: id, result: 'clear', firstHuntBossDefeated: true, ...extra });
test('release version has one matching newest player-facing changelog entry', () => {
  assert.equal(PATCH_NOTES[0].v, GAME_VERSION);
  assert.equal(new Set(PATCH_NOTES.map((p) => p.v)).size, PATCH_NOTES.length);
  assert.ok(PATCH_NOTES[0].items.some((item) => (item.t || item).includes('初獵')));
});
test('legacy and malformed saves normalize without granting resources', () => {
  assert.deepEqual(firstHuntProgress({}), { completed: [], restored: 0, seals: 0, attempts: 0 });
  assert.deepEqual(firstHuntProgress({ firstHunt: { completed: ['hunter', 'hunter', 'fake'], restored: 9 } }), { completed: ['hunter'], restored: 1, seals: 0, attempts: 0 });
  assert.equal(firstHuntProgress({ firstHunt: { completed: 'hunter', restored: '2' } }).seals, 0);
  assert.equal(restoreFirstHuntCamp({}), null);
});
test('each hero earns one seal; duplicate settlement is idempotent', () => {
  const meta = {}, run = clear('hunter');
  assert.equal(settleFirstHunt(meta, run), true);
  assert.equal(settleFirstHunt(meta, run), false);
  assert.equal(firstHuntProgress(meta).attempts, 1);
  settleFirstHunt(meta, clear('hunter'));
  assert.equal(firstHuntProgress(meta).seals, 1);
  assert.equal(firstHuntProgress(meta).attempts, 2);
});
test('death, abandon, forced victory, cheat and unknown heroes earn no seal', () => {
  for (const run of [clear('hunter', { result: 'death' }), clear('hunter', { result: 'leave' }), clear('hunter', { firstHuntBossDefeated: false }), clear('hunter', { cheated: true }), clear('not-a-hero')]) {
    const meta = {}; settleFirstHunt(meta, run); assert.equal(firstHuntProgress(meta).seals, 0);
  }
  const meta = {}; assert.equal(settleFirstHunt(meta, { mode: 'normal' }), false); assert.deepEqual(meta, {});
});
test('three restorations consume seals in order and preserve existing unlocks', () => {
  const meta = { gold: 123, levels: { unlocked: 4 }, stats: { runs: 10 }, unlocked: { characters: ['hunter', 'pyro'] } };
  const before = JSON.stringify({ gold: meta.gold, levels: meta.levels, stats: meta.stats });
  settleFirstHunt(meta, clear('hunter'));
  assert.equal(restoreFirstHuntCamp(meta).name, '重燃魂火');
  assert.equal(restoreFirstHuntCamp(meta), null);
  settleFirstHunt(meta, clear('pyro')); restoreFirstHuntCamp(meta);
  settleFirstHunt(meta, clear('guardian')); restoreFirstHuntCamp(meta);
  assert.deepEqual(meta.unlocked.characters, ['hunter', 'pyro', 'guardian']);
  assert.equal(firstHuntProgress(meta).restored, 3);
  assert.equal(firstHuntProgress(meta).seals, 0);
  assert.equal(restoreFirstHuntCamp(meta), null);
  assert.equal(JSON.stringify({ gold: meta.gold, levels: meta.levels, stats: meta.stats }), before);
  assert.deepEqual(firstHuntProgress(JSON.parse(JSON.stringify(meta))), firstHuntProgress(meta));
});
test('authored arena has sealed borders, connected floor, safe landmarks and spawn', () => {
  const map = createFirstHuntMap({ id: 'crypt' }), { tw, th, tiles } = map;
  for (let x = 0; x < tw; x++) { assert.equal(tiles[x], 1); assert.equal(tiles[(th - 1) * tw + x], 1); }
  for (let y = 0; y < th; y++) { assert.equal(tiles[y * tw], 1); assert.equal(tiles[y * tw + tw - 1], 1); }
  const start = Math.floor(map.entrance.y / 16) * tw + Math.floor(map.entrance.x / 16);
  assert.equal(tiles[start], 0);
  const seen = new Set([start]), queue = [start];
  for (let k = 0; k < queue.length; k++) for (const d of [-tw, tw, -1, 1]) { const n = queue[k] + d; if (tiles[n] === 0 && !seen.has(n)) { seen.add(n); queue.push(n); } }
  assert.equal(seen.size, [...tiles].filter((t) => t === 0).length);
  assert.equal(map.chests.length + map.hazards.length + map.hiddenRooms.length, 0);
  for (const d of map.decor) { assert.equal(tiles[Math.floor(d.y / 16) * tw + Math.floor(d.x / 16)], 0); assert.ok(!d.solid); }
});
