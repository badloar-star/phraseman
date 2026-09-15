import fs from 'node:fs';
import path from 'node:path';
import {
  HOME_MISTAKES_PULSE_FASTEST_MS,
  HOME_MISTAKES_PULSE_SLOWEST_MS,
  HOME_MISTAKES_UNLOCK_AT,
  homeMistakesButtonState,
  homeMistakesCounterLabel,
  homeMistakesPulsePeriodMs,
} from '../app/home_mistakes_pulse_model';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// зачем (владелец 2026-09-15): раздел закрыт до 10 ошибок; кнопка остаётся на
// Главной, пульсирует только у открытого раздела, при нуле — серая и тихая.
describe('home mistakes button', () => {
  test('section unlocks at ten mistakes', () => {
    expect(HOME_MISTAKES_UNLOCK_AT).toBe(10);
    expect(homeMistakesButtonState(0)).toBe('idle');
    expect(homeMistakesButtonState(1)).toBe('locked');
    expect(homeMistakesButtonState(9)).toBe('locked');
    expect(homeMistakesButtonState(10)).toBe('ready');
    expect(homeMistakesButtonState(Number.NaN)).toBe('idle');
    expect(homeMistakesButtonState(-4)).toBe('idle');
  });

  test('only an unlocked section breathes, and it breathes calmly', () => {
    expect(homeMistakesPulsePeriodMs(0)).toBeNull();
    expect(homeMistakesPulsePeriodMs(9)).toBeNull();
    const ten = homeMistakesPulsePeriodMs(10) ?? 0;
    const forty = homeMistakesPulsePeriodMs(40) ?? 0;
    expect(ten).toBeGreaterThan(0);
    expect(ten).toBeLessThanOrEqual(HOME_MISTAKES_PULSE_SLOWEST_MS);
    expect(forty).toBeLessThan(ten);
    expect(homeMistakesPulsePeriodMs(500)).toBe(HOME_MISTAKES_PULSE_FASTEST_MS);
    // Владелец 2026-09-15: «медленнее» — самый частый пульс не быстрее 1.4 c.
    expect(HOME_MISTAKES_PULSE_FASTEST_MS).toBeGreaterThanOrEqual(1400);
  });

  test('counter label caps at 99+', () => {
    expect(homeMistakesCounterLabel(0)).toBe('0');
    expect(homeMistakesCounterLabel(14)).toBe('14');
    expect(homeMistakesCounterLabel(140)).toBe('99+');
  });

  test('button takes the theme accent, never the error red', () => {
    const button = read('components/home/HomeSectionPulseButton.tsx');
    expect(button).toContain('t.accent');
    expect(button).toContain('t.accentBg');
    expect(button).toContain('t.correctText');
    expect(button).not.toMatch(/t\.wrong\b|t\.wrongBg/);
    expect(button).not.toContain("'#FFFFFF'");
    expect(button).toContain('useRuntimeActive');
    expect(button).toContain('useReduceMotion');
  });

  test('home shows both buttons in one row and the videos header entry is gone', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('testID="home-mistakes-pulse-button"');
    expect(home).toContain('testID="home-videos-pulse-button"');
    // Вход в видео остался только этой кнопкой (владелец 2026-09-15).
    expect(home).not.toContain('<LingmanVideosButton');
    expect(home).toContain('markLingmanYoutubeCatalogSeen');
    // Ниже порога раздел не открывается — показываем объяснение.
    expect(home).toContain('setMistakesLockedVisible(true)');
    expect(home).toContain('<HomeMistakesLockedSheet');
  });
});
