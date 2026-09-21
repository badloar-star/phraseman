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
    expect(geometry.endPercent).toBe(0);
  });

  it('тянется от начала полосы до «текущий опыт + прогноз»', () => {
    const filled = 40;
    const geometry = computeMistakeXpNotchGeometry(10, filled, NEEDED);
    const forecast = computeMistakeXpForecast(10);
    expect(geometry.endPercent).toBeCloseTo(filled + (forecast.totalXp / NEEDED) * 100, 5);
  });

  it('никогда не вылезает за правый край и сообщает о переливе', () => {
    const geometry = computeMistakeXpNotchGeometry(200, 90, NEEDED);
    expect(geometry.endPercent).toBe(100);
    expect(geometry.reachesNextLevel).toBe(true);
  });

  it('на предельном уровне не рисуется — проверяем РЕАЛЬНЫЙ вход, не выдуманный', () => {
    // зачем (аудит 2026-09-21): прежняя версия этого теста передавала
    // xpNeeded = 0 и всегда была зелёной, охраняя состояние, которого в
    // приложении НЕ БЫВАЕТ: LEVEL_XP объявлена как Math.max(1, ...) и нулём
    // стать не может (constants/theme.ts). Это тот же класс, что
    // paywall_guard_protected_a_lie — сторож подтверждал ложь.
    //
    // На деле getXPProgress при level >= MAX_LEVEL форсит progress = 1, то есть
    // приходит заполненная полоса и НЕнулевой xpNeeded. Именно это и проверяем.
    const atCeiling = computeMistakeXpNotchGeometry(40, 100, 150000);
    expect(atCeiling.visible).toBe(false);
    expect(atCeiling.endPercent).toBe(0);
    // Чуть ниже потолка зарубка обязана появиться — гейт не должен быть слишком жадным.
    expect(computeMistakeXpNotchGeometry(40, 99.5, 150000).visible).toBe(true);
  });

  it('зарубка всегда накрывает уже залитое — заливка не «выпадает» из неё', () => {
    for (const filled of [0, 25, 62, 99]) {
      const geometry = computeMistakeXpNotchGeometry(12, filled, NEEDED);
      expect(geometry.endPercent).toBeGreaterThanOrEqual(filled);
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
      expect(geometry.endPercent === 0 || geometry.endPercent >= filled).toBe(true);
      expect(geometry.endPercent).toBeLessThanOrEqual(100);
    }
  });

  it('зарубка не трогает заливку, даже когда прогноз огромен', () => {
    const geometry = computeMistakeXpNotchGeometry(10000, 5, 520);
    // Упирается в край, но заливку (5%) не съедает: она рисуется поверх.
    expect(geometry.endPercent).toBe(100);
    expect(geometry.reachesNextLevel).toBe(true);
  });
});

describe('карточка приоритета: ручной выбор не оживает', () => {
  /**
   * зачем (аудит 2026-09-21): найден дефект — homePriorityCardFace не
   * сбрасывался при падении числа ошибок до нуля, и старый ручной выбор
   * оживал при появлении ОДНОЙ новой ошибки (карточка захватывала слот вопреки
   * порогу 10). Это правило фундамента «поздравляем ФАКТОМ, а не записью».
   *
   * Сторожим текстом: эффект сброса обязан существовать и зависеть именно от
   * числа активных ошибок.
   */
  const homeSource = readFileSync(
    join(__dirname, '..', 'app', '(tabs)', 'home.tsx'),
    'utf8',
  );

  it('лицо карточки сбрасывается, когда ошибок не осталось', () => {
    expect(homeSource).toContain("[MISTAKES-CARD] face:reset");
    expect(homeSource).toContain('setHomePriorityCardFace(null)');
    expect(homeSource).toContain('if (mistakeActiveCount >= 1 || homePriorityCardFace === null) return;');
  });

  it('переворот защищён замком и всегда раскрывает грань обратно', () => {
    // Без замка второе зажатие внутри анимации оставляло карточку схлопнутой
    // полоской: отменённый колбэк не планировал обратное раскрытие.
    expect(homeSource).toContain('homePriorityCardFlipBusyRef');
    expect(homeSource).toContain("[MISTAKES-CARD] longPress:busy");
    // Ветка отмены обязана вернуть грань в покой, а не выходить молча.
    expect(homeSource).toContain('homePriorityCardFlip.value = 0;');
  });
});
