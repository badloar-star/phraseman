import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
for (const name of [
  'boon_active_status_copy',
  'boon_config',
  'boon_copy',
  'boon_facts_copy',
  'boon_rewards',
  'perfect_week',
]) {
  assert.equal(existsSync(path.join(root, 'app/boons', `${name}.ts`)), false, `${name} still bundled`);
}
const remoteFlags = readFileSync(path.join(root, 'app/remote_flags.ts'), 'utf8');
assert.equal(remoteFlags.includes('weekly_boons_config'), false, 'retired client remote flag remains');
console.log('weekly boon copy, config, and rewards retired');
