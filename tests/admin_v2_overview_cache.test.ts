import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(__dirname, '..');
const moduleUrl = pathToFileURL(path.join(root, 'admin/v2/scripts/admin-overview-cache.js')).href;

function runCacheProgram(program: string) {
  const source = `import assert from 'node:assert/strict'; import(${JSON.stringify(moduleUrl)}).then((m) => { ${program} })`;
  const run = spawnSync(process.execPath, ['--input-type=module', '--eval', source], { cwd: root, encoding: 'utf8' });
  expect(run.status).toBe(0);
}

describe('Admin v2 overview cache', () => {
  test('keeps account snapshots isolated, cloned, and stale after 36 hours', () => runCacheProgram(`
    const accountA = 'uid-sha256-v1_${'a'.repeat(64)}';
    const accountB = 'uid-sha256-v1_${'b'.repeat(64)}';
    const cache = m.createOverviewCache();
    const source = { state: 'ready', digest: { total: 2 } };
    cache.write(accountA, source, 100);
    source.digest.total = 9;
    assert.deepEqual(cache.peek(accountA, 100).value, { state: 'ready', digest: { total: 2 } });
    assert.equal(cache.peek(accountA, 100 + m.OVERVIEW_CACHE_TTL_MS + 1).isStale, true);
    assert.equal(cache.peek(accountB, 100), null);
  `));

  test('quietly refreshes equal data and retains last good data through loading and error', () => runCacheProgram(`
    const account = 'uid-sha256-v1_${'a'.repeat(64)}'; const cache = m.createOverviewCache();
    cache.write(account, { state: 'ready', digest: { total: 2 } }, 100);
    assert.equal(cache.write(account, { state: 'ready', digest: { total: 2 } }, 200).changed, false);
    assert.deepEqual(cache.markLoading(account, 210).value, { state: 'ready', digest: { total: 2 } });
    assert.equal(cache.markError(account, 'unavailable', 220).state, 'error');
    assert.equal(cache.peek(account, 220).error, 'unavailable');
  `));

  test('rejects unsafe account identifiers, does not fabricate defaults, and evicts at eight', () => runCacheProgram(`
    const cache = m.createOverviewCache();
    assert.equal(cache.write('owner@example.com', { state: 'ready' }, 1), null);
    assert.equal(cache.markLoading('uid-sha256-v1_${'a'.repeat(64)}', 1), null);
    for (let index = 0; index <= m.OVERVIEW_CACHE_MAX_ENTRIES; index += 1) {
      cache.write('uid-sha256-v1_' + index.toString(16).repeat(64).slice(0, 64), { value: index }, index);
    }
    assert.equal(cache.size(), m.OVERVIEW_CACHE_MAX_ENTRIES);
    cache.clearAll(); assert.equal(cache.size(), 0);
  `));
});
