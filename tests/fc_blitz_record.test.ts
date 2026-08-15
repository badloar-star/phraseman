/**
 * FIX владельца (2026-08-13): «что даёт счёт в блице?».
 * Счёт получает смысл через ЛИЧНЫЙ РЕКОРД: побил прошлый лучший — «Новый
 * рекорд!», иначе видно счёт и лучший результат. Никакой валюты, наград и
 * звёзд. Здесь — чистая логика сравнения и локальное хранение рекорда.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyBlitzScore,
  commitBlitzScore,
  FC_BLITZ_BEST_KEY,
  getBlitzBest,
  normalizeScore,
  parseBlitzRecord,
  __resetBlitzRecordForTests,
} from '../app/flashcards/blitz_record';

beforeEach(async () => {
  __resetBlitzRecordForTests();
  await AsyncStorage.clear();
});

describe('чистое сравнение счёта с рекордом', () => {
  it('рекорд засчитывается только СТРОГО выше прошлого', () => {
    expect(applyBlitzScore(0, 100)).toEqual({ score: 100, best: 100, previousBest: 0, isRecord: true });
    expect(applyBlitzScore(300, 400).isRecord).toBe(true);
    expect(applyBlitzScore(300, 300).isRecord).toBe(false);
    expect(applyBlitzScore(300, 120).isRecord).toBe(false);
  });

  it('нулевой счёт рекордом не становится даже на пустом хранилище', () => {
    const outcome = applyBlitzScore(0, 0);
    expect(outcome.isRecord).toBe(false);
    expect(outcome.best).toBe(0);
  });

  it('проигранный раунд не сбивает уже поставленный рекорд', () => {
    expect(applyBlitzScore(900, 50).best).toBe(900);
  });

  it('мусор вместо чисел не ломает подсчёт', () => {
    expect(normalizeScore(NaN)).toBe(0);
    expect(normalizeScore(-40)).toBe(0);
    expect(normalizeScore(12.7)).toBe(12);
    expect(normalizeScore('700')).toBe(0);
    expect(applyBlitzScore(undefined, Infinity)).toEqual({
      score: 0,
      best: 0,
      previousBest: 0,
      isRecord: false,
    });
  });
});

describe('разбор сохранённого рекорда', () => {
  it('пусто / битый JSON / чужая форма — рекорда нет', () => {
    expect(parseBlitzRecord(null)).toEqual({ best: 0, updatedAt: 0 });
    expect(parseBlitzRecord('   ')).toEqual({ best: 0, updatedAt: 0 });
    expect(parseBlitzRecord('{oops')).toEqual({ best: 0, updatedAt: 0 });
    expect(parseBlitzRecord('[1,2]')).toEqual({ best: 0, updatedAt: 0 });
    expect(parseBlitzRecord('{"best":"много"}')).toEqual({ best: 0, updatedAt: 0 });
  });

  it('нормальная запись читается как есть', () => {
    expect(parseBlitzRecord('{"best":1250,"updatedAt":17}')).toEqual({ best: 1250, updatedAt: 17 });
  });
});

describe('хранение рекорда', () => {
  it('первый результат становится рекордом и переживает перезапуск', async () => {
    const first = await commitBlitzScore(800, 111);
    expect(first.isRecord).toBe(true);
    expect(first.best).toBe(800);

    __resetBlitzRecordForTests();
    await expect(getBlitzBest()).resolves.toBe(800);
    expect(JSON.parse((await AsyncStorage.getItem(FC_BLITZ_BEST_KEY)) ?? '{}')).toEqual({
      best: 800,
      updatedAt: 111,
    });
  });

  it('слабый раунд рекорд не перетирает', async () => {
    await commitBlitzScore(800, 1);
    const weaker = await commitBlitzScore(120, 2);

    expect(weaker.isRecord).toBe(false);
    expect(weaker.best).toBe(800);
    __resetBlitzRecordForTests();
    await expect(getBlitzBest()).resolves.toBe(800);
  });

  it('подряд идущие записи не теряют друг друга (очередь записи)', async () => {
    const [a, b, c] = await Promise.all([
      commitBlitzScore(100, 1),
      commitBlitzScore(500, 2),
      commitBlitzScore(300, 3),
    ]);

    expect([a.isRecord, b.isRecord, c.isRecord]).toEqual([true, true, false]);
    __resetBlitzRecordForTests();
    await expect(getBlitzBest()).resolves.toBe(500);
  });

  it('без записанного рекорда лучший результат — 0', async () => {
    await expect(getBlitzBest()).resolves.toBe(0);
  });
});
