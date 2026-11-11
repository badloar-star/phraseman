import fs from 'fs';
import path from 'path';

import type { Lang } from '../constants/i18n';
import {
  CLASSIC_COURSE_LANGS,
  classicPhraseFromRecord,
  type ClassicCourseLang,
} from '../app/classic_course_phrases';
import type { LessonPhrase } from '../app/lesson_data_types';
import type { StudyTargetLang } from '../app/study_target_lang_dev';

const CLASSIC_ROOT = path.join(__dirname, '..', 'modules', 'classic-courses');
const UI_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const satisfies readonly Lang[];
const STUDY_TARGETS = ['en', 'es', 'fr', 'de', 'it'] as const satisfies readonly StudyTargetLang[];

type InterfaceLocale = (typeof UI_LANGS)[number];
type RawTile = { text: string; correct?: string; distractors?: string[] };
type RawPhrase = {
  id: string;
  target: string;
  tiles: RawTile[];
  alternatives?: string[];
  accepted?: string[][];
  sourceLocales: Record<InterfaceLocale, string>;
  clarifierKeys?: string[];
  wordNoteKeys?: string[];
  contextCue?: string;
  rev: string;
};
type RawLesson = { phrases: RawPhrase[] };
type MeaningSelector = (phrase: LessonPhrase, lang: Lang, studyTarget: StudyTargetLang) => string;

function readRawLesson(lang: ClassicCourseLang, lessonId: number): RawLesson {
  const file = path.join(CLASSIC_ROOT, lang, `lessons-${String(lessonId).padStart(2, '0')}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8')) as RawLesson;
}

function loadSelector(devSpanishTargetEnabled: boolean): MeaningSelector {
  jest.resetModules();
  jest.doMock('../app/spanish_content_gate', () => ({
    spanishStudyActive: (studyTarget: StudyTargetLang) => devSpanishTargetEnabled && studyTarget === 'es',
  }));
  let selector: MeaningSelector | undefined;
  jest.isolateModules(() => {
    selector = (require('../app/lesson_phrase_meaning') as {
      lessonPhraseMeaningForLang: MeaningSelector;
    }).lessonPhraseMeaningForLang;
  });
  jest.dontMock('../app/spanish_content_gate');
  if (!selector) throw new Error('lessonPhraseMeaningForLang did not load');
  return selector;
}

function legacyPhrase(overrides: Partial<LessonPhrase> = {}): LessonPhrase {
  return {
    id: 'legacy',
    english: 'EN',
    russian: 'RU',
    ukrainian: 'UK',
    spanish: 'ES',
    sourceLocales: {
      'pt-BR': ' PT ',
      vi: ' VI ',
      id: ' ID ',
      tr: ' TR ',
      pl: ' PL ',
    },
    words: [],
    ...overrides,
  };
}

const INACTIVE_LEGACY_EXPECTED: Readonly<Record<InterfaceLocale, string>> = {
  ru: 'RU', uk: 'UK', en: 'RU', es: 'RU', 'pt-BR': 'PT', vi: 'VI', id: 'ID', tr: 'TR', pl: 'PL',
};
const ACTIVE_SPANISH_TARGET_EXPECTED: Readonly<Record<InterfaceLocale, string>> = {
  ru: 'RU', uk: 'UK', en: 'RU', es: 'ES', 'pt-BR': 'PT', vi: 'VI', id: 'ID', tr: 'TR', pl: 'PL',
};
const LEGACY_CONTOURS = [
  { flag: false, target: 'en', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: false, target: 'es', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: false, target: 'fr', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: false, target: 'de', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: false, target: 'it', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: true, target: 'en', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: true, target: 'es', expected: ACTIVE_SPANISH_TARGET_EXPECTED },
  { flag: true, target: 'fr', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: true, target: 'de', expected: INACTIVE_LEGACY_EXPECTED },
  { flag: true, target: 'it', expected: INACTIVE_LEGACY_EXPECTED },
] as const;

describe('classic lesson prompt locales — F18 Phase A', () => {
  it('preserves all nine raw source locales and every existing phrase invariant in the real adapter', () => {
    let records = 0;
    for (const courseLang of CLASSIC_COURSE_LANGS) {
      for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
        const rawLesson = readRawLesson(courseLang, lessonId);
        expect(rawLesson.phrases).toHaveLength(50);
        for (const raw of rawLesson.phrases) {
          const adapted = classicPhraseFromRecord(raw, courseLang);
          expect(adapted).not.toBeNull();
          if (!adapted) throw new Error(`adapter rejected ${courseLang}/${lessonId}/${raw.id}`);
          records += 1;

          expect(adapted.id).toBe(raw.id);
          expect(adapted.english).toBe(raw.target);
          expect(adapted.alternatives).toEqual(raw.alternatives ?? []);
          expect(adapted.words).toEqual(raw.tiles.map((tile) => ({
            text: tile.text,
            correct: tile.correct || tile.text,
            distractors: tile.distractors ?? [],
          })));
          expect(adapted.classic?.lang).toBe(courseLang);
          expect(adapted.classic?.rev).toBe(raw.rev);
          expect(adapted.classic?.accepted).toEqual(raw.accepted?.length ? raw.accepted : undefined);
          expect((adapted.classic as { sourceLocales?: unknown } | undefined)?.sourceLocales).toEqual(raw.sourceLocales);
        }
      }
    }
    expect(records).toBe(8_000);
  });

  it.each([false, true])(
    'selects the raw JSON locale for all 8,000 records × 9 UI locales when dev-target flag=%s',
    (devSpanishTargetEnabled) => {
      const selectMeaning = loadSelector(devSpanishTargetEnabled);
      let selections = 0;
      for (const courseLang of CLASSIC_COURSE_LANGS) {
        for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
          for (const raw of readRawLesson(courseLang, lessonId).phrases) {
            const adapted = classicPhraseFromRecord(raw, courseLang);
            if (!adapted) throw new Error(`adapter rejected ${courseLang}/${lessonId}/${raw.id}`);
            for (const uiLang of UI_LANGS) {
              expect(selectMeaning(adapted, uiLang, courseLang)).toBe(raw.sourceLocales[uiLang].trim());
              selections += 1;
            }
          }
        }
      }
      expect(selections).toBe(72_000);
    },
  );

  it('preserves the complete legacy fallback grid across nine UI locales, five targets and both flag contours', () => {
    for (const contour of LEGACY_CONTOURS) {
      const selectMeaning = loadSelector(contour.flag);
      for (const uiLang of UI_LANGS) {
        expect(selectMeaning(legacyPhrase(), uiLang, contour.target)).toBe(contour.expected[uiLang]);
      }
    }
    expect(LEGACY_CONTOURS).toHaveLength(STUDY_TARGETS.length * 2);
  });

  it.each([
    ['planned own value is trimmed', false, 'pt-BR', 'en', legacyPhrase(), 'PT'],
    ['planned missing falls back to Russian', false, 'pt-BR', 'en', legacyPhrase({ sourceLocales: {} }), 'RU'],
    ['planned missing falls through Russian to Ukrainian', false, 'vi', 'en', legacyPhrase({ russian: '', sourceLocales: {} }), 'UK'],
    ['planned missing falls through to Spanish', false, 'id', 'en', legacyPhrase({ russian: '', ukrainian: '', sourceLocales: {} }), 'ES'],
    ['planned missing can reach empty', false, 'tr', 'en', legacyPhrase({ russian: '', ukrainian: '', spanish: '', sourceLocales: {} }), ''],
    ['Ukrainian uses its own value', false, 'uk', 'en', legacyPhrase(), 'UK'],
    ['Ukrainian falls back to Russian', false, 'uk', 'en', legacyPhrase({ ukrainian: '' }), 'RU'],
    ['Ukrainian can reach empty', false, 'uk', 'en', legacyPhrase({ ukrainian: '', russian: '' }), ''],
    ['active Spanish target uses Spanish for es UI', true, 'es', 'es', legacyPhrase(), 'ES'],
    ['active Spanish target preserves an explicitly empty Spanish value', true, 'es', 'es', legacyPhrase({ spanish: '' }), ''],
    ['active Spanish target falls back when Spanish is absent', true, 'es', 'es', legacyPhrase({ spanish: undefined }), 'RU'],
    ['active Spanish target uses Russian for non-es UI', true, 'en', 'es', legacyPhrase(), 'RU'],
    ['active Spanish target preserves explicitly empty Russian for non-es UI', true, 'en', 'es', legacyPhrase({ russian: '' }), ''],
    ['inactive es UI uses Russian', false, 'es', 'es', legacyPhrase(), 'RU'],
    ['inactive es UI falls through Russian to Ukrainian', false, 'es', 'es', legacyPhrase({ russian: '' }), 'UK'],
    ['inactive es UI falls through to English', false, 'es', 'es', legacyPhrase({ russian: '', ukrainian: '' }), 'EN'],
    ['inactive es UI can reach empty', false, 'es', 'es', legacyPhrase({ russian: '', ukrainian: '', english: '' }), ''],
    ['default UI uses Russian', false, 'en', 'fr', legacyPhrase(), 'RU'],
    ['default UI preserves explicitly empty Russian', false, 'en', 'fr', legacyPhrase({ russian: '' }), ''],
  ] as const)(
    '%s',
    (_name, flag, uiLang, target, phrase, expected) => {
      expect(loadSelector(flag)(phrase, uiLang as Lang, target as StudyTargetLang)).toBe(expected);
    },
  );

  it.each([
    ['inherited locale', Object.assign(Object.create({ es: 'INHERITED' }), {}), 'es'],
    ['missing locale', { ru: 'CLASSIC_RU' }, 'es'],
    ['non-string locale', { es: 42 }, 'es'],
    ['empty locale', { es: '' }, 'es'],
    ['whitespace locale', { es: '   ' }, 'es'],
    ['unknown toString key', { toString: 'BAD' }, 'toString'],
    ['unknown constructor key', { constructor: 'BAD' }, 'constructor'],
    ['unknown __proto__ key', JSON.parse('{"__proto__":"BAD"}'), '__proto__'],
  ])('rejects malformed/prototype classic metadata: %s', (_name, sourceLocales, runtimeLang) => {
    const phrase = legacyPhrase({
      classic: {
        lang: 'en',
        rev: 'rev',
        sourceLocales,
      } as LessonPhrase['classic'],
    });
    expect(loadSelector(false)(phrase, runtimeLang as Lang, 'en')).toBe('RU');
  });

  // зачем: мест было пять; пятое — шторка «Объясни проще» (ExplainSheet, phraseMeaning={…}) — владелец 11.11 велел
  // удалить вместе с функцией (docs/work/tasks/remove-explain-simpler-buttons-2026-11-11.md), поэтому сторож держит
  // ровно четыре оставшихся места. Число точное в обе стороны: новое место без записи решения тоже ломает тест.
  it('imports one selector and retains exactly the four production prompt/mistake call surfaces', () => {
    const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
    expect(lessonSource).toContain("import { lessonPhraseMeaningForLang } from './lesson_phrase_meaning';");
    expect(lessonSource).not.toMatch(/function\s+lessonPhraseMeaningForLang\s*\(/);
    expect(lessonSource.match(/lessonPhraseMeaningForLang\(/g)).toHaveLength(4);
    expect(lessonSource.match(/lessonPhraseMeaningForLang\(phrase, lang, studyTarget\)/g)).toHaveLength(2);
    expect(lessonSource).not.toContain('ExplainSheet');
    expect(lessonSource).toContain('lessonPhraseMeaningForLang(p, lang, studyTarget)');
    expect(lessonSource).toContain('lessonPhraseMeaningForLang(phrase, lang, stRm)');
    expect(lessonSource).toContain('sourceLocales={phrase.sourceLocales}');
    expect(lessonSource).not.toContain('sourceLocales={phrase.classic');
  });
});
