import fs from 'fs';
import path from 'path';
import {
  FRENCH_CONTENT_SOURCE_GATE,
  frenchLessonRuntimeAvailableForTarget,
} from '../app/french_content_source_gate';

const ROOT = path.join(__dirname, '..');

describe('Gustav French lesson entry point gate', () => {
  it('keeps French lesson runtime unavailable until the app seed is source-approved', () => {
    expect(FRENCH_CONTENT_SOURCE_GATE.approvedAppSeedLessonIds).toEqual([]);
    expect(frenchLessonRuntimeAvailableForTarget('en', 1)).toBe(true);
    expect(frenchLessonRuntimeAvailableForTarget('es', 1)).toBe(true);
    expect(frenchLessonRuntimeAvailableForTarget('fr', 1)).toBe(false);
  });

  it('blocks lesson_menu primary, continue, and intro replay before opening /lesson1 for French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');

    expect(source).toContain("import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate'");
    expect(source).toContain("import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate'");
    expect(source).toContain('const frenchLessonSourceGated = !frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId)');
    expect(source).toContain("const frenchTheorySourceGated = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)");
    expect(source).toContain("const [soonOpen, setSoonOpen] = useState<null | 'frenchLesson' | 'frenchTheory' | 'vocab' | 'verbs' | 'prepositions'>(null)");
    expect(source).toContain('Материал на проверке');
    expect(source).toContain('English фразы не подставляются');

    const sharedOpenSlice = source.slice(
      source.indexOf('const openLessonFromMenu = useCallback'),
      source.indexOf('const handleStartLesson = useCallback'),
    );
    expect(sharedOpenSlice).toContain('if (frenchLessonSourceGated)');
    expect(sharedOpenSlice.indexOf("setSoonOpen('frenchLesson')")).toBeLessThan(
      sharedOpenSlice.indexOf('primeLessonScreenFromStorage(lessonId, studyTarget)'),
    );
    expect(sharedOpenSlice.indexOf('primeLessonScreenFromStorage(lessonId, studyTarget)')).toBeLessThan(
      sharedOpenSlice.indexOf("router.push({ pathname: '/lesson1'"),
    );

    const startSlice = source.slice(
      source.indexOf('const handleStartLesson = useCallback'),
      source.indexOf('const handleContinueLesson = openLessonFromMenu'),
    );
    expect(startSlice).toContain('if (frenchLessonSourceGated)');
    expect(startSlice.indexOf("setSoonOpen('frenchLesson')")).toBeLessThan(
      startSlice.indexOf('primeLessonScreenFromStorage(lessonId, studyTarget)'),
    );
    expect(startSlice.indexOf('primeLessonScreenFromStorage(lessonId, studyTarget)')).toBeLessThan(
      startSlice.indexOf("router.replace({ pathname: '/lesson1'"),
    );

    const continueSlice = source.slice(
      source.indexOf('const handleContinueLesson = openLessonFromMenu'),
      source.indexOf('const handleReplayIntroAndContinue = useCallback'),
    );
    expect(continueSlice).toContain('const handleContinueLesson = openLessonFromMenu');

    const replayIntroSlice = source.slice(
      source.indexOf('const handleReplayIntroAndContinue = useCallback'),
      source.indexOf('const handleLockedLessonPress = useCallback'),
    );
    expect(replayIntroSlice).toContain('if (frenchLessonSourceGated)');
    expect(replayIntroSlice.indexOf("setSoonOpen('frenchLesson')")).toBeLessThan(
      replayIntroSlice.indexOf('primeLessonScreenFromStorage(lessonId, studyTarget)'),
    );
  });

  it('blocks lesson_menu theory before opening /lesson_help for French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_menu.tsx'), 'utf8');

    expect(source).toContain('Теория на проверке');
    expect(source).toContain('French theory откроется после source gate');
    expect(source).toContain('English theory не подставляется');
    expect(source).toContain('Французская теория ещё закрыта source gate');
    expect(source).toContain('английскую теорию, интро или примеры как замену French');

    const theorySlice = source.slice(
      source.indexOf("testID: 'lesson-menu-theory'"),
      source.indexOf('];', source.indexOf("testID: 'lesson-menu-theory'")),
    );
    expect(theorySlice).toContain('if (frenchTheorySourceGated)');
    expect(theorySlice).toContain("setSoonOpen('frenchTheory')");
    expect(theorySlice).toContain('unavailable: frenchTheorySourceGated');
    expect(theorySlice.indexOf("setSoonOpen('frenchTheory')")).toBeLessThan(
      theorySlice.indexOf("router.push({ pathname: '/lesson_help'"),
    );
  });

  it('blocks daily task lesson and theory navigation before French source approval', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'daily_tasks_screen.tsx'), 'utf8');

    expect(source).toContain("import { frenchLessonRuntimeAvailableForTarget } from './french_content_source_gate'");
    expect(source).toContain('const openLessonOrFrenchGate = async () =>');
    expect(source).toContain('French урок ещё на source gate');
    expect(source).toContain('English фразы не будут открыты как замена');
    expect(source).toContain('French теория откроется после source gate');

    const navSlice = source.slice(
      source.indexOf('const openLessonOrFrenchGate = async () =>'),
      source.indexOf('switch (task.type)'),
    );
    expect(navSlice).toContain('if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId))');
    expect(navSlice.indexOf("router.replace('/(tabs)/lessons' as any)")).toBeLessThan(
      navSlice.indexOf("router.push({ pathname: '/lesson1'"),
    );

    const lessonTaskSlice = source.slice(
      source.indexOf("case 'total_answers':"),
      source.indexOf("case 'verb_learned':"),
    );
    expect(lessonTaskSlice).toContain('await openLessonOrFrenchGate()');
    expect(lessonTaskSlice).not.toContain("router.push({ pathname: '/lesson1'");

    const theorySlice = source.slice(
      source.indexOf("case 'open_theory':"),
      source.indexOf("case 'flashcard_view':"),
    );
    expect(theorySlice).toContain('if (!frenchLessonRuntimeAvailableForTarget(studyTarget, lessonId))');
    expect(theorySlice.indexOf("router.replace('/(tabs)/lessons' as any)")).toBeLessThan(
      theorySlice.indexOf("router.push({ pathname: '/lesson_help'"),
    );
  });
});
