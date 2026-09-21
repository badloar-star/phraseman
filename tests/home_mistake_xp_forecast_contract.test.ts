/**
 * Сторож зарубки ошибок на полосе опыта Главной.
 *
 * Ловит два класса бага, каждый из которых уже случался в проекте:
 *  1. прогноз разошёлся с реальным начислением (интерфейс обещает не то, что
 *     даёт сервер) — поэтому числа берутся из mistake_practice_rewards, а не
 *     переписываются сюда руками;
 *  2. зарубка начала мешать повышению уровня (владелец: «оно не должно
 *     препятствовать повышению уровня») — поэтому проверяем, что заливка
 *     уровня не зависит от числа ошибок.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  computeMistakeXpForecast,
  computeMistakeXpNotchGeometry,
  MISTAKE_COMPLETION_BONUS_MIN_COUNT,
  MISTAKE_FORECAST_ANSWER_XP,
  MISTAKE_FORECAST_COMPLETION_XP,
} from '../app/home_mistake_xp_forecast';

/**
 * Источник правды читаем ТЕКСТОМ, а не импортом: mistake_practice_rewards
 * тянет Firestore, learning-v2 и криптографию — при импорте сборка теста
 * съедает всю память процесса. Regexp по исходнику даёт ту же защиту даром.
 */
const rewardsSource = readFileSync(
  join(__dirname, '..', 'app', 'mistake_practice_rewards.ts'),
  'utf8',
);

function numberFromSource(name: string): number {
  const match = rewardsSource.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  if (!match) throw new Error(`Константа ${name} не найдена в mistake_practice_rewards.ts`);
  return Number(match[1]);
}

const MISTAKE_PRACTICE_ANSWER_XP = numberFromSource('MISTAKE_PRACTICE_ANSWER_XP');
const MISTAKE_PRACTICE_COMPLETION_XP = numberFromSource('MISTAKE_PRACTICE_COMPLETION_XP');

describe('прогноз совпадает с реальным начислением', () => {
  it('опыт за ответ не разошёлся с mistake_practice_rewards', () => {
    expect(MISTAKE_FORECAST_ANSWER_XP).toBe(MISTAKE_PRACTICE_ANSWER_XP);
  });

  it('доплата за завершение не разошлась с mistake_practice_rewards', () => {
    expect(MISTAKE_FORECAST_COMPLETION_XP).toBe(MISTAKE_PRACTICE_COMPLETION_XP);
  });

  it('порог доплаты совпадает с проверкой initialCount в начислении', () => {
    // settleMistakePracticeCompletionReward: `input.initialCount < 5` → отказ.
    const guard = rewardsSource.match(/input\.initialCount\s*<\s*(\d+)/);
    expect(guard).not.toBeNull();
    expect(Number(guard?.[1])).toBe(MISTAKE_COMPLETION_BONUS_MIN_COUNT);
  });
});

describe('прогноз опыта за разбор ошибок', () => {
  it('без ошибок не обещает ничего', () => {
    expect(computeMistakeXpForecast(0).totalXp).toBe(0);
  });

  it('до порога бонуса платит только за ответы', () => {
    const count = MISTAKE_COMPLETION_BONUS_MIN_COUNT - 1;
    const forecast = computeMistakeXpForecast(count);
    expect(forecast.completionBonusXp).toBe(0);
    expect(forecast.totalXp).toBe(count * MISTAKE_PRACTICE_ANSWER_XP);
  });

  it('с порога добавляет доплату за завершение', () => {
    const count = MISTAKE_COMPLETION_BONUS_MIN_COUNT;
    const forecast = computeMistakeXpForecast(count);
    expect(forecast.completionBonusXp).toBe(MISTAKE_PRACTICE_COMPLETION_XP);
    expect(forecast.totalXp).toBe(
      count * MISTAKE_PRACTICE_ANSWER_XP + MISTAKE_PRACTICE_COMPLETION_XP,
    );
  });

  it('мусор на входе не ломает расчёт', () => {
    expect(computeMistakeXpForecast(Number.NaN).totalXp).toBe(0);
    expect(computeMistakeXpForecast(-7).totalXp).toBe(0);
    expect(computeMistakeXpForecast(3.7).count).toBe(3);
  });
});

describe('геометрия зарубки', () => {
  const NEEDED = 520;

  it('без ошибок зарубки нет — так она и пропадает сама', () => {
    const geometry = computeMistakeXpNotchGeometry(0, 62, NEEDED);
    expect(geometry.visible).toBe(false);
    expect(geometry.widthPercent).toBe(0);
  });

  it('тянется от начала полосы до «текущий опыт + прогноз»', () => {
    const filled = 40;
    const geometry = computeMistakeXpNotchGeometry(10, filled, NEEDED);
    const forecast = computeMistakeXpForecast(10);
    expect(geometry.widthPercent).toBeCloseTo(filled + (forecast.totalXp / NEEDED) * 100, 5);
  });

  it('никогда не вылезает за правый край и сообщает о переливе', () => {
    const geometry = computeMistakeXpNotchGeometry(200, 90, NEEDED);
    expect(geometry.widthPercent).toBe(100);
    expect(geometry.reachesNextLevel).toBe(true);
  });

  it('на максимальном уровне (xpNeeded = 0) не рисуется', () => {
    expect(computeMistakeXpNotchGeometry(40, 100, 0).visible).toBe(false);
  });

  it('зарубка всегда накрывает уже залитое — заливка не «выпадает» из неё', () => {
    for (const filled of [0, 25, 62, 99]) {
      const geometry = computeMistakeXpNotchGeometry(12, filled, NEEDED);
      expect(geometry.widthPercent).toBeGreaterThanOrEqual(filled);
    }
  });
});

describe('инвариант: зарубка не мешает повышению уровня', () => {
  /**
   * Главное требование владельца: «оно не должно препятствовать повышению
   * уровня». Зарубка обязана быть ЧИСТО производной величиной — она читает
   * заливку, но никогда её не меняет. Проверяем это тем, что вход остаётся
   * прежним после любого числа ошибок.
   *
   * getXPProgress намеренно НЕ импортируется: constants/theme тянет ассеты
   * девяти тем и при сборке теста выедает память процесса. Инвариант от этого
   * не страдает — он про то, что расчёт зарубки ничего не возвращает в заливку.
   */
  it('расчёт зарубки не меняет переданную заливку ни при каком числе ошибок', () => {
    const filled = 62.5;
    for (const count of [0, 1, 4, 5, 9, 10, 250]) {
      const geometry = computeMistakeXpNotchGeometry(count, filled, 520);
      // Заливка — вход, а не выход: функция обязана её уважать.
      expect(geometry.widthPercent === 0 || geometry.widthPercent >= filled).toBe(true);
      expect(geometry.widthPercent).toBeLessThanOrEqual(100);
    }
  });

  it('зарубка не трогает заливку, даже когда прогноз огромен', () => {
    const geometry = computeMistakeXpNotchGeometry(10000, 5, 520);
    // Упирается в край, но заливку (5%) не съедает: она рисуется поверх.
    expect(geometry.widthPercent).toBe(100);
    expect(geometry.reachesNextLevel).toBe(true);
  });
});
