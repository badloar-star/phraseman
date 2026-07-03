import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'fs';
import path from 'path';

jest.mock('../app/config', () => ({
  ...jest.requireActual<typeof import('../app/config')>('../app/config'),
  ENABLE_DEV_STUDY_TARGET_LANG: true,
}));

import { FRENCH_CONTENT_SOURCE_GATE } from '../app/french_content_source_gate';
import type { LessonPhrase } from '../app/lesson_data_types';
import { getLessonData } from '../app/lesson_data_all';
import {
  getLessonPrepositionPack,
  getLessonPrepositionTexts,
  hasLessonPrepositionDrillForTarget,
} from '../app/lesson_prepositions';
import {
  phraseAnswerDisplayLine,
  phraseCanonicalAnswer,
  phraseHasStudyTargetContent,
  phrasePrimarySurface,
  phraseWordRowsForStudyTarget,
  ttsLocaleForStudyTarget,
} from '../app/phrase_target_utils';
import {
  DEFAULT_STUDY_TARGET,
  SOURCE_LOCALES,
  STUDY_TARGETS,
  STUDY_TARGET_STORAGE_KEY,
  assertStudyTarget,
  defaultStudyTarget,
  getStoredStudyTarget,
  isStudyTarget,
  setStoredStudyTarget,
  studyTargetsForSourceLocale,
  ttsLocaleForProductionStudyTarget,
} from '../app/study_target';

const ROOT = path.join(__dirname, '..');

beforeEach(() => {
  (AsyncStorage as any).__reset?.();
});

describe('production StudyTarget contract', () => {
  it('exposes only English as a production study target while keeping French internal', () => {
    expect(STUDY_TARGETS).toEqual(['en']);
    expect(studyTargetsForSourceLocale('ru')).toEqual(['en']);
    expect(studyTargetsForSourceLocale('uk')).toEqual(['en']);
    expect(isStudyTarget('en')).toBe(true);
    expect(isStudyTarget('fr')).toBe(true);
    expect(isStudyTarget('es')).toBe(false);
    expect(() => assertStudyTarget('es')).toThrow(/Unsupported StudyTarget/);
  });

  it('keeps sourceLocale separate from studyTarget', () => {
    expect(SOURCE_LOCALES).toEqual(['ru', 'uk']);
    expect(DEFAULT_STUDY_TARGET).toBe('en');
    expect(defaultStudyTarget()).toBe('en');
    expect(STUDY_TARGET_STORAGE_KEY).toBe('study_target_v1');
  });

  it('provides target-specific speech locales', () => {
    expect(ttsLocaleForProductionStudyTarget('en')).toBe('en-US');
  });

  it('coerces French back to English in production study target storage', async () => {
    await expect(getStoredStudyTarget('ru')).resolves.toBe('en');
    await expect(setStoredStudyTarget('fr', 'ru')).resolves.toBe('en');
    await expect(getStoredStudyTarget('ru')).resolves.toBe('en');
    await expect(AsyncStorage.getItem(STUDY_TARGET_STORAGE_KEY)).resolves.toBe('en');

    await expect(setStoredStudyTarget('fr', 'es')).resolves.toBe('en');
    await expect(getStoredStudyTarget('es')).resolves.toBe('en');
  });

  it('normalizes a previously stored French production target back to English', async () => {
    await AsyncStorage.setItem(STUDY_TARGET_STORAGE_KEY, 'fr');

    await expect(getStoredStudyTarget('ru')).resolves.toBe('en');
    await expect(AsyncStorage.getItem(STUDY_TARGET_STORAGE_KEY)).resolves.toBe('en');
  });

  it('uses English production storage while keeping French and Spanish dev-only', () => {
    const provider = fs.readFileSync(path.join(ROOT, 'components', 'StudyTargetContext.tsx'), 'utf8');
    const settings = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const studyLanguages = fs.readFileSync(path.join(ROOT, 'app', 'study_languages.ts'), 'utf8');
    const picker = fs.readFileSync(path.join(ROOT, 'components', 'settings', 'StudyLanguagePicker.tsx'), 'utf8');
    const notifications = fs.readFileSync(path.join(ROOT, 'app', 'notifications.ts'), 'utf8');

    expect(provider).toContain('getStoredStudyTarget(lang)');
    expect(provider).toContain("if (devTarget === 'es')");
    expect(provider).toContain("if (devTarget === 'fr')");
    expect(settings).toContain('French and Spanish are DEV-only. The public version keeps English active.');
    expect(studyLanguages).toContain("if (ENABLE_DEV_STUDY_TARGET_LANG && (code === 'es' || code === 'fr'))");
    expect(studyLanguages).toContain('await setDevStudyTargetLang(code, uiLang)');
    expect(studyLanguages).toContain("await setStoredStudyTarget('en', uiLang)");
    expect(studyLanguages).toContain("prefetchAndRecordStudyTargetServerPack('fr', uiLang)");
    expect(picker).toContain('language_en.webp');
    expect(picker).toContain('language_fr_dev.webp');
    expect(picker).toContain('language_es_dev.webp');
    expect(picker).toContain('if (!ENABLE_DEV_STUDY_TARGET_LANG) return undefined;');
    expect(picker).toContain('studyTargetsForSourceLocale(lang)');
    expect(notifications).toContain('getStoredStudyTarget(lang)');
    expect(notifications).not.toContain('getDevStudyTargetLang(lang)');
  });
});

describe('French phrase surface contract', () => {
  const phrase: LessonPhrase = {
    id: 'fr-contract',
    english: 'I am safe.',
    russian: 'Я в безопасности.',
    ukrainian: 'Я в безпеці.',
    french: 'Je suis en sécurité.',
    words: [
      { text: 'I', correct: 'I', distractors: ['you'], category: 'pronoun' },
      { text: 'am', correct: 'am', distractors: ['are'], category: 'verb' },
      { text: 'safe', correct: 'safe', distractors: ['busy'], category: 'adjective' },
      { text: '.', correct: '.', distractors: ['?'], category: 'punctuation' },
    ],
    wordsFr: [
      { text: 'Je', correct: 'Je', distractors: ['Tu'], category: 'pronoun' },
      { text: 'suis', correct: 'suis', distractors: ['es'], category: 'verbe_être' },
      { text: 'en', correct: 'en', distractors: ['à'], category: 'preposition' },
      { text: 'sécurité', correct: 'sécurité', distractors: ['maison'], category: 'noun' },
      { text: '.', correct: '.', distractors: ['?'], category: 'punctuation' },
    ],
  };

  it('uses French content only when the French study target is active', () => {
    expect(phraseHasStudyTargetContent(phrase, 'fr')).toBe(true);
    expect(phraseWordRowsForStudyTarget(phrase, 'fr').map((w) => w.correct)).toEqual([
      'Je',
      'suis',
      'en',
      'sécurité',
      '.',
    ]);
    expect(phrasePrimarySurface(phrase, 'fr')).toBe('Je suis en sécurité.');
    expect(phraseCanonicalAnswer(phrase, 'fr')).toBe('Je suis en sécurité');
    expect(phraseAnswerDisplayLine(phrase, 'fr', 'ru')).toBe('Je suis en sécurité.');
    expect(ttsLocaleForStudyTarget('fr')).toBe('fr-FR');
  });

  it('does not leak French into English mode', () => {
    expect(phrasePrimarySurface(phrase, 'en')).toBe('I am safe.');
    expect(phraseAnswerDisplayLine(phrase, 'en', 'ru')).toBe('I am safe.');
    expect(ttsLocaleForStudyTarget('en')).toBe('en-US');
  });

  it('treats blocked French lesson rows as unavailable instead of crashing on null runtime phrases', () => {
    expect(phraseWordRowsForStudyTarget(null as any, 'fr')).toEqual([]);
    expect(phraseHasStudyTargetContent(null as any, 'fr')).toBe(false);
    expect(phraseCanonicalAnswer(null as any, 'fr')).toBe('');
    expect(phrasePrimarySurface(null as any, 'fr')).toBe('');
    expect(phraseAnswerDisplayLine(null as any, 'fr', 'ru')).toBe('');
  });

  it('keeps the French wordsFr read site null-safe in the runtime helper', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'phrase_target_utils.ts'), 'utf8');
    expect(source).toContain('phrase?.wordsFr?.length ? phrase.wordsFr : []');
    expect(source).toContain('!!phrase?.french?.trim() && !!phrase?.wordsFr?.length');
  });

  it('does not expose English-only preposition drills in French mode', () => {
    expect(getLessonPrepositionPack(8, 'en')).not.toBeNull();
    expect(hasLessonPrepositionDrillForTarget(8, 'fr')).toBe(false);
    expect(getLessonPrepositionPack(8, 'fr')).toBeNull();
    expect(getLessonPrepositionTexts(8, 'fr')).toEqual([]);
  });

  it('keeps bundled French lesson rows inactive while server-pack runtime ids are approved', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds).toEqual(Array.from({ length: 32 }, (_, index) => index + 1));

    for (let lessonId = 1; lessonId <= FRENCH_CONTENT_SOURCE_GATE.draftSeedLessonLimit; lessonId += 1) {
      const lesson = getLessonData(lessonId);
      const block = lesson.filter((item) => {
        const match = new RegExp(`^lesson${lessonId}_phrase_(\\d+)$`).exec(String(item.id));
        return match ? Number(match[1]) <= 50 : false;
      });

      expect(block.length).toBeGreaterThan(0);
      expect(block.length).toBeLessThanOrEqual(50);
      expect(block.some((item) => item.french || item.wordsFr?.length || item.alternativesFr?.length)).toBe(false);
      expect(block.some((item) => phraseHasStudyTargetContent(item, 'fr'))).toBe(false);
    }
  });
});
