import assert from 'node:assert/strict';
import { shouldUsePracticeWarmup } from '../app/streak_stats_practice_balance';

const legacyDataWithXp = { active7: 1, totalStreak: 1, xp7: 385, minutes7: 0 };

assert.equal(
  shouldUsePracticeWarmup(legacyDataWithXp),
  false,
  'historical XP without study time must not activate practice warmup',
);

assert.equal(
  shouldUsePracticeWarmup({ active7: 1, totalStreak: 1, minutes7: 16 }),
  true,
  'recorded study time activates practice warmup',
);
