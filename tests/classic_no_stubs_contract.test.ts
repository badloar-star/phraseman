// зачем (владелец 05.11, 06:07–06:10: «Вот такого нигде не должно быть никаких заглушек!!! Все в приложении!!!» и «теория во всех языках
// показывает английский»): в классических курсах (fr/es/de/it) нет заглушек «пока готовится / скрыты / скоро откроется»; пункт без данных
// целевого языка скрыт; английский источник теории и шпаргалки для не-английского курса не показывается никогда.
import fs from 'fs';
import path from 'path';

import { lessonSupportContentAvailableForTarget } from '../app/lesson_support_target_gate';
import { vocabularyContentAvailableForTarget } from '../app/vocabulary_target_gate';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// Экраны, которые видит человек в классическом курсе, и тексты-заглушки, которых в них быть не должно.
const SCREENS = [
  'app/lesson_menu.tsx',
  'app/lesson_help.tsx',
  'app/hint.tsx',
  'app/lesson_words.tsx',
  'app/lesson_irregular_verbs.tsx',
  'app/preposition_drill.tsx',
] as const;

const STUB_PHRASES = [
  'пока готовится',
  'пока готовятся',
  'ще готується',
  'ще готуються',
  'Английские слова скрыты',
  'Англійські слова приховано',
  'Английский список скрыт',
  'Англійський список приховано',
  'Скоро откроется',
  'Скоро відкриється',
  'being prepared',
  'frenchLessonSupportGateCopy',
  'frenchVocabularyGateCopy',
  'shield-checkmark-outline',
] as const;

const TARGETS = ['fr', 'es', 'de', 'it'] as const;

describe('classic courses: no stubs, no English source for a non-English course', () => {
  it.each(SCREENS)('%s has no stub copy', (rel) => {
    const source = read(rel);
    for (const phrase of STUB_PHRASES) {
      expect([rel, phrase, source.includes(phrase)]).toEqual([rel, phrase, false]);
    }
  });

  it('lesson menu hides items without target-language data instead of marking them unavailable', () => {
    const menu = read('app/lesson_menu.tsx');
    expect(menu).not.toMatch(/unavailable: (?!boolean)/);
    expect(menu).not.toContain('soonOpen');
    expect(menu).toContain('hidden: !targetVocabularyAvailable || !LESSONS_WITH_WORDS.has(lessonId)');
    expect(menu).toContain('hidden: !targetVocabularyAvailable || !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)');
    expect(menu).toContain('hidden: !targetHasPrepositionDrill,');
    expect(menu).toContain('targetTheoryUnavailable ||');
  });

  it.each(TARGETS)('%s: words, verbs and cheat sheet of the English source are closed', (target) => {
    expect(vocabularyContentAvailableForTarget(target, 'lesson_words')).toBe(false);
    expect(vocabularyContentAvailableForTarget(target, 'irregular_verbs')).toBe(false);
    expect(vocabularyContentAvailableForTarget(target, 'preposition_drill')).toBe(false);
    expect(lessonSupportContentAvailableForTarget(target, 'lesson_hint', 1)).toBe(false);
  });

  it.each(TARGETS)('%s: theory opens only with the course\'s own lesson intro (all 32 lessons)', (target) => {
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      expect([target, lessonId, lessonSupportContentAvailableForTarget(target, 'lesson_theory', lessonId)]).toEqual([target, lessonId, true]);
    }
    // урока вне курса и вызова без урока — теории нет
    expect(lessonSupportContentAvailableForTarget(target, 'lesson_theory', 99)).toBe(false);
    expect(lessonSupportContentAvailableForTarget(target, 'lesson_theory')).toBe(false);
  });

  it('English course keeps its own theory and cheat sheet', () => {
    expect(lessonSupportContentAvailableForTarget('en', 'lesson_theory', 1)).toBe(true);
    expect(lessonSupportContentAvailableForTarget('en', 'lesson_hint', 1)).toBe(true);
    expect(vocabularyContentAvailableForTarget('en', 'lesson_words')).toBe(true);
  });

  it('theory and hint routes never render the English source for a non-English course', () => {
    const help = read('app/lesson_help.tsx');
    expect(help).toContain("const isFrenchTarget = storageStudyTarget(studyTarget) !== 'en'");
    expect(help).toContain('getLessonIntroScreens(lessonId, studyTarget)');
    const hint = read('app/hint.tsx');
    expect(hint).toContain("const hintForeignTarget = storageStudyTarget(studyTarget) !== 'en'");
    expect(hint.indexOf('if (hintForeignTarget) return null;')).toBeLessThan(hint.indexOf('<LessonTheoryNew lessonId={lessonId} />'));
  });
});
