// зачем (координатор 11.10): [ACH-RESTORE] — что облако затёрло бы при восстановлении достижений.
import { diffAchievementUnlocks } from '../app/achievement_restore_diff';

const rows = (unlocked: Record<string, string | null>) =>
  JSON.stringify(Object.entries(unlocked).map(([id, unlockedAt]) => ({ id, unlockedAt, notified: false, shardClaimed: true })));

test('локально полученное, которого нет в облаке, попадает в wouldLose', () => {
  const diff = diffAchievementUnlocks(
    rows({ first_lesson: '2026-10-01T10:00:00Z', streak_7: '2026-10-11T09:00:00Z', streak_30: null }),
    rows({ first_lesson: '2026-10-01T10:00:00Z', streak_7: null, streak_30: null }),
  );
  expect(diff.localUnlocked).toEqual(['first_lesson', 'streak_7']);
  expect(diff.cloudUnlocked).toEqual(['first_lesson']);
  expect(diff.wouldLose).toEqual(['streak_7']);
});

test('пусто и мусор — без падения', () => {
  expect(diffAchievementUnlocks(null, rows({ a: '2026-10-01' })).wouldLose).toEqual([]);
  expect(diffAchievementUnlocks('not json', rows({})).localUnlocked).toBeNull();
});
