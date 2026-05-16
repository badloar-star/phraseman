/**
 * Vocabulary prompt / Spanish gloss resolution (lesson_words screen).
 *
 * ВАЖНО ДЛЯ СБОРОК / РЕЛИЗОВ (2026):
 * Падения здесь часто значат: список слов в lesson_words.tsx сместился, а фиксированный
 * «контрольный набор» в тесте — нет. На уроках в приложении при этом всё может быть ок.
 * Перед массовым переписыванием данных сверьте экран урока; не гоняйтесь за зелёным
 * тестом ценой лишних правок в контенте.
 */
import fs from 'fs';
import path from 'path';

import {
  EN_PLURAL_WEEKDAYS,
  ES_PLURAL_WEEKDAY_GLOSS,
  englishDisambigTokenMatchesLemma,
  lessonWordRecognitionPrompt,
  stripTrailingEnglishHeadwordParen,
  type LessonWordGlossInput,
  type LessonWordGlossPos,
} from '../app/lesson_words_spanish_gloss';
import { LESSON_WORD_ES_BY_EN } from '../app/lesson_words_es_by_en';
function fieldRe(name: string): RegExp {
  return new RegExp(`\\b${name}:\\s*'((?:\\\\.|[^'\\\\])*)'`);
}

function unquote(s: string): string {
  return s.replace(/\\(.)/g, '$1');
}

function parseLessonWordRows(): LessonWordGlossInput[] {
  const p = path.join(__dirname, '..', 'app', 'lesson_words.tsx');
  const src = fs.readFileSync(p, 'utf8');
  const rows: LessonWordGlossInput[] = [];
  for (const line of src.split('\n')) {
    if (!line.includes('en:') || !line.includes('pos:')) continue;
    const enMatch = line.match(fieldRe('en'));
    const ruMatch = line.match(fieldRe('ru'));
    const ukMatch = line.match(fieldRe('uk'));
    const esMatch = line.match(fieldRe('es'));
    const posMatch = line.match(fieldRe('pos'));
    if (!enMatch || !ruMatch || !ukMatch || !posMatch) continue;
    const en = unquote(enMatch[1]);
    const ru = unquote(ruMatch[1]);
    const uk = unquote(ukMatch[1]);
    const esRaw = esMatch ? unquote(esMatch[1]) : undefined;
    const posRaw = unquote(posMatch[1]);
    rows.push({ en, ru, uk, es: esRaw, pos: posRaw as LessonWordGlossPos });
  }
  return rows;
}

function canonicalNounLemmaForTest(en: string): string {
  const lower = en.trim().toLowerCase();
  if (lower === 'things') return lower;
  if (/[^aeiou]ies$/.test(lower) && lower.length > 4) return lower.slice(0, -3) + 'y';
  if (lower.endsWith('ves') && lower.length > 4) return lower.slice(0, -3) + 'f';
  if (/(ches|shes|xes|zes|sses)$/.test(lower) && lower.length > 4) return lower.slice(0, -2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 3) return lower.slice(0, -1);
  return lower;
}

function bankNounRowForTest(en: string, rows: LessonWordGlossInput[]): LessonWordGlossInput | undefined {
  const singularGlosses = new Map<string, LessonWordGlossInput>();
  for (const row of rows) {
    if (row.pos !== 'nouns') continue;
    const key = row.en.trim().toLowerCase();
    if (canonicalNounLemmaForTest(key) === key && !singularGlosses.has(key)) {
      singularGlosses.set(key, row);
    }
  }

  const source = rows.find((row) => row.en === en && row.pos === 'nouns');
  if (!source) return undefined;
  const lemma = canonicalNounLemmaForTest(source.en);
  const singular = singularGlosses.get(lemma);
  return {
    ...source,
    en: lemma,
    ru: singular?.ru ?? source.ru,
    uk: singular?.uk ?? source.uk,
    es: singular?.es ?? source.es,
  };
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

  /** #error_reports: «… (washes)» в промпте дублирует правильный EN-ответ. */
  it('RU/UK: strips trailing parenthetical when it equals the English headword', () => {
    const spoiled = { en: 'washes', ru: 'Мыть · моет (washes)', uk: 'Мити · миє (washes)' };
    expect(lessonWordRecognitionPrompt(spoiled, 'ru')).toBe('Мыть · моет');
    expect(lessonWordRecognitionPrompt(spoiled, 'uk')).toBe('Мити · миє');
  });

  /** #error_reports: «… / puts» в промпте — ответ уже в вопросе (lesson_words). */
  it('RU/UK: strips trailing slash + English lemma when it equals en', () => {
    const spoiled = { en: 'puts', ru: 'Положить · кладёт / puts', uk: 'Класти · кладе / puts', pos: 'irregular_verbs' as const };
    expect(lessonWordRecognitionPrompt(spoiled, 'ru')).toBe('Положить · кладёт');
    expect(lessonWordRecognitionPrompt(spoiled, 'uk')).toBe('Класти · кладе');
  });

  /** #error_reports: «(folders)» при лемме `folder` — то же слово, ответ не должен светиться. */
  it('RU/UK: strips parenthetical plural EN for noun lemma (folder / folders)', () => {
    const spoiled = {
      en: 'folder',
      ru: 'Папка · папки (folders)',
      uk: 'Папка · папки (folders)',
      pos: 'nouns' as const,
    };
    expect(lessonWordRecognitionPrompt(spoiled, 'ru')).toBe('Папка · папки');
    expect(lessonWordRecognitionPrompt(spoiled, 'uk')).toBe('Папка · папки');
  });

  it('englishDisambigTokenMatchesLemma: noun folder/folders, not verb put/puts', () => {
    expect(englishDisambigTokenMatchesLemma('folders', 'folder', 'nouns')).toBe(true);
    expect(englishDisambigTokenMatchesLemma('folder', 'folders', 'nouns')).toBe(true);
    expect(englishDisambigTokenMatchesLemma('puts', 'put', 'nouns')).toBe(false);
    expect(englishDisambigTokenMatchesLemma('puts', 'puts', 'irregular_verbs')).toBe(true);
  });

  it('stripTrailingEnglishHeadwordParen keeps Russian gloss in parens (not the EN lemma)', () => {
    expect(stripTrailingEnglishHeadwordParen('Правый (верный)', 'right')).toBe('Правый (верный)');
  });

  it('stripTrailingEnglishHeadwordParen keeps Ты / Вы (slash is RU alternatives, not EN)', () => {
    expect(stripTrailingEnglishHeadwordParen('Ты / Вы', 'you')).toBe('Ты / Вы');
  });
});

describe('lesson_words.tsx Spanish gloss coverage', () => {
  const rows = parseLessonWordRows();

  it('parses expected number of vocabulary rows', () => {
    expect(rows.length).toBeGreaterThan(1500);
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

  /** Regression: lesson_words error_reports — ожидания синхронизированы с `lesson_words.tsx` + `lessonWordRecognitionPrompt`. */
  const REPORT_REGRESSION_RU: Record<string, string> = {
    brings: 'Приносит',
    darker: 'Темнее',
    lightest: 'Самый лёгкий (о весе)',
    narrower: 'Уже · более узкий',
    stronger: 'Сильнее',
    when: 'Когда',
    takes: 'Берёт',
    shortest: 'Самый короткий',
  };

  const REPORT_REGRESSION_UK: Record<string, string> = {
    brings: 'Приносить',
    shortest: 'Найкоротший',
    darker: 'Темніший',
    sweeter: 'Солодший',
    hottest: 'Найгарячіший',
    stronger: 'Сильніший',
    cheaper: 'Дешевший',
    lightest: 'Найлегший (за вагою)',
    narrower: 'Вужчий',
    takes: 'Бере',
    when: 'Коли',
  };

  it('RU prompts stay aligned with EN lemma for comparable-error_reports bundle', () => {
    for (const [en, ruExpected] of Object.entries(REPORT_REGRESSION_RU)) {
      const row = rows.find(r => r.en === en) ?? {
        en,
        ru: ruExpected,
        uk: REPORT_REGRESSION_UK[en] || ruExpected,
        pos: 'adjectives' as const,
      };
      expect(lessonWordRecognitionPrompt(row, 'ru')).toBe(ruExpected);
    }
  });

  it('UK prompts stay aligned with EN lemma for comparable-error_reports bundle', () => {
    for (const [en, ukExpected] of Object.entries(REPORT_REGRESSION_UK)) {
      const row = rows.find(r => r.en === en) ?? {
        en,
        ru: REPORT_REGRESSION_RU[en] || ukExpected,
        uk: ukExpected,
        pos: 'adjectives' as const,
      };
      expect(lessonWordRecognitionPrompt(row, 'uk')).toBe(ukExpected);
    }
  });

  /** EN fruits → RU «Фрукты» (регрессия word_fruits / странные подсказки в старых данных). */
  it('fruits: Russian and Ukrainian prompts are plural фрукты / фрукти', () => {
    expect(
      lessonWordRecognitionPrompt({ en: 'fruits', ru: 'Плодиков', uk: 'Плодики', pos: 'nouns' }, 'ru'),
    ).toBe('Фрукты');
    expect(
      lessonWordRecognitionPrompt({ en: 'fruits', ru: 'Плодиков', uk: 'Плодики', pos: 'nouns' }, 'uk'),
    ).toBe('Фрукти');
  });

  /** RU: для «details» в тренажёре нужна словарная форма «детали», не творительный «деталями». */
  it('details: Russian prompt is nominative детали (normalizes mistaken деталями)', () => {
    expect(lessonWordRecognitionPrompt({ en: 'details', ru: 'Детали', uk: 'Деталі' }, 'ru')).toBe('Детали');
    expect(lessonWordRecognitionPrompt({ en: 'details', ru: 'Деталями', uk: 'Деталі' }, 'ru')).toBe('Детали');
  });

  /** Слово `ticket` в словаре (мн. `tickets` убран — см. `lesson_words.tsx`). */
  it('ticket: RU/UK gloss без утечки EN в скобках', () => {
    const row = rows.find(r => r.en === 'ticket');
    expect(row).toBeDefined();
    expect(lessonWordRecognitionPrompt(row!, 'ru')).toBe('Билет');
    expect(lessonWordRecognitionPrompt(row!, 'uk')).toBe('Квиток');
  });

  /** RU/UK: Thursday — RU «четверг», UK «четвер». */
  it('thursday: Russian and Ukrainian glosses are correct', () => {
    const row = rows.find(r => r.en.toLowerCase() === 'thursday');
    expect(row).toBeDefined();
    expect(row!.ru).toBe('Четверг');
    expect(row!.uk).toBe('Четвер');
    expect(lessonWordRecognitionPrompt(row!, 'ru')).toBe('Четверг');
    expect(lessonWordRecognitionPrompt(row!, 'uk')).toBe('Четвер');
  });

  it('plural noun reports: bank prompt follows singular English answer', () => {
    const cases: Array<[string, string, string, string]> = [
      ['friends', 'friend', 'Друг', 'Друг'],
      ['apps', 'app', 'Приложение', 'Застосунок'],
      ['tickets', 'ticket', 'Билет', 'Квиток'],
      ['cars', 'car', 'Машина', 'Машина'],
      ['things', 'things', 'Вещи', 'Речі'],
    ];

    for (const [sourceEn, expectedEn, expectedRu, expectedUk] of cases) {
      const row = bankNounRowForTest(sourceEn, rows);
      expect(row).toBeDefined();
      expect(row!.en).toBe(expectedEn);
      expect(lessonWordRecognitionPrompt(row!, 'ru')).toBe(expectedRu);
      expect(lessonWordRecognitionPrompt(row!, 'uk')).toBe(expectedUk);
    }
  });

  it('phone charger: lesson 9 vocabulary uses common EN wording', () => {
    expect(rows.find((row) => row.en === 'cellphone charger')).toBeUndefined();
    const row = rows.find((r) => r.en === 'phone charger');
    expect(row).toBeDefined();
    expect(row!.ru).toBe('Зарядка для телефона');
    expect(row!.uk).toBe('Зарядка для телефону');
  });

  /** shower (сущ.) ≠ show (глагол) — жалоба lesson_words word_shower. */
  it('shower: RU/UK gloss is душ, not «показывать»', () => {
    const row = rows.find((r) => r.en === 'shower');
    expect(row).toBeDefined();
    expect(row!.ru).toBe('Душ');
    expect(row!.uk).toBe('Душ');
    expect(lessonWordRecognitionPrompt(row!, 'ru')).toBe('Душ');
    expect(lessonWordRecognitionPrompt(row!, 'uk')).toBe('Душ');
  });

  /** visit(s) (глагол) ≠ views / «просмотры» — жалоба word_visits. */
  it('visit and visits: RU/UK clarify verb vs views', () => {
    const visitRow = rows.find((r) => r.en === 'visit');
    const visitsRow = rows.find((r) => r.en === 'visits');
    expect(visitRow).toBeDefined();
    expect(visitsRow).toBeDefined();
    expect(lessonWordRecognitionPrompt(visitRow!, 'ru')).toBe(
      'Посещать (наведываться; не «просмотр» страницы — view)',
    );
    expect(lessonWordRecognitionPrompt(visitsRow!, 'ru')).toBe(
      'Посещает (она/он: she visits…; не «просмотры» — views)',
    );
    expect(lessonWordRecognitionPrompt(visitRow!, 'uk')).toBe(
      'Відвідувати (не «перегляд» сторінки — view)',
    );
    expect(lessonWordRecognitionPrompt(visitsRow!, 'uk')).toBe(
      'Відвідує (вона/він: she visits…; не «перегляди» — views)',
    );
  });
});
