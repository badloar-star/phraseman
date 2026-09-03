import fs from 'fs';
import path from 'path';
import {
  STREAK_ICON_MODEL,
  STREAK_ICON_TIERS,
  streakIconTierForDays,
} from '../constants/streakIconAssets';

describe('streak feather icon milestones', () => {
  it('меняет ступень ровно каждые десять дней', () => {
    expect(STREAK_ICON_TIERS).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
  });

  it.each([
    [0, 0],
    [0, 1],
    [0, 9],
    [10, 10],
    [10, 19],
    [20, 20],
    [50, 55],
    [80, 89],
    [90, 90],
    [90, 365],
  ])('выбирает ступень %i для цепочки в %i дней', (tier, days) => {
    expect(streakIconTierForDays(days)).toBe(tier);
  });

  it.each([[-5], [Number.NaN], [Number.POSITIVE_INFINITY]])(
    'после обрыва и на мусорном значении (%p) показывает первое слабое перо',
    (days) => {
      expect(streakIconTierForDays(days as number)).toBe(0);
    },
  );

  it('содержит ровно десять общих перьев, и все файлы на месте', () => {
    const paths = Object.values(STREAK_ICON_MODEL.featherAssetPaths);
    expect(paths).toHaveLength(10);
    expect(new Set(paths).size).toBe(10);
    for (const rel of paths) {
      expect(fs.existsSync(path.join(__dirname, '..', rel))).toBe(true);
    }
  });

  it('не тянет за собой снятые тематические огоньки', () => {
    const registry = fs.readFileSync(
      path.join(__dirname, '..', 'constants', 'streakIconAssets.ts'),
      'utf8',
    );
    // зачем: ловим именно ассеты иконок (require/путь в assets), а не любое
    // слово "fire" — справочные строки про исходники трогать не за что.
    expect(registry).not.toMatch(/streak-fire-[a-zA-Z]+-\d{3}\.webp/);
    expect(registry).not.toContain('streak-fire-model-sheet.webp');
  });
});
