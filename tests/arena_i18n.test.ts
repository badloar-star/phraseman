import {
  arenaBilingualFirst,
  arenaGameStr,
  arenaSecondsSuffix,
  arenaUiLang,
  arenaXpStreak,
} from '../constants/arena_i18n';
import type { Lang } from '../constants/i18n';

describe('arena_i18n', () => {
  test('arenaUiLang maps Lang to arena segment', () => {
    expect(arenaUiLang('ru')).toBe('ru');
    expect(arenaUiLang('uk')).toBe('uk');
    expect(arenaUiLang('es')).toBe('es');
  });

  test('arenaGameStr returns Spanish for es', () => {
    expect(arenaGameStr('es', 'loadingQuestions')).toBe('Cargando preguntas…');
    expect(arenaGameStr('es', 'accept')).toBe('ACEPTAR');
  });

  test('arenaSecondsSuffix uses space+s for ES', () => {
    expect(arenaSecondsSuffix('ru')).toBe('с');
    expect(arenaSecondsSuffix('es')).toBe(' s');
  });

  test('arenaXpStreak localized (ES)', () => {
    // «aciertos» es masculino plural → «seguidos»
    expect(arenaXpStreak('es')).toMatch(/seguidos/i);
    expect(arenaXpStreak('es').startsWith('¡')).toBe(true);
  });

  test('arenaBilingualFirst picks third segment for es when present', () => {
    const text = 'RU phrase · UK phrase · ES frase';
    expect(arenaBilingualFirst(text, 'es')).toBe('ES frase');
    expect(arenaBilingualFirst(text, 'uk')).toBe('UK phrase');
    expect(arenaBilingualFirst(text, 'ru' as Lang)).toBe('RU phrase');
  });
});
