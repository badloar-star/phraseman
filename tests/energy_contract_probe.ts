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

assert.equal(ENERGY_BASE_CAPACITY, 100);
assert.equal(ENERGY_BONUS_CAPACITY_LIMIT, 200);
assert.equal(ENERGY_ACTIVE_CAPACITY_LIMIT, 350);
assert.equal(ENERGY_PASSIVE_UNIT_MS, 360_000);
assert.equal(ENERGY_VIDEO_UNIT_MS, 36_000);
assert.equal(ENERGY_MICRO_UNITS_PER_UNIT, 1_000_000);

const prices: readonly (readonly [EnergyActivityKey, number])[] = [
  ['flashcards', 10],
  ['lesson_words', 10],
  ['irregular_verbs', 10],
  ['preposition_drill', 10],
  ['mistake_practice', 10],
  ['classic_lesson', 20],
  ['learning_v2_session', 20],
  ['ai_dialog', 20],
  ['personal_plan_exercise', 20],
  ['diagnostic_test', 20],
  ['level_exam', 20],
  ['arena_match', 25],
  ['theory', 0],
  ['reading', 0],
  ['video', 0],
  ['max_call', 0],
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
