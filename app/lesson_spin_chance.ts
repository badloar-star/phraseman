// ════════════════════════════════════════════════════════════════════════════
// lesson_spin_chance.ts — решение «выдать ли спин за пройденный урок».
//
// зачем (владелец, 2026-09-17): «спин это привилегия» — раньше КАЖДОЕ первое
// прохождение полного урока и первой сессии курса выдавало спин со 100%
// вероятностью, и приз обесценился. Теперь бросок с шансом 20%.
//
// Решение вынесено в чистую функцию намеренно: `Math.random()` врассыпную по
// точкам выдачи невозможно протестировать и легко разойдётся по значениям
// шанса. Здесь — один источник правды на все источники «спина за урок».
//
// Бросок делается ТОЛЬКО за полный урок и за сессию курса Learning V2.
// Словарь и неправильные глаголы спин не выдают вовсе (и не выдавали) —
// сторож tests/lesson_spin_privilege_contract.test.ts это фиксирует.
// ════════════════════════════════════════════════════════════════════════════

/** Шанс спина за первое прохождение урока/сессии курса. */
export const LESSON_SPIN_CHANCE = 0.2;

/**
 * Сколько подряд неудачных бросков гарантируют спин следующим.
 *
 * зачем (владелец, 2026-09-17): при чистых 20% полоса невезения в 10+ уроков
 * вполне реальна и ощущается как «механика сломана». Страховка убирает хвост
 * распределения, не трогая ощущение редкости приза.
 */
export const LESSON_SPIN_PITY_THRESHOLD = 8;

export type LessonSpinRollInput = {
  /** Сколько бросков подряд уже не дали спина (из локального состояния). */
  misses: number;
  /** Источник случайности; подменяется в тестах. По умолчанию Math.random. */
  random?: () => number;
};

export type LessonSpinRollOutcome = {
  /** Выдавать ли кредит спина. */
  granted: boolean;
  /** Новое значение счётчика невезения — записать в состояние. */
  nextMisses: number;
  /** Сработала ли страховка (для логов; в UI не показывается). */
  pity: boolean;
};

/** Нормализует счётчик из хранилища: мусор и отрицательное считаем нулём. */
export function normalizeLessonSpinMisses(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) return 0;
  // Потолок держим близко к порогу: выше него счётчик смысла не несёт, а
  // раздутое число из повреждённого состояния не должно жить в хранилище.
  return Math.min(value, LESSON_SPIN_PITY_THRESHOLD);
}

/**
 * Один бросок за первое прохождение урока/сессии. Никогда не бросает.
 *
 * Важно: вызывающий ОБЯЗАН записать идентификатор урока в issuedCreditIds и
 * при `granted: false` тоже. Иначе неудачный бросок не оставит следа, и
 * перепрохождение урока даст новый бросок — фарм, запрещённый владельцем.
 */
export function rollLessonSpin(input: LessonSpinRollInput): LessonSpinRollOutcome {
  const misses = normalizeLessonSpinMisses(input.misses);
  if (misses >= LESSON_SPIN_PITY_THRESHOLD) {
    return { granted: true, nextMisses: 0, pity: true };
  }
  const roll = typeof input.random === 'function' ? input.random() : Math.random();
  // Нечисловой результат подменённого генератора трактуем как «не повезло»:
  // тихо выдать спин на мусорном значении хуже, чем не выдать.
  const granted = Number.isFinite(roll) && roll < LESSON_SPIN_CHANCE;
  return {
    granted,
    nextMisses: granted ? 0 : misses + 1,
    pity: false,
  };
}

// Required by Expo Router — not a screen
export default {};
