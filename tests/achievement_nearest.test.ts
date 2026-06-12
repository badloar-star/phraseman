import { getNearestLockedAchievements } from '../app/achievement_nearest';

describe('getNearestLockedAchievements', () => {
  it('returns up to three locked achievements closest to completion', () => {
    const achievements = [
      { id: 'earned' },
      { id: 'no_progress' },
      { id: 'half' },
      { id: 'almost' },
      { id: 'started' },
      { id: 'third' },
      { id: 'fourth' },
    ];
    const unlockedIds = new Set(['earned']);
    const progressById = new Map<string, [number, number]>([
      ['earned', [9, 10]],
      ['no_progress', [0, 10]],
      ['half', [5, 10]],
      ['almost', [9, 10]],
      ['started', [1, 10]],
      ['third', [7, 10]],
      ['fourth', [6, 10]],
    ]);

    const nearest = getNearestLockedAchievements(
      achievements,
      unlockedIds,
      (id) => progressById.get(id) ?? null,
    );

    expect(nearest.map(item => item.achievement.id)).toEqual(['almost', 'third', 'fourth']);
    expect(nearest.map(item => item.progressPct)).toEqual([90, 70, 60]);
  });

  it('returns an empty list when there are no locked achievements with positive progress', () => {
    const nearest = getNearestLockedAchievements(
      [{ id: 'earned' }, { id: 'zero' }, { id: 'unknown' }],
      new Set(['earned']),
      (id) => (id === 'zero' ? [0, 10] : null),
    );

    expect(nearest).toEqual([]);
  });
});
