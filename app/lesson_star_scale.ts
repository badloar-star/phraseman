/**
 * Единая учебная шкала уроков и экзаменов (D121 / PM-152, владелец 2026-09-30).
 *
 * Хранимая оценка урока — число 0…5 (correct / denominator × 5, см.
 * lesson_star_score.ts). Все пороги ниже заданы в ПРОЦЕНТАХ правильных, а в
 * оценку 0…5 переводятся здесь и только здесь, чтобы список уроков, меню
 * урока, замки и экзамены не расходились в собственных «магических» 2 / 2.5 /
 * 4.5 / 5.0.
 *
 * зачем (D121): «2★ за урок = от 60% правильных». До D121 следующий урок
 * открывался от оценки 2 из 5 (40%), а звёзды на экране рисовались по D36
 * (2★ от 60%) — человек видел 1★ и получал открытый урок. Теперь порог
 * открытия и 2★ — одно и то же число.
 *
 * Модуль чистый (без импортов), его можно тянуть в любой бандл без цены.
 */

export const LESSON_SCORE_MAX = 5;

/** D36/D121: 2★ — от 60%, 3★ — от 85%, всё, что ниже 60%, — 1★. */
export const LESSON_TWO_STARS_PERCENT = 60;
export const LESSON_THREE_STARS_PERCENT = 85;

/** D121: следующий урок открывается ровно от 2★. */
export const LESSON_UNLOCK_PERCENT = LESSON_TWO_STARS_PERCENT;

/**
 * Порог до D121 (D71: оценка 2 из 5 = 40%). Нужен ТОЛЬКО для grandfathering:
 * урок, который уже был открыт по старому правилу, не закрывается.
 */
export const LEGACY_LESSON_UNLOCK_PERCENT = 40;

/**
 * PM-152: пороги экзаменов на той же процентной шкале:
 * - зачёт уровня открывается, когда все уроки уровня на 2★ (≥ 60%) —
 *   владелец 2026-09-30, D125: «60 как на макете» (было 90%, прежние 4.5);
 *   уже открытый зачёт (level_exam_*_available) не пересчитывается;
 * - экзамен Лингмана — когда все 32 урока = 100% (прежние 5.0), не менялся;
 * - сам зачёт уровня сдаётся от 70% (level_exam.tsx, PASS_PCT).
 */
export const LEVEL_EXAM_UNLOCK_LESSON_PERCENT = LESSON_TWO_STARS_PERCENT;
export const LINGMAN_EXAM_UNLOCK_LESSON_PERCENT = 100;
export const LEVEL_EXAM_PASS_PERCENT = 70;

// Допуск на двоичную арифметику: 30/50×5 должно давать ровно 60%, а не 59.999…
const PERCENT_EPSILON = 1e-6;

export function lessonScoreToPercent(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  return (Math.min(score, LESSON_SCORE_MAX) * 100) / LESSON_SCORE_MAX;
}

/** Процент → оценка 0…5 (60% → 3). Для текстов и совместимых констант. */
export function lessonPercentToScore(percent: number): number {
  return (percent * LESSON_SCORE_MAX) / 100;
}

export function lessonScoreMeetsPercent(score: number, percent: number): boolean {
  return lessonScoreToPercent(score) + PERCENT_EPSILON >= percent;
}

/** Оценка открытия следующего урока в шкале 0…5 (D121: 3.0). */
export const LESSON_UNLOCK_SCORE = lessonPercentToScore(LESSON_UNLOCK_PERCENT);
export const LEGACY_LESSON_UNLOCK_SCORE = lessonPercentToScore(LEGACY_LESSON_UNLOCK_PERCENT);

/**
 * Открывает ли оценка предыдущего урока следующий.
 *
 * зачем (D121, «уже открытые уроки при пересчёте не закрываются»): доступ к
 * урокам вычисляется из оценок на каждом входе, поэтому простое поднятие
 * порога до 60% молча закрыло бы урок тем, кто открыл его по старому правилу
 * (40–59%). Grandfathering: если следующий урок УЖЕ лежит в сохранённом списке
 * открытых (`unlocked_lessons`) И оценка предыдущего проходила старый порог —
 * урок остаётся открытым. Новые открытия идут только от 60%. Условие по
 * старому порогу не даёт расширить доступ записями из периода, когда курс был
 * открыт целиком.
 */
export function previousLessonScoreOpensNext(
  previousScore: number,
  nextAlreadyPersistedUnlocked = false,
): boolean {
  if (lessonScoreMeetsPercent(previousScore, LESSON_UNLOCK_PERCENT)) return true;
  return nextAlreadyPersistedUnlocked
    && lessonScoreMeetsPercent(previousScore, LEGACY_LESSON_UNLOCK_PERCENT);
}

/** Все оценки диапазона дотягивают до процента (для экзаменов). */
export function allLessonScoresMeetPercent(scores: readonly number[], percent: number): boolean {
  return scores.every((score) => lessonScoreMeetsPercent(score, percent));
}

/** D36/D121: число звёзд по оценке 0…5; нет оценки → 0. */
export function lessonStarCountFromPercent(scorePercent: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(scorePercent) || scorePercent < 0 || scorePercent > 100) return 0;
  if (scorePercent + PERCENT_EPSILON >= LESSON_THREE_STARS_PERCENT) return 3;
  if (scorePercent + PERCENT_EPSILON >= LESSON_TWO_STARS_PERCENT) return 2;
  return 1;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
