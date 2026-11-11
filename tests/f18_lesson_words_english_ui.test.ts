/**
 * F18 — «Слова урока» показывают перевод выбранного языка интерфейса.
 *
 * зачем (11.11): при английском интерфейсе вопросом показывалось САМО изучаемое слово («je → je»),
 * потому что поле `en` в экране слов — слово курса. Английское значение теперь идёт отдельным полем `enGloss`.
 * Тест читает настоящие словари всех пяти курсов и повторяет сборку слова из classic_lesson_words.ts.
 */
import fs from 'fs';
import path from 'path';

import type { Lang } from '../constants/i18n';
import { lessonWordRecognitionPrompt, type LessonWordGlossInput } from '../app/lesson_words_spanish_gloss';

const COURSES = ['en', 'es', 'fr', 'de', 'it'] as const;
const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly Lang[];
const CYRILLIC = /[Ѐ-ӿ]/;

type Meaning = Partial<Record<(typeof UI_LANGS)[number], string>>;
type Lemma = { lemma: string; meaning?: Meaning };

function readLemmas(course: (typeof COURSES)[number]): Lemma[] {
  const file = path.join(__dirname, '..', 'modules', 'classic-courses', course, 'glossary.json');
  return (JSON.parse(fs.readFileSync(file, 'utf8')) as { lemmas: Lemma[] }).lemmas;
}

/** Зеркало classicLessonWordBankSnapshot: если сборка слова там изменится — поменять и здесь. */
function toWord(item: Lemma): LessonWordGlossInput {
  const m = item.meaning ?? {};
  const en = m.en ?? item.lemma;
  return {
    en: item.lemma,
    ru: m.ru ?? en,
    uk: m.uk ?? m.ru ?? en,
    es: m.es ?? en,
    'pt-BR': m['pt-BR'] ?? en,
    vi: m.vi ?? en,
    id: m.id ?? en,
    tr: m.tr ?? en,
    pl: m.pl ?? en,
    enGloss: m.en,
    pos: 'phrases',
  };
}

describe('F18 — lesson words prompt per interface language', () => {
  it.each(COURSES)('English UI shows the English meaning, not the studied word itself (%s course)', (course) => {
    for (const item of readLemmas(course)) {
      const expected = item.meaning?.en?.trim();
      expect(expected).toBeTruthy();
      expect(lessonWordRecognitionPrompt(toWord(item), 'en')).toBe(expected);
    }
  });

  it.each(COURSES)('no interface language except ru/uk ever gets Cyrillic or an empty prompt (%s course)', (course) => {
    for (const item of readLemmas(course)) {
      const word = toWord(item);
      for (const ui of UI_LANGS) {
        const prompt = lessonWordRecognitionPrompt(word, ui);
        expect(prompt.trim()).not.toBe('');
        if (ui !== 'ru' && ui !== 'uk') expect(CYRILLIC.test(prompt)).toBe(false);
      }
    }
  });

  // зачем (F18, 11.11): у 175 слов испанского курса (уроки 7–32) испанским «пояснением» стояло само слово —
  // при испанском интерфейсе вопрос совпадал с ответом. Пояснения дописаны (docs/work/classic_gloss_overrides.json).
  it('Spanish UI on the Spanish course never asks the studied word with the word itself', () => {
    const same = readLemmas('es')
      .filter((item) => lessonWordRecognitionPrompt(toWord(item), 'es').trim().toLowerCase() === item.lemma.trim().toLowerCase())
      .map((item) => item.lemma);
    expect(same).toEqual([]);
  });

  it('keeps the previous prompt when a word has no separate English meaning', () => {
    const legacy: LessonWordGlossInput = { en: 'book', ru: 'Книга', uk: 'Книжка', es: 'libro', pos: 'nouns' };
    expect(lessonWordRecognitionPrompt(legacy, 'en')).toBe('book');
    expect(lessonWordRecognitionPrompt({ ...legacy, enGloss: '   ' }, 'en')).toBe('book');
  });

  it('the course word bank really passes the English meaning into the word', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'classic_lesson_words.ts'), 'utf8');
    expect(source).toContain('enGloss: m.en,');
  });
});
