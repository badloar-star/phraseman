/**
 * «Поток»: в вариантах ответа нет методических пометок урока.
 * Повод (сквозная проверка 11.11.2026): «Оно открыто. (О предмете.)» и «… Для сборки: «не» + «безопасная».»
 * показывались как варианты ответа и выдавали верный.
 */
import { buildFlowRounds, cleanFlowTranslation, flowTranslation, type FlowItem } from '../modules/games/flow_core';

describe('cleanFlowTranslation', () => {
  it.each([
    ['Оно открыто. (О предмете.)', 'Оно открыто.'],
    ['Я рано. (Опишите состояние с «быть».)', 'Я рано.'],
    ['Лестница небезопасна. Для сборки: «не» + «безопасная».', 'Лестница небезопасна.'],
    ['Я обычно не работаю допоздна. (После подлежащего сначала отрицание, затем «обычно».)', 'Я обычно не работаю допоздна.'],
    ['Он дома. (Первая.) (Вторая.)', 'Он дома.'],
    ['Он дома.', 'Он дома.'],
    ['  Он дома.  ', 'Он дома.'],
    ['', ''],
  ])('%s → %s', (raw, clean) => {
    expect(cleanFlowTranslation(raw)).toBe(clean);
  });

  it('скобки в середине фразы — часть перевода, они остаются', () => {
    expect(cleanFlowTranslation('Он (не) дома.')).toBe('Он (не) дома.');
  });

  it('нестроковый вход не роняет игру', () => {
    expect(cleanFlowTranslation(undefined as unknown as string)).toBe('');
  });
});

describe('flowTranslation', () => {
  const phrase = { russian: 'Оно открыто. (О предмете.)', ukrainian: 'Воно відчинене. (Про предмет.)', sourceLocales: { en: 'It is open. (About a thing.)', es: '' } };

  it('берёт перевод своего языка интерфейса и чистит пометку', () => {
    expect(flowTranslation(phrase, 'ru')).toBe('Оно открыто.');
    expect(flowTranslation(phrase, 'uk')).toBe('Воно відчинене.');
    expect(flowTranslation(phrase, 'en')).toBe('It is open.');
  });

  it('нет перевода на язык интерфейса — берётся русский, тоже без пометки', () => {
    expect(flowTranslation(phrase, 'es')).toBe('Оно открыто.');
    expect(flowTranslation({ russian: 'Он дома.', ukrainian: '' }, 'uk')).toBe('Он дома.');
  });

  it('фразы, чьи переводы совпали после чистки, не дают двух одинаковых вариантов', () => {
    const pool: FlowItem[] = [
      { id: 'a', en: 'It is open.', translation: cleanFlowTranslation('Оно открыто. (О предмете.)') },
      { id: 'b', en: 'It is opened.', translation: cleanFlowTranslation('Оно открыто.') },
      { id: 'c', en: 'I am early.', translation: 'Я рано.' },
      { id: 'd', en: 'He is home.', translation: 'Он дома.' },
      { id: 'e', en: 'We are here.', translation: 'Мы здесь.' },
    ];
    for (const round of buildFlowRounds(pool, 6)) {
      const options = round.options.map((o) => o.toLowerCase());
      expect(new Set(options).size).toBe(options.length);
    }
  });
});
