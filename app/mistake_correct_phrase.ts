import type { MistakeDiffSegment } from './mistake_answer_diff';

/**
 * Готовая фраза для экрана «Верно» в отработке ошибок.
 *
 * зачем (владелец 11.11: «зачем тут 2 — work, works?»): после верного выбора экран повторял оба варианта ответа, хотя
 * человек уже выбрал правильный. Вместо этого показываем фразу целиком, а выбранное слово в ней подсвечиваем — видно
 * результат, а не повтор вариантов. При неверном выборе два варианта остаются: там они показывают «выбрал» против «верно».
 *
 * Чистая функция: фраза и выбранный ответ на входе, размеченные слова на выходе (тот же формат, что у разбора промаха).
 */

/** Слово для сравнения: без регистра и без знаков по краям («work?» = «Work»). */
const bare = (word: string): string => word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

const words = (text: string): string[] => text.trim().split(/\s+/).filter((word) => word.length > 0);

export function buildCorrectPhraseSegments(input: Readonly<{ phrase: string; highlight: string }>): MistakeDiffSegment[] {
  const phraseWords = words(input.phrase);
  if (phraseWords.length === 0) return [];
  const target = words(input.highlight).map(bare).filter((word) => word.length > 0);

  // Ищем первое место, где выбранный ответ стоит во фразе подряд.
  let start = -1;
  if (target.length > 0 && target.length < phraseWords.length) {
    for (let index = 0; index + target.length <= phraseWords.length; index += 1) {
      if (target.every((word, offset) => bare(phraseWords[index + offset] ?? '') === word)) {
        start = index;
        break;
      }
    }
  }

  // Ответ — вся фраза, либо его во фразе нет: ничего не выдумываем, подсвечиваем фразу целиком.
  if (start < 0) return phraseWords.map((text) => ({ text, tone: 'right' as const }));

  return phraseWords.map((text, index) => ({
    text,
    tone: index >= start && index < start + target.length ? ('right' as const) : ('plain' as const),
  }));
}
