import { lineScaleFactor, scaleLineHeight } from '../hooks/useLineScale';

// зачем (координатор 05.10): при системном шрифте 1.0 (и меньше) коэффициент ровно 1 — разметка не меняется; при крупном растёт lineHeight.
describe('useLineScale', () => {
  test('fontScale 1.0 and below keep every line height byte-identical', () => {
    for (const fs of [1, 0.85, 0, -1, Number.NaN, Number.POSITIVE_INFINITY * 0]) {
      expect(lineScaleFactor(fs)).toBe(1);
      for (const lh of [16, 20, 22, 25, 40, 44, 46]) expect(scaleLineHeight(lh, fs)).toBe(lh);
    }
  });
  test('large font scales line height by the same factor', () => {
    expect(lineScaleFactor(2)).toBe(2);
    expect(scaleLineHeight(22, 2)).toBe(44);
    expect(scaleLineHeight(25, 1.3)).toBe(33);
  });
  test('the hook reads fontScale from useWindowDimensions and memoises on it', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const source = fs.readFileSync('hooks/useLineScale.ts', 'utf8');
    expect(source).toContain('useWindowDimensions');
    expect(source).toMatch(/useCallback\([\s\S]*\[factor\]\)/);
  });
});
