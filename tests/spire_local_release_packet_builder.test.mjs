import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = join(import.meta.dirname, '..');
const scriptPath = join(root, 'scripts', 'build_spire_local_release_packet.mjs');

test('local Spire packet builder is a reproducible read-only release tool', () => {
  assert.equal(existsSync(scriptPath), true, 'missing local release packet builder');
  const source = readFileSync(scriptPath, 'utf8');
  assert.match(source, /PHRASEMAN_FIRESTORE_READ_TOKEN/u);
  assert.match(source, /:runQuery/u);
  assert.match(source, /method:\s*'POST'/u, 'Firestore structured query is the only network mutation-shaped verb');
  assert.doesNotMatch(source, /method:\s*'(PUT|PATCH|DELETE)'/u);
  assert.doesNotMatch(source, /firebase\s+deploy|adminSpirePackBuild/u);
});

test('packet is fail-closed for all five contours and stages enabled config locally', () => {
  const source = readFileSync(scriptPath, 'utf8');
  assert.match(source, /\['en',\s*'es',\s*'fr',\s*'de',\s*'it'\]/u);
  assert.match(source, /SPIRE_PACK_MAX_TIER/u);
  assert.match(source, /unavailableLangs/u);
  assert.match(source, /enabled:\s*true/u);
  assert.match(source, /releaseEligible/u);
});
