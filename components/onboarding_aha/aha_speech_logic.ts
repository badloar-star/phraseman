// Pure-логика бита 3 («скажи вслух») АХ-сцены. Без React/RN-импортов —
// тестируется как чистый модуль (tests/onboarding_aha_speech_logic.test.ts).

import { speakingMatchedFlags } from '../../app/speaking_word_match';
import type { SpokenWordEntry } from '../../app/speaking_word_report';

/** Мягкий порог успеха: половина слов прозвучала — уже победа. */
export const SOFT_SUCCESS_THRESHOLD_PCT = 50;

export interface SoftSpeechOutcome {
  /** Доля слов, которые прозвучали (clean/fuzzy), 0..100. */
  pct: number;
  /** pct >= 50 — мы продаём момент «я говорю», а не экзаменуем. */
  success: boolean;
}

/**
 * Мягкая оценка попытки по пословной карте: pct = доля слов со статусом
 * 'clean' или 'fuzzy' (округление до целого), success при pct >= 50.
 */
export function softSpeechOutcome(report: readonly SpokenWordEntry[]): SoftSpeechOutcome {
  if (report.length === 0) return { pct: 0, success: false };
  const heard = report.filter((w) => w.status === 'clean' || w.status === 'fuzzy').length;
  const pct = Math.round((heard / report.length) * 100);
  return { pct, success: pct >= SOFT_SUCCESS_THRESHOLD_PCT };
}

/** Сколько слов цели «услышано» в транскрипте (выбор лучшей гипотезы движка). */
export function countMatchedWords(target: string, transcript: string): number {
  if (!transcript.trim()) return 0;
  return speakingMatchedFlags(target, transcript).filter(Boolean).length;
}

/**
 * Лучший из двух транскриптов против цели: побеждает тот, где «услышано»
 * больше слов цели. При равенстве остаётся текущий (первая полная гипотеза),
 * чтобы поздний обрывок не затирал уже собранную фразу.
 */
export function pickBetterTranscript(
  target: string,
  current: string,
  candidate: string,
): string {
  const cand = candidate.trim();
  if (!cand) return current;
  if (!current.trim()) return cand;
  return countMatchedWords(target, cand) > countMatchedWords(target, current) ? cand : current;
}
