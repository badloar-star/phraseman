import fs from 'fs';
import path from 'path';
import {
  FRENCH_CONTENT_SOURCE_GATE,
  frenchLessonRuntimeAvailableForTarget,
} from '../app/french_content_source_gate';

const ROOT = path.join(__dirname, '..');
const APPROVED_LESSON_IDS = Array.from({ length: 32 }, (_, index) => index + 1);

describe('Gustav French lesson entry point gate', () => {
  it('opens French lesson runtime after server-pack activation approval', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds).toEqual(APPROVED_LESSON_IDS);
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedIntroLessonIds).toEqual(APPROVED_LESSON_IDS);
    expect(frenchLessonRuntimeAvailableForTarget('en', 1)).toBe(true);
    expect(frenchLessonRuntimeAvailableForTarget('es', 1)).toBe(true);
    expect(frenchLessonRuntimeAvailableForTarget('fr', 1)).toBe(true);
    expect(frenchLessonRuntimeAvailableForTarget('fr', 32)).toBe(true);
  });

  it('lets lesson_menu primary, continue, and intro replay open /lesson1 for French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');

    // зачем (владелец 05.11): запуск урока больше не закрывается заглушкой «урок готовится» — модал и ветка frenchLessonSourceGated удалены.
    expect(source).toContain("import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate'");
    expect(source).not.toContain('frenchLessonSourceGated');
    expect(source).not.toContain('frenchLessonRuntimeAvailableForTarget');

    const sharedOpenSlice = source.slice(
      source.indexOf('const openLessonFromMenu = useCallback'),
      source.indexOf('const handleStartLesson = useCallback'),
    );
    expect(sharedOpenSlice).toContain('primeLessonScreenFromStorage(lessonId, studyTarget)');
    expect(sharedOpenSlice).toContain("router.push({ pathname: '/lesson1'");

    const startSlice = source.slice(
      source.indexOf('const handleStartLesson = useCallback'),
      source.indexOf('const handleContinueLesson = openLessonFromMenu'),
    );
    expect(startSlice).toContain('primeLessonScreenFromStorage(lessonId, studyTarget)');
    expect(startSlice).toContain("router.push({ pathname: '/lesson1'");

    const replayIntroSlice = source.slice(
      source.indexOf('const handleReplayIntroAndContinue = useCallback'),
      source.indexOf('const handleLockedLessonPress = useCallback'),
    );
    expect(replayIntroSlice).toContain('primeLessonScreenFromStorage(lessonId, studyTarget)');
    expect(replayIntroSlice).toContain("router.push({");
    expect(replayIntroSlice).toContain("pathname: '/lesson1'");
  });

  it('hides auxiliary sections of a non-English course instead of stubbing them or opening English-only helpers', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');

    // зачем (владелец 05.11): контракт был «заглушка есть» — теперь «заглушки нет, пункт скрыт, английского источника для не-en нет».
    expect(source).toContain("const targetVocabularyAvailable = vocabularyContentAvailableForTarget(studyTarget, 'lesson_words')");
    expect(source).not.toContain('hideEnglishOnlyAuxiliary');
    expect(source).not.toContain('frenchAuxiliarySourceGated');
    expect(source).not.toContain('prepositionSourceGated');
    expect(source).not.toContain('frenchTheorySourceGated');

    const wordsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-words'"),
      source.indexOf("testID: 'lesson-menu-irregular-verbs'"),
    );
    expect(wordsSlice).toContain('hidden: !targetVocabularyAvailable || !lessonHasWords');
    expect(wordsSlice).not.toContain('unavailable:');
    expect(wordsSlice).not.toContain("setSoonOpen('vocab')");

    const verbsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-irregular-verbs'"),
      source.indexOf("testID: 'lesson-menu-prepositions'"),
    );
    expect(verbsSlice).toContain('hidden: !targetVerbsAvailable || !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)');
    expect(verbsSlice).not.toContain('unavailable:');
    expect(verbsSlice).not.toContain("setSoonOpen('verbs')");

    const prepositionsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-prepositions'"),
      source.indexOf("testID: 'lesson-menu-theory'"),
    );
    expect(prepositionsSlice).toContain('hidden: !targetHasPrepositionDrill,');
    expect(prepositionsSlice).not.toContain('unavailable:');
    expect(prepositionsSlice).not.toContain("setSoonOpen('prepositions')");

    const theorySlice = source.slice(source.indexOf("testID: 'lesson-menu-theory'"));
    expect(theorySlice).toContain('targetTheoryUnavailable ||');
    expect(theorySlice.slice(0, theorySlice.indexOf('];'))).not.toContain("setSoonOpen('frenchTheory')");
  });

});
