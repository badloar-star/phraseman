import {
  achievementShelfIndexFromOffset,
  achievementShelfIndicator,
  achievementShelfInitialId,
  achievementShelfItemWidth,
  achievementShelfSideInset,
} from '../app/achievement_shelf_model';

test('shelf geometry centers first and last trophies', () => {
  expect(achievementShelfItemWidth(390)).toBe(172);
  expect(achievementShelfSideInset(390, 172)).toBe(109);
  expect(achievementShelfIndexFromOffset(343, 172, 4)).toBe(2);
});

test('initial selection is the most recently earned visible trophy', () => {
  expect(achievementShelfInitialId(
    [{ id: 'old' }, { id: 'new' }, { id: 'locked' }],
    new Map([
      ['old', { unlockedAt: '2026-01-01T00:00:00.000Z' }],
      ['new', { unlockedAt: '2026-08-20T00:00:00.000Z' }],
    ]),
  )).toBe('new');
});

test('long collections use a compact count instead of dozens of dots', () => {
  expect(achievementShelfIndicator(2, 6)).toEqual({ kind: 'dots', active: 2, total: 6 });
  expect(achievementShelfIndicator(18, 40)).toEqual({ kind: 'count', label: '19 / 40' });
});
