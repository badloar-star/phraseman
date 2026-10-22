import { classifyProgressKey } from './inventory';

// Координатор 22.10 (решение 3): прогресс курса Learning V2 не держит перенос OD21 — остаётся на месте.
// Без правила оба ключа давали hold unknown_field у каждого ученика курса.
describe('инвентарь: прогресс курса Learning V2', () => {
  test.each(['learning_v2_course_progress_sync_v1', 'learning_v2_course_masks_sync_v1'])('%s → keep_in_place', (key) => {
    const found = classifyProgressKey(key);
    expect([found.ruleId, found.disposition]).toEqual(['p.learning_v2_course', 'keep_in_place']);
  });
});
