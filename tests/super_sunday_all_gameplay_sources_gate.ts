import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string =>
  fs.readFileSync(path.resolve(root, relativePath), 'utf8');

const learningComposite = read(
  'modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts',
);
const learningServer = read(
  'functions/src/learning_v2/required_session_performance_award.ts',
);
const spin = read('app/level_spin_star_grants.ts');
const mistake = read(
  'modules/learning-v2/progress/mistake_correction_wallet_composite.ts',
);
const practiceClient = read('app/practice_rune_settlement.ts');
const practiceServer = read('functions/src/practice_rune_grant.ts');

assert.ok(
  learningComposite.includes(
    'applySuperSundayRuneMultiplier(candidate.totalRunes, candidate.earnedAtMs)',
  ),
  'Factory Native Learning V2 completion must seal Sunday ×2 in its client composite',
);
assert.ok(
  learningServer.includes(
    'applySuperSundayRuneMultiplier(baseAwardedSubunits, awardedAtMs)',
  ),
  'released/legacy Learning V2 initial and repeat completion must seal Sunday ×2',
);
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
