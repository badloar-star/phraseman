// home_review_hint — чистая логика подсказки «Повторить N слов · M мин» на Главной (удобство №8, владелец 04.11).
// зачем: когда слова начинают забываться (срок повторения подошёл), одним тапом — в мини-тренировку. Данные только локальные (память карточек), 0 чтений Firebase.
import type { FlashcardStatusMap } from './flashcards/cardStatus';

/** Показываем подсказку, только когда просрочено не меньше стольких слов — мелочь не отвлекает. */
export const HOME_REVIEW_MIN_WORDS = 5;
/** Сколько секунд в среднем уходит на одно слово в мини-тренировке (оценка для «мин»). */
export const HOME_REVIEW_SECONDS_PER_WORD = 6;
/** Потолок мини-тренировки: длиннее — уже не «мини». */
export const HOME_REVIEW_MAX_SESSION = 15;

export type HomeReviewHint = Readonly<{ words: number; minutes: number; sessionSize: number }>;

/** Сколько карточек «пора повторить» (статус review) — слабые и новые сюда не входят. */
export function countDueWords(statuses: FlashcardStatusMap): number {
  let due = 0;
  for (const id of Object.keys(statuses)) if (statuses[id] === 'review') due += 1;
  return due;
}

/** Подсказка или null, если слов меньше порога. Минуты — вверх, не меньше 1. */
export function buildHomeReviewHint(dueWords: number): HomeReviewHint | null {
  const words = Number.isFinite(dueWords) ? Math.max(0, Math.trunc(dueWords)) : 0;
  if (words < HOME_REVIEW_MIN_WORDS) return null;
  const sessionSize = Math.min(words, HOME_REVIEW_MAX_SESSION);
  const minutes = Math.max(1, Math.ceil((sessionSize * HOME_REVIEW_SECONDS_PER_WORD) / 60));
  return { words, minutes, sessionSize };
}
