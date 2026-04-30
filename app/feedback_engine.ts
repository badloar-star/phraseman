import { normalize } from '../constants/contractions';
import type { ErrorTrap, PhraseErrorTraps, FeedbackResult } from './types/feedback';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Нормализует текст для сравнения:
 * раскрывает сокращения, приводит к нижнему регистру,
 * убирает знаки пунктуации, схлопывает пробелы.
 */
export const normalizeForComparison = (text: string): string => {
  const base = normalize(text);
  return base.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

const sortTriggersByLengthDesc = (triggers: readonly string[]): string[] =>
  [...triggers].sort((a, b) => b.length - a.length);

const findMatchedTrigger = (trap: ErrorTrap, normalized: string): string | undefined =>
  sortTriggersByLengthDesc(trap.trigger).find((trigger) =>
    normalized.includes(normalizeForComparison(trigger)),
  );

// ─── Per-word engine (основная система) ──────────────────────────────────────

/**
 * Главная функция. Сравнивает ответ пользователя с правильным ПОСЛОВНО.
 * Для каждого неправильного слова ищет WordTrap с совпадающим wordIndex.
 * Возвращает ВСЕ найденные подсказки (одну на каждое ошибочное слово).
 *
 * Если wordTraps не заданы — падает на старую trigger-систему.
 */
export const findAllExplanations = (
  userAnswer: string,
  correctAnswer: string,
  errorTraps: PhraseErrorTraps | null | undefined,
  quizMode = false,
): FeedbackResult | null => {
  if (!errorTraps) return null;

  // ── 1. Per-word подсказки (только если correctAnswer задан) ──────────────
  if (correctAnswer && errorTraps.wordTraps && errorTraps.wordTraps.length > 0) {
    const userWords   = normalizeForComparison(userAnswer).split(/\s+/);
    const correctWords = normalizeForComparison(correctAnswer).split(/\s+/);

    const hints: string[] = [];
    const errorWords: { wordIndex: number; userWord: string; correctWord: string; hint: string }[] = [];

    for (const wt of errorTraps.wordTraps) {
      const correct = correctWords[wt.wordIndex] ?? '';
      const user    = userWords[wt.wordIndex]    ?? '';
      if (user !== correct) {
        const hint = quizMode && wt.lite ? wt.lite : wt.hint;
        hints.push(hint);
        errorWords.push({
          wordIndex: wt.wordIndex,
          userWord: user,
          correctWord: correct,
          hint,
        });
      }
    }

    if (hints.length > 0) {
      return {
        explanation:  hints[0],
        explanations: hints,
        source:       'word_trap',
        errorWords,
      };
    }
  }

  // ── 2. Старые trigger-трапы (fallback) ───────────────────────────────────
  const normalized = normalizeForComparison(userAnswer);

  const sortedTraps = [...errorTraps.traps].sort((a, b) => {
    const maxA = Math.max(...a.trigger.map(t => t.length));
    const maxB = Math.max(...b.trigger.map(t => t.length));
    return maxB - maxA;
  });

  for (const trap of sortedTraps) {
    const matched = findMatchedTrigger(trap, normalized);
    if (matched !== undefined) {
      const explanation = quizMode && trap.lite !== undefined ? trap.lite : trap.explanation;
      return {
        explanation,
        explanations:   [explanation],
        source:         'trap',
        matchedTrigger: matched,
      };
    }
  }

  // ── 3. Общее правило (последний fallback) ─────────────────────────────────
  if (!errorTraps.generalRule) return null;

  const explanation = quizMode
    ? errorTraps.generalRule.slice(0, 100)
    : errorTraps.generalRule;

  return {
    explanation,
    explanations: [explanation],
    source:       'general_rule',
  };
};

/**
 * @deprecated Используй findAllExplanations
 * Оставлена для обратной совместимости (quiz_data и др.)
 */
export const findContextualExplanation = (
  userInput: string,
  errorTraps: PhraseErrorTraps | null | undefined,
  quizMode = false,
): FeedbackResult | null => {
  return findAllExplanations(userInput, '', errorTraps, quizMode);
};

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
