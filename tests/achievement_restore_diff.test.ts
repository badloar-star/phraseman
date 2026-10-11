// зачем (координатор 11.10): [ACH-RESTORE] — что облако затёрло бы при восстановлении достижений.
import { diffAchievementUnlocks, mergeAchievementStatesRaw } from '../app/achievement_restore_diff';

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

// п.1 (координатор 11.10): слияние вместо перезаписи.
const byId = (raw: string) => Object.fromEntries((JSON.parse(raw) as { id: string; unlockedAt: string | null; notified: boolean }[]).map((r) => [r.id, r]));

test('локально полученное, которого нет в облаке, переживает слияние', () => {
  const merged = byId(mergeAchievementStatesRaw(
    rows({ first_lesson: '2026-10-01T10:00:00Z', streak_7: '2026-10-11T09:00:00Z' }),
    rows({ first_lesson: '2026-10-01T10:00:00Z', streak_7: null, streak_30: null }),
  ));
  expect(merged.streak_7.unlockedAt).toBe('2026-10-11T09:00:00Z');
  expect(merged.streak_30.unlockedAt).toBeNull();
});

test('получено с обеих сторон — остаётся более ранняя дата; облачное, которого нет локально, приходит', () => {
  const merged = byId(mergeAchievementStatesRaw(
    rows({ a: '2026-10-05T00:00:00Z', only_local: '2026-10-09T00:00:00Z' }),
    rows({ a: '2026-10-02T00:00:00Z', only_cloud: '2026-10-03T00:00:00Z' }),
  ));
  expect(merged.a.unlockedAt).toBe('2026-10-02T00:00:00Z');
  expect(merged.only_cloud.unlockedAt).toBe('2026-10-03T00:00:00Z');
  expect(merged.only_local.unlockedAt).toBe('2026-10-09T00:00:00Z');
});

test('показанный на любой стороне тост не повторяется', () => {
  const local = JSON.stringify([{ id: 'a', unlockedAt: '2026-10-05T00:00:00Z', notified: false }]);
  const cloud = JSON.stringify([{ id: 'a', unlockedAt: '2026-10-06T00:00:00Z', notified: true }]);
  expect(byId(mergeAchievementStatesRaw(local, cloud)).a.notified).toBe(true);
});

test('битое облако — локальное остаётся; битое/пустое локальное — облако', () => {
  const local = rows({ a: '2026-10-05T00:00:00Z' });
  expect(mergeAchievementStatesRaw(local, 'not json')).toBe(local);
  const cloud = rows({ b: '2026-10-05T00:00:00Z' });
  expect(mergeAchievementStatesRaw('not json', cloud)).toBe(cloud);
  expect(mergeAchievementStatesRaw(null, cloud)).toBe(cloud);
});
