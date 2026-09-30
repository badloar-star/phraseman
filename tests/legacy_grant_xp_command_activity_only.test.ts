import { applyPersonalProgressCommand } from '../modules/phone-state/domains/progress_projection';

// зачем: XP удалён. Событие grant_xp со старой версии на другом устройстве не должно ни начислять
// опыт, ни уходить в карантин — из него сохраняется только дата активности (серия дней не падает).
test('legacy grant_xp keeps only the activity date and grants nothing', () => {
  const state = {
    projection: {
      activityDates: ['2026-09-27'],
      streakCount: 1,
      completedLessons: [],
      passedExams: [],
      unlockedLessons: [],
      bestResults: {},
    },
    appliedEventIds: [],
  };
  const legacy = { kind: 'grant_xp', eventId: 'legacy_xp_event_1', amount: 50, source: 'lesson', activityDate: '2026-09-28' };
  const result = applyPersonalProgressCommand(state as never, legacy as never);
  expect(result.duplicate).toBe(false);
  expect(result.state.projection.activityDates).toEqual(['2026-09-27', '2026-09-28']);
  expect(result.state.projection.streakCount).toBe(2);
  expect(JSON.stringify(result.state.projection)).not.toMatch(/xp|level/i);
  expect(() => applyPersonalProgressCommand(state as never, { ...legacy, eventId: 'bad_1', activityDate: 'x' } as never))
    .toThrow('phone_state_progress_input_invalid');
});
