// Модель списка «Слова» (владелец 22.10, макет words-lesson-course.html): ключ строки (урок, id слова), поиск по слову и переводу, разделы «Урок N» во «Весь курс», подсветка совпадения.
import {
  buildWordsRows,
  filterWordsByQuery,
  learningV2CourseWordsOrdered,
  learningV2LessonWordToListWord,
  splitHighlight,
  wordRowKey,
  WORDS_SEARCH_MIN,
} from '../components/learning-v2/words/words_list_model';
import { wordsLessonLabel, wordsListenLabel, wordsSearchCopy } from '../components/learning-v2/words/words_list_copy';

type Item = Parameters<typeof learningV2LessonWordToListWord>[0];

const word = (lessonOrdinal: number, id: string, en: string, ru: string, session = 1, order = 1): Item => ({
  targetLanguage: 'en',
  lessonOrdinal,
  lexicalItemId: id,
  sourceSessionOrdinal: session,
  firstEncounteredAt: '2026-10-22T00:00:00Z',
  encounter: {
    orderWithinSession: order,
    save: {
      targetText: en,
      meaningByLocale: { ru, uk: ru, es: ru, 'pt-BR': ru, vi: ru, id: ru, tr: ru, pl: ru },
    },
  },
} as unknown as Item);

const items = [
  word(2, 'lex_table', 'table', 'стол', 1, 2), word(2, 'lex_chair', 'chair', 'стул', 1, 1), word(1, 'lex_here', 'here', 'здесь'),
  word(3, 'lex_table', 'table', 'стол'),
];

describe('Модель списка «Слова»', () => {
  it('ключ строки — (урок, id слова): одно слово в двух уроках не даёт дубля ключа', () => {
    expect(wordRowKey(items[0]!)).toBe('2:lex_table');
    expect(wordRowKey(items[3]!)).toBe('3:lex_table');
    const keys = buildWordsRows(items, 'course').map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('«Весь курс»: разделы «Урок N» с числом слов, уроки по возрастанию, внутри урока — как встречались', () => {
    const rows = buildWordsRows(items, 'course');
    expect(rows.map((r) => (r.kind === 'section' ? `§${r.lessonOrdinal}:${r.count}` : r.word.lexicalItemId))).toEqual([
      '§1:1', 'lex_here', '§2:2', 'lex_chair', 'lex_table', '§3:1', 'lex_table',
    ]);
    expect(learningV2CourseWordsOrdered(items).map((w) => w.lessonOrdinal)).toEqual([1, 2, 2, 3]);
  });

  it('«Этот урок»: плоский список без разделов', () => {
    expect(buildWordsRows([items[0]!, items[1]!], 'lesson').every((r) => r.kind === 'word')).toBe(true);
  });

  it('поиск идёт по слову и по переводу, без учёта регистра; пустой запрос — всё', () => {
    expect(filterWordsByQuery(items, 'TAB', 'ru').map((w) => w.lexicalItemId)).toEqual(['lex_table', 'lex_table']);
    expect(filterWordsByQuery(items, 'ст', 'ru').map((w) => w.encounter.save.targetText)).toEqual(['table', 'chair', 'table']);
    expect(filterWordsByQuery(items, '   ', 'ru')).toHaveLength(4);
    expect(filterWordsByQuery(items, 'кошка', 'ru')).toHaveLength(0);
  });

  it('подсветка совпадения: до / совпадение / после; нет совпадения — null', () => {
    expect(splitHighlight('table', 'ab')).toEqual(['t', 'ab', 'le']);
    expect(splitHighlight('стол', 'СТ')).toEqual(['', 'ст', 'ол']);
    expect(splitHighlight('table', 'x')).toBeNull();
    expect(splitHighlight('table', ' ')).toBeNull();
  });

  it('поиск — от 12 слов; перевод слова несёт все 9 языков для закладки', () => {
    expect(WORDS_SEARCH_MIN).toBe(12);
    const listWord = learningV2LessonWordToListWord(items[0]!);
    for (const key of ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) expect((listWord as unknown as Record<string, string>)[key]).toBe('стол');
  });

  it('тексты: «Урок N» без разрядки, поиск и «Ничего не нашлось» дословно из убранного словаря', () => {
    expect(wordsLessonLabel('ru', 3)).toBe('Урок 3');
    expect(wordsLessonLabel('en', 3)).toBe('Lesson 3');
    expect(wordsListenLabel('ru', 'table')).toBe('Озвучить слово table');
    expect(wordsSearchCopy('ru')).toEqual({ placeholder: 'Поиск слова', clear: 'Очистить поиск', nothingFound: 'Ничего не нашлось' });
  });
});
