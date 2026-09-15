import { resolveAllMistakeTokens } from './mistake_token_resolver';

/**
 * Сравнение «твой ответ / верный ответ» для панели вердикта (макет промаха А).
 *
 * зачем (владелец 2026-09-14): раньше человек видел только правильный ответ и
 * шаблонную фразу — своего ответа рядом не было, и понять, ЧТО именно не так,
 * было невозможно. Здесь из готового LCS-выравнивания (mistake_token_resolver)
 * строятся две подсвеченные строки: пропуск, лишнее слово и замена видны глазом.
 *
 * Чистая функция без React: экран только рисует, правила сторожит тест.
 */

export type MistakeDiffKind = 'missing' | 'extra' | 'swap' | 'order' | 'none';

export type MistakeDiffSegment = Readonly<{
  text: string;
  /** 'gap' — место пропущенного слова в ответе ученика (рисуется плашкой). */
  tone: 'plain' | 'wrong' | 'right' | 'gap';
}>;

export interface MistakeAnswerDiff {
  readonly kind: MistakeDiffKind;
  /** Строка «ТЫ»: что человек ответил, с подсветкой расхождений. */
  readonly mine: readonly MistakeDiffSegment[];
  /** Строка «ВЕРНО»: правильный ответ с подсветкой того, что он упустил. */
  readonly correct: readonly MistakeDiffSegment[];
  /** Слова, которых не хватило (для формулы запоминания и подсветки токенов). */
  readonly missingWords: readonly string[];
  /** Слова, которые человек написал лишними или не те. */
  readonly wrongWords: readonly string[];
}

const words = (phrase: string): string[] => phrase.trim().split(/\s+/).filter(Boolean);

const sameMultiset = (left: readonly string[], right: readonly string[]): boolean => {
  if (left.length !== right.length) return false;
  const sort = (list: readonly string[]) => [...list].map((w) => w.toLowerCase().replace(/[.,!?;:]/g, '')).sort();
  return sort(left).join(' ') === sort(right).join(' ');
};

/**
 * Разбор различий. Пустой ответ ученика (пропустил, промолчал) даёт kind
 * 'missing' со всей фразой — это честнее, чем показывать пустую строку.
 */
export function buildMistakeAnswerDiff(input: Readonly<{
  userAnswer: string;
  correctAnswer: string;
}>): MistakeAnswerDiff {
  const mineWords = words(input.userAnswer);
  const correctWords = words(input.correctAnswer);
  const pairs = resolveAllMistakeTokens(input.correctAnswer, input.userAnswer);

  const missingWords = pairs.filter((pair) => pair.expected && !pair.picked).map((pair) => pair.expected);
  const wrongWords = pairs.filter((pair) => pair.picked).map((pair) => pair.picked);
  const swapped = pairs.filter((pair) => pair.expected && pair.picked);

  // Те же слова, другой порядок — отдельный случай: подсвечивать нечего,
  // ошибка в расстановке, а не в словах.
  const orderOnly = mineWords.length > 0 && sameMultiset(mineWords, correctWords)
    && mineWords.join(' ').toLowerCase() !== correctWords.join(' ').toLowerCase();

  const kind: MistakeDiffKind = pairs.length === 0
    ? (orderOnly ? 'order' : 'none')
    : orderOnly
      ? 'order'
      : swapped.length > 0
        ? 'swap'
        : missingWords.length > 0
          ? 'missing'
          : 'extra';

  const missingKeys = new Set(missingWords.map((w) => w.toLowerCase()));
  const wrongKeys = new Set(wrongWords.map((w) => w.toLowerCase()));
  const key = (word: string) => word.toLowerCase().replace(/[.,!?;:]/g, '');

  const correct: MistakeDiffSegment[] = correctWords.map((word) => ({
    text: word,
    tone: missingKeys.has(key(word)) || swapped.some((pair) => pair.expected === key(word)) ? 'right' : 'plain',
  }));

  const mine: MistakeDiffSegment[] = mineWords.length === 0
    ? [{ text: '', tone: 'gap' }]
    : mineWords.map((word) => ({
      text: word,
      tone: wrongKeys.has(key(word)) ? 'wrong' : 'plain',
    }));

  // Пропущенное слово показываем плашкой ровно там, где его не хватило:
  // человек видит дырку в своей фразе, а не просто «правильный ответ ниже».
  if (kind === 'missing' && mineWords.length > 0) {
    const withGaps: MistakeDiffSegment[] = [];
    let mineIndex = 0;
    for (const word of correctWords) {
      const isMissing = missingKeys.has(key(word));
      if (isMissing) {
        withGaps.push({ text: '', tone: 'gap' });
        continue;
      }
      const mineWord = mineWords[mineIndex];
      if (mineWord !== undefined) {
        withGaps.push({ text: mineWord, tone: wrongKeys.has(key(mineWord)) ? 'wrong' : 'plain' });
        mineIndex += 1;
      }
    }
    while (mineIndex < mineWords.length) {
      const extra = mineWords[mineIndex++]!;
      withGaps.push({ text: extra, tone: 'wrong' });
    }
    return Object.freeze({
      kind,
      mine: Object.freeze(withGaps),
      correct: Object.freeze(correct),
      missingWords: Object.freeze(missingWords),
      wrongWords: Object.freeze(wrongWords),
    });
  }

  return Object.freeze({
    kind,
    mine: Object.freeze(mine),
    correct: Object.freeze(correct),
    missingWords: Object.freeze(missingWords),
    wrongWords: Object.freeze(wrongWords),
  });
}

/* expo-router route shim: keeps this app utility from being treated as a route */
export default function __RouteShim() {
  return null;
}
