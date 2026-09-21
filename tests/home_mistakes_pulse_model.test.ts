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

  test('ряд пилюль у «Сегодня» убран: видео в шапке, ошибки на карточке и полосе', () => {
    // зачем (владелец 2026-09-21): ряд из двух одинаковых пилюль был главным
    // источником «наляпистости» на Главной и удалён целиком. Это ОТМЕНА
    // решения от 2026-09-14/15 («Видео» слева от «Ошибки», вход в видео из
    // шапки убран).
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain('testID="home-mistakes-pulse-button"');
    expect(home).not.toContain('testID="home-videos-pulse-button"');
    // Видео вернулось в шапку и называется «Видеоуроки» (владелец).
    expect(home).toContain('testID="home-header-videos"');
    expect(home).toContain('homeVideoLessonsLabel');
    // Гашение счётчика оптимистичное — сети не ждём.
    expect(home).toContain('markLingmanYoutubeCatalogSeen');
    // Ошибки: два входа — переключаемая карточка и зарубка на полосе опыта.
    expect(home).toContain('testID="home-xp-mistake-notch"');
    expect(home).toContain('openHomeMistakesHub');
  });

  test('порог 10 больше не закрывает раздел ошибок', () => {
    // зачем (владелец 2026-09-21): «я хочу чтобы даже если меньше 10 чтобы хаб
    // открывался». Отмена решения от 2026-09-15. Шторка «ошибок мало» стала
    // недостижимой и убрана с Главной — мёртвый показ однажды всплыл бы не
    // вовремя (правило фундамента про durable-очереди).
    const home = read('app/(tabs)/home.tsx');
    expect(home).not.toContain('setMistakesLockedVisible(true)');
    expect(home).not.toContain('<HomeMistakesLockedSheet');
  });
});
