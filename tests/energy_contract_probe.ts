import assert from 'node:assert/strict';
import {
  ENERGY_ACTIVE_CAPACITY_LIMIT,
  ENERGY_BASE_CAPACITY,
  ENERGY_BONUS_CAPACITY_LIMIT,
  ENERGY_MICRO_UNITS_PER_UNIT,
  ENERGY_PASSIVE_UNIT_MS,
  ENERGY_VIDEO_UNIT_MS,
  activityEnergyCost,
  energyActivityForSessionKind,
  type EnergyActivityKey,
} from '../app/energy_contract';

assert.equal(ENERGY_BASE_CAPACITY, 5);
assert.equal(ENERGY_BONUS_CAPACITY_LIMIT, 0);
assert.equal(ENERGY_ACTIVE_CAPACITY_LIMIT, 5);
assert.equal(ENERGY_PASSIVE_UNIT_MS, 600_000);
assert.equal(ENERGY_VIDEO_UNIT_MS, 36_000);
assert.equal(ENERGY_MICRO_UNITS_PER_UNIT, 1_000_000);

const prices: readonly (readonly [EnergyActivityKey, number])[] = [
  ['flashcards', 1],
  ['lesson_words', 1],
  ['irregular_verbs', 1],
  ['preposition_drill', 1],
  ['mistake_practice', 1],
  ['classic_lesson', 1],
  ['learning_v2_session', 1],
  ['ai_dialog', 1],
  ['diagnostic_test', 1],
  ['level_exam', 1],
  ['arena_match', 1],
  ['theory', 0],
  ['reading', 0],
  ['video', 0],
];

for (const [activity, expected] of prices) {
  assert.equal(activityEnergyCost(activity), expected, activity);
}

assert.equal(energyActivityForSessionKind('arena_friend_duel'), 'arena_match');
assert.equal(energyActivityForSessionKind('flashcards_recall'), 'flashcards');
assert.equal(energyActivityForSessionKind('lesson'), 'classic_lesson');
assert.equal(energyActivityForSessionKind('learning_v2_session'), 'learning_v2_session');
assert.equal(energyActivityForSessionKind('exam'), 'level_exam');

console.log(`ENERGY CONTRACT PROBE: PASS (${prices.length} activity keys)`);
