// зачем (Сверка 15fc5ef7f, [D30-CAL] «cell:layout w=42 h=0»): календарь рубежа 30 — явный размер клетки от ширины ряда, своё появление emPop по эталону.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('react-native', () => ({ StyleSheet: { create: (s: unknown) => s }, View: 'View' }));
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: 'Animated.View' },
  Easing: { linear: (x: number) => x },
  cancelAnimation: () => undefined,
  useAnimatedStyle: (fn: () => unknown) => fn(),
  useReducedMotion: () => false,
  useSharedValue: (v: number) => ({ value: v }),
  withTiming: (v: number) => v,
}));
jest.mock('../components/spire/useSpirePalette', () => ({ useSpirePalette: () => ({ control: '#333' }) }));
jest.mock('../components/streak/moments/use_streak_colors', () => ({ useStreakColors: () => ({ accentGraphic: '#7EF0C8' }) }));
jest.mock('../app/dev_diag_gate', () => ({ DIAG_ENABLED: false }));

/* eslint-disable import/first */
import { easePop, monthCalendarCellSize } from '../components/streak/moments/MonthCalendar';
/* eslint-enable import/first */

describe('[D30-CAL] календарь месяца — сетка 7 колонок с зазором 6, как в эталоне', () => {
  it('клетка = (ширина ряда − 36) / 7, вниз до целого; без ширины — 0 (клеток нет)', () => {
    expect(monthCalendarCellSize(347)).toBe(44);
    expect(7 * monthCalendarCellSize(347) + 36).toBeLessThanOrEqual(347);
    expect(monthCalendarCellSize(0)).toBe(0);
  });

  it('кривая --em-ease-pop: 0 → 0, 1 → 1, с перелётом выше 1 посередине (пружина эталона)', () => {
    expect(easePop(0)).toBe(0);
    expect(easePop(1)).toBe(1);
    const peak = Math.max(...Array.from({ length: 21 }, (_, k) => easePop(k / 20)));
    expect(peak).toBeGreaterThan(1);
  });

  it('нет aspectRatio и вложенного ZoomIn — размер в пикселях, появление на своих часах', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/streak/moments/MonthCalendar.tsx'), 'utf8');
    const code = src.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*)/.test(l)).join('\n');
    expect(code).not.toMatch(/aspectRatio/);
    expect(code).not.toMatch(/ZoomIn/);
    expect(code).toContain('width: size, height: size');
  });
});
