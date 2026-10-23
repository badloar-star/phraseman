// ═════════════════════════════════════════════════════════════════════
// words_list_model.ts — чистая модель списка «Слова»: слово Learning V2 → строка, порядок, ключ строки, поиск, разделы «Урок N», подсветка совпадения.
//
// зачем (владелец 22.10 кнопкой, макет words-lesson-course.html, таблица words-inventory.md): экран «Слова» — «Этот урок / Весь курс»; во «Весь курс» из убранного словаря возвращены поиск (от 12 слов) и разделы «Урок N + число».
// Решения владельца закреплены в tests/owner_locks_words_2026_10_22.test.ts: ключ строки (урок, id слова) — слово из двух уроков не ломает список (раньше ключ был английским текстом слова); транскрипции нет.
// ═════════════════════════════════════════════════════════════════════
import type { LearningV2UnlockedLessonWordV1 } from '../../../app/learning_v2_unlocked_lesson_words_v1';
import { lessonWordRecognitionPrompt } from '../../../app/lesson_words_spanish_gloss';
import type { Word } from '../../../app/lesson_words';
import type { Lang } from '../../../constants/i18n';

/** Поиск показывается, только когда искать есть в чём (как в прежнем словаре курса). */
export const WORDS_SEARCH_MIN = 12;

/** Слово Learning V2 → строка списка основного курса: слово, перевод на 9 языков; части речи у этих слов нет — список плоский, она не показывается. */
export function learningV2LessonWordToListWord(item: LearningV2UnlockedLessonWordV1): Word {
  const meaning = item.encounter.save.meaningByLocale;
  return {
    en: item.encounter.save.targetText,
    ru: meaning.ru,
    uk: meaning.uk,
    es: meaning.es,
    'pt-BR': meaning['pt-BR'],
    vi: meaning.vi,
    id: meaning.id,
    tr: meaning.tr,
    pl: meaning.pl,
    pos: 'phrases',
  };
}

/** Порядок — как слова встречались: сначала по занятию, потом по месту в занятии. */
export function learningV2LessonWordsOrdered(items: readonly LearningV2UnlockedLessonWordV1[]): readonly LearningV2UnlockedLessonWordV1[] {
  return [...items].sort((a, b) => a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession);
}

/** Весь курс: по порядку уроков, внутри урока — как слова встречались. */
export function learningV2CourseWordsOrdered(items: readonly LearningV2UnlockedLessonWordV1[]): readonly LearningV2UnlockedLessonWordV1[] {
  return [...items].sort((a, b) => a.lessonOrdinal - b.lessonOrdinal || a.sourceSessionOrdinal - b.sourceSessionOrdinal || a.encounter.orderWithinSession - b.encounter.orderWithinSession);
}

/** Ключ строки: (урок, id слова). Одно слово в двух уроках во «Весь курс» даёт две разные строки, а не дубль ключа. */
export function wordRowKey(item: Pick<LearningV2UnlockedLessonWordV1, 'lessonOrdinal' | 'lexicalItemId'>): string {
  return `${item.lessonOrdinal}:${item.lexicalItemId}`;
}

/** Перевод на языке интерфейса (тот же источник, что у списка основного курса). */
export function wordTranslation(item: LearningV2UnlockedLessonWordV1, lang: Lang): string {
  return lessonWordRecognitionPrompt(learningV2LessonWordToListWord(item), lang);
}

/** Поиск идёт и по слову, и по переводу: человек ищет то, что помнит, а помнит чаще перевод. Подстрока без учёта регистра. */
export function filterWordsByQuery(words: readonly LearningV2UnlockedLessonWordV1[], query: string, lang: Lang): readonly LearningV2UnlockedLessonWordV1[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return words;
  return words.filter((w) => w.encounter.save.targetText.toLocaleLowerCase().includes(q) || wordTranslation(w, lang).toLocaleLowerCase().includes(q));
}

export type WordsRow =
  | Readonly<{ kind: 'section'; key: string; lessonOrdinal: number; count: number }>
  | Readonly<{ kind: 'word'; key: string; word: LearningV2UnlockedLessonWordV1 }>;

/** «Этот урок»: плоский список без заголовков. «Весь курс»: раздел «Урок N» + число слов, затем слова урока. */
export function buildWordsRows(words: readonly LearningV2UnlockedLessonWordV1[], mode: 'lesson' | 'course'): readonly WordsRow[] {
  if (mode === 'lesson') return learningV2LessonWordsOrdered(words).map((word) => ({ kind: 'word' as const, key: wordRowKey(word), word }));
  const byLesson = new Map<number, LearningV2UnlockedLessonWordV1[]>();
  for (const word of words) {
    const bucket = byLesson.get(word.lessonOrdinal);
    if (bucket) bucket.push(word);
    else byLesson.set(word.lessonOrdinal, [word]);
  }
  const rows: WordsRow[] = [];
  for (const ordinal of [...byLesson.keys()].sort((a, b) => a - b)) {
    const bucket = learningV2LessonWordsOrdered(byLesson.get(ordinal) ?? []);
    rows.push({ kind: 'section', key: `section-${ordinal}`, lessonOrdinal: ordinal, count: bucket.length });
    for (const word of bucket) rows.push({ kind: 'word', key: wordRowKey(word), word });
  }
  return rows;
}

/** Делит текст на «до / совпадение / после» для подсветки; null — совпадения нет (или запрос пуст). */
export function splitHighlight(text: string, query: string): readonly [string, string, string] | null {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return null;
  const at = text.toLocaleLowerCase().indexOf(q);
  if (at < 0) return null;
  return [text.slice(0, at), text.slice(at, at + q.length), text.slice(at + q.length)];
}
