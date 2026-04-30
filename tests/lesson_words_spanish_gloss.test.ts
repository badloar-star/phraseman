/**
 * Vocabulary prompt / Spanish gloss resolution (lesson_words screen).
 */
import fs from 'fs';
import path from 'path';

import {
  EN_PLURAL_WEEKDAYS,
  ES_PLURAL_WEEKDAY_GLOSS,
  lessonWordRecognitionPrompt,
  type LessonWordGlossInput,
} from '../app/lesson_words_spanish_gloss';
import { LESSON_WORD_ES_BY_EN } from '../app/lesson_words_es_by_en';
const LINE_RE =
  /^\s*\{ en: '((?:\\.|[^'\\])*)',\s*ru: '((?:\\.|[^'\\])*)',\s*uk: '((?:\\.|[^'\\])*)'(?:,\s*es: '((?:\\.|[^'\\])*)')?\s*,\s*pos:/;

function unquote(s: string): string {
  return s.replace(/\\(.)/g, '$1');
}

function parseLessonWordRows(): LessonWordGlossInput[] {
  const p = path.join(__dirname, '..', 'app', 'lesson_words.tsx');
  const src = fs.readFileSync(p, 'utf8');
  const rows: LessonWordGlossInput[] = [];
  for (const line of src.split('\n')) {
    const m = line.match(LINE_RE);
    if (!m) continue;
    const en = unquote(m[1]);
    const ru = unquote(m[2]);
    const uk = unquote(m[3]);
    const esRaw = m[4] ? unquote(m[4]) : undefined;
    rows.push({ en, ru, uk, es: esRaw });
  }
  return rows;
}

describe('lessonWordRecognitionPrompt', () => {
  it('returns Ukrainian gloss for lang uk', () => {
    expect(
      lessonWordRecognitionPrompt(
        { en: 'cheap', ru: 'Дешёвый', uk: 'Дешевий' },
        'uk',
      ),
    ).toBe('Дешевий');
  });

  it('applies Ru plural weekday По-prefix when gloss starts with по', () => {
    const gloss = lessonWordRecognitionPrompt(
      { en: 'Tuesdays', ru: 'по вторникам', uk: 'по вівторках' },
      'ru',
    );
    expect(gloss.toLowerCase()).toContain('по');
    expect(EN_PLURAL_WEEKDAYS.has('Tuesdays')).toBe(true);
  });

  it('ES: prefers trim inline word.es', () => {
    expect(
      lessonWordRecognitionPrompt(
        { en: 'I', ru: 'Я', uk: 'Я', es: 'Yo' },
        'es',
      ),
    ).toBe('Yo');
  });

  it('ES: uses ES_PLURAL_WEEKDAY_GLOSS for Mondays…Sundays', () => {
    expect(
      lessonWordRecognitionPrompt(
        { en: 'Wednesdays', ru: 'по средам', uk: 'по середах' },
        'es',
      ),
    ).toBe(ES_PLURAL_WEEKDAY_GLOSS.Wednesdays);
  });

  it('ES: uses generated LESSON_WORD_ES_BY_EN for entries without inline es', () => {
    const row = { en: 'smoke', ru: 'Курить', uk: 'Курити' };
    expect(LESSON_WORD_ES_BY_EN[row.en]).toBeDefined();
    expect(lessonWordRecognitionPrompt(row, 'es')).toBe(LESSON_WORD_ES_BY_EN[row.en]);
  });
});

describe('lesson_words.tsx Spanish gloss coverage', () => {
  const rows = parseLessonWordRows();

  it('parses expected number of vocabulary rows', () => {
    expect(rows.length).toBeGreaterThan(1900);
  });

  it('every row without inline es has LESSON_WORD_ES_BY_EN lookup', () => {
    const missing: string[] = [];
    for (const row of rows) {
      if (row.es?.trim()) continue;
      if (!LESSON_WORD_ES_BY_EN[row.en]?.trim()) missing.push(row.en);
    }
    expect(missing).toEqual([]);
  });

  it('every row produces non-empty ES prompt text (RU fallback allowed)', () => {
    const empty: string[] = [];
    for (const row of rows) {
      const es = lessonWordRecognitionPrompt(row, 'es');
      if (!es?.trim()) empty.push(row.en);
    }
    expect(empty).toEqual([]);
  });

  /** Regression: lesson_words error_reports (translation mismatch UA/RU vs EN degree). */
  const REPORT_REGRESSION_UK: Record<string, string> = {
    shortest: 'Найкоротший',
    darker: 'Темніший',
    sweeter: 'Солодший',
    hottest: 'Найгарячіший',
    stronger: 'Сильніший',
    cheaper: 'Дешевший',
    takes: 'Бере · брати',
  };

  it('UK prompts stay aligned with EN lemma for comparable-error_reports bundle', () => {
    for (const [en, ukExpected] of Object.entries(REPORT_REGRESSION_UK)) {
      const row = rows.find(r => r.en === en);
      expect(row).toBeDefined();
      expect(lessonWordRecognitionPrompt(row!, 'uk')).toBe(ukExpected);
    }
  });
});
