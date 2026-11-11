import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(root, relativePath), 'utf8');

const spin = read('app/level_spin_star_grants.ts');
const mistake = read(
);
const practiceClient = read('app/practice_rune_settlement.ts');
const practiceServer = read('functions/src/practice_rune_grant.ts');

assert.ok(
  spin.includes('applySuperSundayRuneMultiplier(baseAmount, createdAtMs)'),
  'level gifts, daily journey, quests and spin rune rewards must seal Sunday ×2',
);
assert.ok(
  mistake.includes('applySuperSundayRuneMultiplier(1, candidate.earnedAtMs)'),
  'mistake-correction bonus must seal Sunday ×2',
);
assert.ok(
  practiceClient.includes(
    'applySuperSundayRuneMultiplier(input.earnings.pendingRunes, createdAtMs)',
  ),
  'ordinary practice must seal Sunday ×2 client-side',
);
assert.ok(
  !practiceServer.includes('applySuperSundayRuneMultiplier'),
  'practice server must not multiply the already sealed client amount again',
);

console.log('Super Sunday all gameplay rune sources gate: PASS');
