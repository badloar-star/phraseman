import fs from 'node:fs';
import path from 'node:path';
import { RANK_LEVELS, RANK_TIERS, rankToIndex } from '../app/types/arena';

const ASSET_DIR = path.join(process.cwd(), 'assets', 'images', 'arena_ranks', 'v2');

const FILE_SUFFIX_BY_LEVEL: Record<(typeof RANK_LEVELS)[number], string> = {
  I: 'i',
  II: 'ii',
  III: 'iii',
};

describe('arena rank assets', () => {
  test('rank progression has three levels per tier', () => {
    expect(RANK_TIERS).toHaveLength(8);
    expect(RANK_LEVELS).toEqual(['I', 'II', 'III']);

    const indices = RANK_TIERS.flatMap(tier =>
      RANK_LEVELS.map(level => rankToIndex(tier, level)),
    );

    expect(indices).toHaveLength(24);
    expect(indices).toEqual(Array.from({ length: 24 }, (_unused, index) => index));
  });

  test('ships only I-II-III gameplay icons for every arena rank', () => {
    for (const tier of RANK_TIERS) {
      for (const level of RANK_LEVELS) {
        const suffix = FILE_SUFFIX_BY_LEVEL[level];
        const filePath = path.join(ASSET_DIR, `arena-rank-${tier}-${suffix}.webp`);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }

    const baseFiles = fs
      .readdirSync(ASSET_DIR)
      .filter(fileName => /^arena-rank-.+-base\.webp$/.test(fileName));

    expect(baseFiles).toEqual([]);
  });
});
