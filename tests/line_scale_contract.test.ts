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
    expect(scaleLineHeight(25, 1.3)).toBe(32.5);
  });
  test('maxMultiplier caps growth: 2.0 with a 1.3 limit gives 22 → 28.6; at 1.0 still exactly n', () => {
    expect(lineScaleFactor(2, 1.3)).toBe(1.3);
    expect(scaleLineHeight(22, 2, 1.3)).toBe(28.6);
    expect(scaleLineHeight(22, 1.15, 1.3)).toBe(25.3);
    for (const lh of [16, 20, 22, 25, 40]) expect(scaleLineHeight(lh, 1, 1.3)).toBe(lh);
    expect(scaleLineHeight(22, 2, undefined)).toBe(44);
  });
  test('the hook reads fontScale from useWindowDimensions and memoises on it', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const source = fs.readFileSync('hooks/useLineScale.ts', 'utf8');
    expect(source).toContain('useWindowDimensions');
    expect(source).toMatch(/useCallback\([\s\S]*\[base\]\)/);
  });
  test('useScaledTextStyles returns the very same style object at 1.0 and rescales lineHeight only', () => {
    const fs = require('node:fs') as typeof import('node:fs');
    const source = fs.readFileSync('hooks/useLineScale.ts', 'utf8');
    expect(source).toContain('if (factor === 1) return styles;');
    expect(source).toContain('useScaledTextStyles<T extends Record<string, unknown>>(styles: T, maxMultiplier?: number)');
    expect(source).toMatch(/typeof \(style as \{ lineHeight\?: unknown \}\)\.lineHeight === 'number'/);
  });
});
