import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

assert.equal(fs.existsSync(path.join(__dirname, '..', 'app/boons/boon_types.ts')), false);
assert.equal(fs.existsSync(path.join(__dirname, '..', 'app/boons/boon_config.ts')), false);

for (const relative of [
  'components/DoubleRewardSheet.tsx',
]) {
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  assert.equal(source.includes('double_xp'), false, `${relative} still exposes retired boon`);
}
