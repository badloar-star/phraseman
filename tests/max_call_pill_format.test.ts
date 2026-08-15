/**
 * Контракт пилюли минут экрана MAX-звонка (max_call_session → MinutesPill).
 *
 * Пилюля НЕ дублирует формулу счёта: она зовёт каноничный formatMinutesPill из
 * max_call_quota_view, передавая локализованное слово минут третьим аргументом.
 * Тесты прибивают именно РЕАЛЬНУЮ функцию (включая путь с minutesWord, которым
 * пользуется экран): смена округления/формата упадёт здесь, а не разъедется
 * тихо между модулем и инлайн-копией в компоненте.
 */

import {
  formatMinutesPill,
  pillGranularity,
  pillTone,
} from '../app/max_call_quota_view';

describe('max_call_session MinutesPill formatting contract', () => {
  test('минутная гранулярность почти весь звонок, посекундная — только последние 60с', () => {
    expect(pillGranularity(300)).toBe('minutes');
    expect(pillGranularity(61)).toBe('minutes');
    expect(pillGranularity(60)).toBe('seconds');
    expect(pillGranularity(1)).toBe('seconds');
    expect(pillGranularity(0)).toBe('seconds');
  });

  test('минуты округляются вверх (честные для ученика), дефолтное слово — «мин»', () => {
    // Ожидания записаны литералами, а не пересчётом формулы в теле теста:
    // тест фиксирует контракт, а не копирует реализацию.
    expect(formatMinutesPill(61, 'minutes')).toBe('2 мин');
    expect(formatMinutesPill(120, 'minutes')).toBe('2 мин');
    expect(formatMinutesPill(121, 'minutes')).toBe('3 мин');
    expect(formatMinutesPill(299, 'minutes')).toBe('5 мин');
    expect(formatMinutesPill(300, 'minutes')).toBe('5 мин');
    expect(formatMinutesPill(301, 'minutes')).toBe('6 мин');
    expect(formatMinutesPill(479, 'minutes')).toBe('8 мин');
  });

  test('локализованное слово минут (путь MinutesPill) не меняет счёт', () => {
    expect(formatMinutesPill(61, 'minutes', 'хв')).toBe('2 хв');
    expect(formatMinutesPill(300, 'minutes', 'min')).toBe('5 min');
    expect(formatMinutesPill(479, 'minutes', 'dk')).toBe('8 dk');
  });

  test('посекундный режим — формат M:SS с ведущим нулём секунд', () => {
    expect(formatMinutesPill(60, 'seconds')).toBe('1:00');
    expect(formatMinutesPill(59, 'seconds')).toBe('0:59');
    expect(formatMinutesPill(5, 'seconds')).toBe('0:05');
    expect(formatMinutesPill(0, 'seconds')).toBe('0:00');
    // Отрицательный остаток (сессия на teardown) клампится в ноль, не в «-0:01».
    expect(formatMinutesPill(-3, 'seconds')).toBe('0:00');
    // minutesWord в посекундном режиме не участвует.
    expect(formatMinutesPill(59, 'seconds', 'хв')).toBe('0:59');
  });

  test('тон пилюли меняется по зонам (amber ≤5 мин, red ≤60с), а не по кадрам', () => {
    expect(pillTone(301)).toBe('normal');
    expect(pillTone(300)).toBe('amber');
    expect(pillTone(61)).toBe('amber');
    expect(pillTone(60)).toBe('red');
    expect(pillTone(0)).toBe('red');
  });
});
