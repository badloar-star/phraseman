// зачем (владелец 05.11, 06:07–06:10: «Вот такого нигде не должно быть никаких заглушек!!! Все в приложении!!!» и «теория во всех языках
// показывает английский»): в классических курсах (fr/es/de/it) нет заглушек «пока готовится / скрыты / скоро откроется»; пункт без данных
// целевого языка скрыт; английский источник теории и шпаргалки для не-английского курса не показывается никогда.
import fs from 'fs';
import path from 'path';

import { lessonSupportContentAvailableForTarget } from '../app/lesson_support_target_gate';
import { vocabularyContentAvailableForTarget } from '../app/vocabulary_target_gate';
import { classicLessonWordBank } from '../app/classic_lesson_words';
import { getClassicTheory } from '../app/classic_theory';

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
  'скоро появится',
  'is coming soon',
  'unavailableTheoryText',
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
    expect(menu).toContain('hidden: !targetVocabularyAvailable || !lessonHasWords');
    expect(menu).toContain('hidden: !targetVerbsAvailable || !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)');
    expect(menu).toContain('hidden: !targetHasPrepositionDrill,');
    expect(menu).toContain('classicLessonWordCount');
    expect(menu).toContain('targetTheoryUnavailable ||');
  });

  it.each(TARGETS)('%s: words come from the course glossary; verbs, prepositions and cheat sheet of the English source are closed', (target) => {
    expect(vocabularyContentAvailableForTarget(target, 'lesson_words')).toBe(true);
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

  // зачем (владелец 05.11): «новый урок — новые слова БЕЗ ПОВТОРОВ предыдущих»; все слова из фраз — каждое в том уроке, где встретилось впервые.
  it.each(TARGETS)('%s: lesson words = glossary lemmas with firstLesson === N, no repeats across lessons', (target) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const glossary = require(`../modules/classic-courses/${target}/glossary.json`) as { lemmas: { lemma: string; firstLesson: number; meaning: Record<string, string> }[] };
    const seen = new Set<string>();
    let total = 0;
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      const bank = classicLessonWordBank(target, lessonId);
      // одинаковое написание под несколькими уроками остаётся только в самом раннем
      const expected = new Set(glossary.lemmas
        .filter((l) => l.firstLesson === lessonId && Math.min(...glossary.lemmas.filter((o) => o.lemma.trim().toLowerCase() === l.lemma.trim().toLowerCase()).map((o) => o.firstLesson)) === lessonId)
        .map((l) => l.lemma.trim()));
      expect([target, lessonId, new Set(bank.map((w) => w.en))]).toEqual([target, lessonId, expected]);
      for (const word of bank) {
        expect([target, lessonId, word.en, seen.has(word.en.toLocaleLowerCase())]).toEqual([target, lessonId, word.en, false]);
        seen.add(word.en.toLocaleLowerCase());
        expect(word.ru.length).toBeGreaterThan(0);
        expect(word.uk.length).toBeGreaterThan(0);
      }
      total += bank.length;
    }
    expect(total).toBe(new Set(glossary.lemmas.map((l) => l.lemma.trim().toLowerCase())).size);
  });

  // зачем (владелец 05.11: «Раздел теория во всех языках английский показывает»): теория fr/es/de/it — их theory.json, а не вступление и не английский текст.
  it.each(TARGETS)('%s: theory.json gives chapters with course examples for all 32 lessons, in every interface language', (target) => {
    for (let lessonId = 1; lessonId <= 32; lessonId += 1) {
      for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
        const theory = getClassicTheory(target, lessonId, locale);
        expect([target, lessonId, locale, theory !== null]).toEqual([target, lessonId, locale, true]);
        expect(theory!.sections.length).toBeGreaterThan(0);
        expect(theory!.sections.every((section) => section.body.length > 0 && !section.body.includes('`'))).toBe(true);
      }
      const ru = getClassicTheory(target, lessonId, 'ru')!;
      expect(ru.sections.some((section) => section.examples.length > 0)).toBe(true);
      expect(ru.sections.every((section) => section.examples.every((e) => e.target.length > 0 && e.translation.length > 0))).toBe(true);
    }
    // тексты разных языков интерфейса различаются: русский не равен английскому
    expect(getClassicTheory(target, 1, 'ru')!.sections[0]!.body).not.toBe(getClassicTheory(target, 1, 'en')!.sections[0]!.body);
  });

  it('English course has no classic theory file path (keeps its own theory)', () => {
    expect(getClassicTheory('en', 1, 'ru')).toBeNull();
    const help = read('app/lesson_help.tsx');
    expect(help).toContain('getClassicTheory(storageStudyTarget(studyTarget), lessonId, lang)');
    expect(help).toContain('renderClassicTheory(classicTheory, tg, f)');
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
