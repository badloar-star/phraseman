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

    expect(source).toContain("import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate'");
    expect(source).toContain("import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate'");
    expect(source).toContain('const frenchLessonSourceGated = !frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId)');

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

  it('keeps French auxiliary sections from opening English-only helpers as substitutes', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');

    expect(source).toContain("const frenchAuxiliarySourceGated = storageStudyTarget(studyTarget) === 'fr'");
    expect(source).toContain("const englishHasPrepositionDrill = hasLessonPrepositionDrillForTarget(lessonId, 'en')");
    expect(source).not.toContain('hideEnglishOnlyAuxiliary');

    const wordsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-words'"),
      source.indexOf("testID: 'lesson-menu-irregular-verbs'"),
    );
    expect(wordsSlice).toContain('unavailable: frenchAuxiliarySourceGated');
    expect(wordsSlice.indexOf("if (frenchAuxiliarySourceGated)")).toBeLessThan(
      wordsSlice.indexOf("router.push({ pathname: '/lesson_words'"),
    );

    const verbsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-irregular-verbs'"),
      source.indexOf("testID: 'lesson-menu-prepositions'"),
    );
    expect(verbsSlice).toContain('hidden: !LESSONS_WITH_IRREGULAR_VERBS.has(lessonId)');
    expect(verbsSlice).toContain('unavailable: frenchAuxiliarySourceGated');
    expect(verbsSlice.indexOf("if (frenchAuxiliarySourceGated)")).toBeLessThan(
      verbsSlice.indexOf("router.push({ pathname: '/lesson_irregular_verbs'"),
    );

    const prepositionsSlice = source.slice(
      source.indexOf("testID: 'lesson-menu-prepositions'"),
      source.indexOf("testID: 'lesson-menu-theory'"),
    );
    expect(prepositionsSlice).toContain('hidden: !targetHasPrepositionDrill && !prepositionSourceGated');
    expect(prepositionsSlice).toContain('unavailable: prepositionSourceGated');
    expect(prepositionsSlice.indexOf('if (prepositionSourceGated)')).toBeLessThan(
      prepositionsSlice.indexOf("router.push({ pathname: '/preposition_drill'"),
    );
  });

  it('lets daily task lesson and theory navigation rely on the opened French gates', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(source).toContain("import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate'");
    expect(source).toContain('const openLessonOrFrenchGate = async () =>');
    expect(source).toContain('if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId))');
    expect(source).toContain("router.push({ pathname: '/lesson1'");
    expect(source).toContain("if (!lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId))");
    expect(source).toContain("router.push({ pathname: '/lesson_help'");
  });
});
