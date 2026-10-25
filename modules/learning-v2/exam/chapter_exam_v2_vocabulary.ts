// chapter_exam_v2_vocabulary.ts — экзамен главы говорит только словами из пройденных эпизодов.
// зачем (замок владельца 25.10): «в каждом экзамене всегда должны быть слова, которые встречались в эпизодах перед этим экзаменом,
// и формы речи тоже!». Фразы экзамена новые по ситуации, но собраны только из слов и форм, уже встреченных учеником. Модуль чистый:
// словарь строится из уже прочитанных JSON эпизодов (тест и фабрика читают файлы сами), в приложение он не попадает.
import { normalizeChapterExamV2Answer, type ChapterExamV2Bank } from './chapter_exam_v2';
import { CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1 } from './chapter_exam_v1';

/** Последний эпизод перед экзаменом главы: у главы 2 — 16. Словарь экзамена строится по эпизодам 1…N урока. */
export function chapterExamV2LastEpisodeOrdinal(bank: Pick<ChapterExamV2Bank, 'chapterOrdinal'>): number {
  return bank.chapterOrdinal * CHAPTER_EXAM_SESSIONS_PER_CHAPTER_V1;
}

// Поля выпуска, где лежит английский текст, который ученик видит или слышит.
const ENGLISH_TEXT_KEYS: ReadonlySet<string> = new Set([
  'correctText', 'text', 'transcript', 'targetText', 'word', 'gappedTargetPhrase', 'target', 'leftColumn',
  'targetPhrase', 'orderedTokens', 'authoredDistractorTokens', 'hiddenTargetPhrase',
]);
const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

/** Английские слова строки: нижний регистр, апостроф ’ → ', сокращения остаются как есть (it's — своя форма). */
export function englishWordsV1(text: string): string[] {
  const words = String(text ?? '').toLowerCase().replace(/[’‘`´]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) ?? [];
  // одиночные буквы из подписей вариантов («a», «b») — не слова урока; «i» — слово
  return words.filter((w) => w.length > 1 || w === 'i');
}

/** Словарь из документов эпизодов: английские поля заданий плюс латиница внутри русских и украинских текстов. Идентификаторы — нет. */
export function collectEpisodeVocabularyV1(docs: readonly unknown[]): Set<string> {
  const known = new Set<string>();
  const walk = (value: unknown, key: string): void => {
    if (typeof value === 'string') {
      if (value.startsWith('en:')) return;
      if (ENGLISH_TEXT_KEYS.has(key) || CYRILLIC.test(value)) for (const w of englishWordsV1(value)) known.add(w);
      return;
    }
    if (Array.isArray(value)) { for (const v of value) walk(v, key); return; }
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) if (!/Ids?$/.test(k)) walk(v, k);
    }
  };
  for (const doc of docs) walk(doc, '');
  return known;
}

export type ChapterExamV2VocabularyMiss = Readonly<{ itemId: string; field: 'partnerLine' | 'wrong' | 'reference' | 'accepted'; text: string; words: readonly string[] }>;

/**
 * Незнакомые слова банка. То, что ученик видит (реплика, фраза с ошибкой, эталонный ответ — первый принятый), проверяется по точной
 * форме, включая сокращения. Остальные принятые варианты — после раскрытия сокращений (I'm → i am), как их сверяет движок.
 */
export function findChapterExamV2UnknownWords(
  bank: ChapterExamV2Bank,
  known: ReadonlySet<string>,
  exceptions: ReadonlySet<string> = new Set(),
): ChapterExamV2VocabularyMiss[] {
  const misses: ChapterExamV2VocabularyMiss[] = [];
  const unknownOf = (words: readonly string[]) => [...new Set(words.filter((w) => !known.has(w) && !exceptions.has(w)))];
  const check = (itemId: string, field: ChapterExamV2VocabularyMiss['field'], text: string, words: readonly string[]) => {
    const unknown = unknownOf(words);
    if (unknown.length > 0) misses.push({ itemId, field, text, words: unknown });
  };
  for (const item of bank.items) {
    if (item.partnerLine) check(item.id, 'partnerLine', item.partnerLine, englishWordsV1(item.partnerLine));
    if (item.wrong) check(item.id, 'wrong', item.wrong, englishWordsV1(item.wrong));
    item.accepted.forEach((answer, index) => {
      if (index === 0) check(item.id, 'reference', answer, englishWordsV1(answer));
      else check(item.id, 'accepted', answer, normalizeChapterExamV2Answer(answer).split(' ').filter(Boolean));
    });
  }
  return misses;
}
