import fs from 'node:fs';
import path from 'node:path';
import {
  HOME_MISTAKES_PULSE_FASTEST_MS,
  HOME_MISTAKES_PULSE_SLOWEST_MS,
  homeMistakesCounterLabel,
  homeMistakesPulsePeriodMs,
} from '../app/home_mistakes_pulse_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// зачем (владелец 2026-09-14): кнопка «Ошибки · N» у «Сегодня» пульсирует тем
// быстрее, чем больше ошибок, всегда показывает счётчик и скрыта при нуле.
describe('home mistakes pulse button', () => {
  test('period shortens with the mistake count and stays within bounds', () => {
    expect(homeMistakesPulsePeriodMs(0)).toBeNull();
    expect(homeMistakesPulsePeriodMs(-3)).toBeNull();
    expect(homeMistakesPulsePeriodMs(Number.NaN)).toBeNull();
    expect(homeMistakesPulsePeriodMs(1)).toBe(HOME_MISTAKES_PULSE_SLOWEST_MS);
    const five = homeMistakesPulsePeriodMs(5) ?? 0;
    const twenty = homeMistakesPulsePeriodMs(20) ?? 0;
    expect(five).toBeLessThan(HOME_MISTAKES_PULSE_SLOWEST_MS);
    expect(twenty).toBeLessThan(five);
    expect(homeMistakesPulsePeriodMs(500)).toBe(HOME_MISTAKES_PULSE_FASTEST_MS);
  });

  test('counter label caps at 99+', () => {
    expect(homeMistakesCounterLabel(0)).toBe('0');
    expect(homeMistakesCounterLabel(14)).toBe('14');
    expect(homeMistakesCounterLabel(140)).toBe('99+');
  });

  test('component hides at zero, guards its loop and sits next to the Today heading', () => {
    const component = read('components/home/HomeMistakesPulseButton.tsx');
    expect(component).toContain('if (periodMs === null) return null;');
    expect(component).toContain('useRuntimeActive');
    expect(component).toContain('useReduceMotion');
    expect(component).toContain("testID=\"home-mistakes-pulse-button\"");
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('<HomeMistakesPulseButton');
    expect(home).toContain("nav.push('/mistakes_hub' as never)");
    expect(home).toContain('count={mistakeActiveCount}');
    expect(home).toContain('prewarmMistakeHubAdvice');
  });
});
