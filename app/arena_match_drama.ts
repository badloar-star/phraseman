// Чистая логика «драмы» матча Арены — без React/Firestore, легко тестируется.
//
// Сюда вынесены решения, которые делают бой напряжённым:
//  - ответил ли соперник на текущий вопрос (для индикатора в табло);
//  - наступил ли «решающий вопрос» (последний при близком счёте);
//  - кто победил и с каким исходом (для финального экрана матча).
//
// Все функции — чистые: одни и те же входы → один и тот же результат, без мутаций.

import type { SessionPlayer } from './types/arena';

/** Исход матча с точки зрения текущего игрока. */
export type ArenaMatchOutcome = 'win' | 'loss' | 'draw';

/**
 * Ответил ли соперник на вопрос с индексом `questionIndex` (0-based).
 *
 * Опираемся на `answers.length`: как только соперник сдаёт ответ на N-й вопрос,
 * длина массива становится N+1. Это работает и для реальных матчей, и для комнат.
 * Для бот-моков индикатор управляется отдельно (имитация задержки).
 */
export function hasOpponentAnswered(
  opponent: Pick<SessionPlayer, 'answers'> | null | undefined,
  questionIndex: number,
): boolean {
  if (!opponent || !Array.isArray(opponent.answers)) return false;
  if (!Number.isFinite(questionIndex) || questionIndex < 0) return false;
  return opponent.answers.length >= questionIndex + 1;
}

/** Параметры триггера «решающего вопроса». */
export interface LastQuestionDramaParams {
  /** Индекс текущего вопроса (0-based). */
  currentQuestionIndex: number;
  /** Сколько всего вопросов в матче. */
  totalQuestions: number;
  /** Мой текущий счёт. */
  myScore: number;
  /** Счёт соперника. */
  opponentScore: number;
  /** Максимальная разница очков, при которой вопрос считается «решающим». По умолчанию — цена одного верного ответа. */
  closeThreshold?: number;
}

/**
 * Наступил ли «решающий вопрос»: это последний вопрос матча И разрыв в счёте
 * настолько мал, что один ответ может перевернуть исход.
 *
 * `closeThreshold` по умолчанию = 100 (стоимость одного верного ответа в Арене,
 * см. SCORE_CONFIG.correctPoints). Передавай явно, если стоимость меняется.
 */
export function isLastQuestionDrama({
  currentQuestionIndex,
  totalQuestions,
  myScore,
  opponentScore,
  closeThreshold = 100,
}: LastQuestionDramaParams): boolean {
  if (!Number.isFinite(totalQuestions) || totalQuestions <= 0) return false;
  if (!Number.isFinite(currentQuestionIndex) || currentQuestionIndex < 0) return false;
  const isLast = currentQuestionIndex === totalQuestions - 1;
  if (!isLast) return false;
  const gap = Math.abs((myScore ?? 0) - (opponentScore ?? 0));
  return gap <= Math.max(0, closeThreshold);
}

/**
 * Исход матча для текущего игрока по финальным очкам.
 * Ничья только при строгом равенстве.
 */
export function resolveMatchOutcome(myScore: number, opponentScore: number): ArenaMatchOutcome {
  const me = Number.isFinite(myScore) ? myScore : 0;
  const opp = Number.isFinite(opponentScore) ? opponentScore : 0;
  if (me > opp) return 'win';
  if (me < opp) return 'loss';
  return 'draw';
}
