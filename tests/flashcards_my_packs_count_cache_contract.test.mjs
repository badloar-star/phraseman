import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const cache = readFileSync(join(root, 'app/flashcards/myPacksCountCache.ts'), 'utf8');
const mine = readFileSync(join(root, 'app/flashcards_my_packs.tsx'), 'utf8');
const hub = readFileSync(join(root, 'app/flashcards/FlashcardsHubScreen.tsx'), 'utf8');

test('exact My Packs count is ephemeral and keyed by account and study target', () => {
  assert.match(cache, /function publishMyPacksCount/);
  assert.match(cache, /function peekMyPacksCount/);
  assert.match(cache, /userId/);
  assert.match(cache, /studyTarget/);
  assert.match(cache, /Date\.now\(\) - snapshot\.atMs > MAX_AGE_MS/);
  assert.doesNotMatch(cache, /AsyncStorage|SecureStore/);
});

test('My screen publishes only a settled merged count, and Hub reads it for matching identity', () => {
  assert.match(mine, /loadStatus !== 'ready'/);
  assert.match(mine, /publishMyPacksCount\(studyTarget,.*groups\.added\.length\s*\+\s*groups\.created\.length/s);
  assert.match(hub, /peekMyPacksCount\(studyTarget,/);
  assert.match(hub, /getCanonicalUserId\(/);
  assert.doesNotMatch(hub, /const myPackCount: number \| null = null/);
});
