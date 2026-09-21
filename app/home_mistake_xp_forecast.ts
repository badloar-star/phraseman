/**
 * Прогноз опыта за разбор ошибок — «зарубка» на полосе опыта Главной.
 *
 * зачем (владелец 2026-09-21): «показывалось реально на полоске точно столько
 * опыта сколько юзер получит исправив все ошибки что у него есть». Зарубка
 * заменила отдельную кнопку «Ошибки» у заголовка «Сегодня»: вход в раздел
 * живёт теперь на самой полосе, а экран стал короче на целый ряд.
 *
 * ГЛАВНЫЙ ИНВАРИАНТ: зарубка НЕ уменьшает и не задерживает заливку опыта.
 * Формула уровня не трогается: повышение происходит ровно тогда же, когда и
 * раньше. Владелец: «оно не должно препятствовать повышению уровня».
 *
 * КАК РИСУЕТСЯ (описание приведено к реализации, аудит 2026-09-21 нашёл
 * расхождение): зарубка — слой ПОД заливкой шириной до endPercent. Заливка
 * рисуется поверх и закрывает её левую часть, поэтому видимым остаётся хвост
 * справа — ровно «сколько ещё вернётся». Оба слоя ведёт ОДНА и та же
 * анимированная величина, иначе при наливании полосы они расходятся.
 *
 * Прежний JSDoc обещал «слой под заливкой», а код позиционировал зарубку от
 * КОНЦА заливки статичным процентом — три источника правды (комментарий, имя
 * поля, тест) разошлись с реализацией. Не повторять: правя одно, правь все.
 *
 * Размеры наград ПОВТОРЕНЫ здесь намеренно, а не импортированы из
 * mistake_practice_rewards.ts. Тот модуль тянет за собой Firestore, learning-v2
 * и криптографию: импорт ради двух чисел утащил бы весь этот граф в первый
 * кадр Главной (при сборке теста он честно выел всю память процесса).
 *
 * Чтобы копия не разошлась с оригиналом, её сторожит
 * tests/home_mistake_xp_forecast_contract.test.ts: он читает
 * mistake_practice_rewards.ts ТЕКСТОМ и сверяет числа, ничего не импортируя.
 * Разойдутся — сборка упадёт.
 */

/** Опыт за одну самостоятельно исправленную ошибку (MISTAKE_PRACTICE_ANSWER_XP). */
export const MISTAKE_FORECAST_ANSWER_XP = 5;

/** Доплата за завершённый разбор (MISTAKE_PRACTICE_COMPLETION_XP). */
export const MISTAKE_FORECAST_COMPLETION_XP = 10;

/**
 * Минимум ошибок, при котором за завершение разбора доплачивают.
 *
 * settleMistakePracticeCompletionReward отказывает при `initialCount < 5`.
 */
export const MISTAKE_COMPLETION_BONUS_MIN_COUNT = 5;

export interface MistakeXpForecast {
  /** Сколько ошибок учтено (нормализованное неотрицательное целое). */
  readonly count: number;
  /** Опыт за сами исправления. */
  readonly answersXp: number;
  /** Доплата за завершённый разбор; 0 — ошибок меньше порога. */
  readonly completionBonusXp: number;
  /** Верхняя граница: всё, что вернётся при идеальном разборе. */
  readonly totalXp: number;
}

/**
 * Верхняя граница опыта за разбор ВСЕХ активных ошибок.
 *
 * Это именно верхняя граница, а не обещание: опыт за ответ начисляется только
 * при самостоятельном правильном ответе в production-режиме
 * (см. settleMistakePracticeAnswerRewards), поэтому часть попыток даст ноль.
 * Интерфейс обязан говорить «до», а не точное число.
 */
export function computeMistakeXpForecast(activeCount: number): MistakeXpForecast {
  const count = Number.isFinite(activeCount) ? Math.max(0, Math.floor(activeCount)) : 0;
  if (count === 0) {
    return Object.freeze({ count: 0, answersXp: 0, completionBonusXp: 0, totalXp: 0 });
  }
  const answersXp = count * MISTAKE_FORECAST_ANSWER_XP;
  const completionBonusXp = count >= MISTAKE_COMPLETION_BONUS_MIN_COUNT
    ? MISTAKE_FORECAST_COMPLETION_XP
    : 0;
  return Object.freeze({
    count,
    answersXp,
    completionBonusXp,
    totalXp: answersXp + completionBonusXp,
  });
}

export interface MistakeXpNotchGeometry {
  /** Рисовать ли зарубку вообще. */
  readonly visible: boolean;
  /**
   * КООРДИНАТА ПРАВОГО КРАЯ зарубки в процентах дорожки, считая от её начала.
   * Это «докуда дойдёт опыт», а не ширина видимой части: слева зарубку
   * закрывает заливка. Всегда в [0, 100] — за правый край не вылезает.
   *
   * Имя важно: поле называлось widthPercent, и это уже разошлось с
   * реализацией (аудит 2026-09-21). Ширина и координата конца совпадают
   * только когда заливка на нуле.
   */
  readonly endPercent: number;
  /** Прогноз упирается в конец уровня — опыта хватит на повышение. */
  readonly reachesNextLevel: boolean;
  /** Верхняя граница опыта — для метки доступности. */
  readonly forecastXp: number;
}

/**
 * Геометрия зарубки на дорожке.
 *
 * @param activeCount   активные ошибки
 * @param xpBarPercent  текущая заливка уровня в процентах (homeXpBarPercent)
 * @param xpNeeded      сколько опыта нужно на весь текущий уровень
 *
 * Зарубка тянется от левого края дорожки до «текущий опыт + прогноз»
 * (endPercent). Заливка рисуется ПОВЕРХ и закрывает её левую часть, поэтому
 * видимым остаётся только хвост справа. При нуле ошибок зарубки нет совсем —
 * так она и «пропадает» сама, без ручного закрытия и без durable-очередей
 * (правило фундамента).
 */
export function computeMistakeXpNotchGeometry(
  activeCount: number,
  xpBarPercent: number,
  xpNeeded: number,
): MistakeXpNotchGeometry {
  const forecast = computeMistakeXpForecast(activeCount);
  const safeNeeded = Number.isFinite(xpNeeded) && xpNeeded > 0 ? xpNeeded : 0;
  const safeFilled = Number.isFinite(xpBarPercent)
    ? Math.min(100, Math.max(0, xpBarPercent))
    : 0;
  // зачем (аудит 2026-09-21): гейт по ФАКТУ заполненности, а не по xpNeeded = 0.
  // LEVEL_XP объявлена как Math.max(1, ...) и нулём быть НЕ может, поэтому
  // прежняя проверка `safeNeeded <= 0` была мертва, а тест на неё — всегда
  // зелёным (тот же класс, что paywall_guard_protected_a_lie). На предельном
  // уровне getXPProgress форсит progress = 1 → safeFilled = 100, и зарубке
  // физически негде рисоваться: полоса упёрлась в правый край.
  if (forecast.totalXp <= 0 || safeNeeded <= 0 || safeFilled >= 100) {
    return Object.freeze({
      visible: false,
      endPercent: 0,
      reachesNextLevel: false,
      forecastXp: forecast.totalXp,
    });
  }
  const gainPercent = (forecast.totalXp / safeNeeded) * 100;
  const rawEnd = safeFilled + gainPercent;
  return Object.freeze({
    visible: true,
    endPercent: Math.min(100, rawEnd),
    reachesNextLevel: rawEnd >= 100,
    forecastXp: forecast.totalXp,
  });
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
