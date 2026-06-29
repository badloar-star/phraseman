import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav French lesson runtime source gate', () => {
  it('renders a blocked French lesson state before mounting the lesson runtime when no sourced rows exist', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

    const lessonDataSlice = source.slice(
      source.indexOf('const LESSON_DATA = useMemo'),
      source.indexOf('const effectiveTotal = Math.min'),
    );
    expect(lessonDataSlice).toContain('getLessonData(lessonId)');
    expect(lessonDataSlice).toContain('phraseHasStudyTargetContent(p, studyTarget)');
    expect(lessonDataSlice).toContain('[planPhraseLesson, lessonId, studyTarget');
    expect(source).toContain('const hasPlayableLessonRows = effectiveTotal > 0');
    expect(source).toContain('const frenchLessonSourceGateBlocked = frenchStudyActive(studyTarget) && !hasPlayableLessonRows');
    expect(source).toContain('if (frenchLessonSourceGateBlocked)');

    const blockedSlice = source.slice(
      source.indexOf('if (frenchLessonSourceGateBlocked)'),
      source.indexOf('<LessonContent'),
    );

    expect(blockedSlice).toContain('Французский материал ещё на проверке');
    expect(blockedSlice).toContain('French source gate');
    expect(blockedSlice).toContain("router.replace('/(tabs)/lessons' as any)");
    expect(blockedSlice).not.toContain('<LessonContent');
    expect(blockedSlice).not.toContain('phraseAnswerDisplayLine(');
    expect(blockedSlice).not.toContain('phraseWordRowsForStudyTarget(');
    expect(blockedSlice).not.toContain('safeGetDistracts(');
  });

  it('clears hydrated lesson state instead of reusing English phrase order for blocked French lessons', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
    const noPlayableRowsSlice = source.slice(
      source.indexOf('if (!hasPlayableLessonRows)'),
      source.indexOf('// Показываем intro-экраны'),
    );

    expect(noPlayableRowsSlice).toContain('phraseOrderRef.current = []');
    expect(noPlayableRowsSlice).toContain('setProgress([])');
    expect(noPlayableRowsSlice).toContain('setShuffled([])');
    expect(noPlayableRowsSlice).toContain('setSelectedWords([])');
    expect(noPlayableRowsSlice).toContain('touchLessonScreenPrimed(lessonStorageId, {');
    expect(noPlayableRowsSlice).toContain('order: []');
    expect(noPlayableRowsSlice).toContain('progress: []');
    expect(noPlayableRowsSlice).toContain('override: null');
    expect(noPlayableRowsSlice).toContain('}, studyTarget)');
    expect(noPlayableRowsSlice).toContain('return;');
  });

  it('source-gates in-runtime theory and grammar hints before English support can show as French', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

    expect(source).toContain("import { lessonSupportContentAvailableForTarget } from './lesson_support_target_gate'");
    expect(source).toContain("const lessonTheorySupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_theory', lessonId)");
    expect(source).toContain("const lessonHintSupportBlocked = !lessonSupportContentAvailableForTarget(studyTarget, 'lesson_hint', lessonId)");
    expect(source).toContain('lessonTheorySupportBlocked={lessonTheorySupportBlocked}');
    expect(source).toContain('lessonHintSupportBlocked={lessonHintSupportBlocked}');
    expect(source).toContain('lessonTheorySupportBlocked: boolean;');
    expect(source).toContain('lessonHintSupportBlocked: boolean;');

    const grammarHintSlice = source.slice(
      source.indexOf('const triggerGrammarHint = useCallback'),
      source.indexOf('const hideGrammarHint = useCallback'),
    );
    expect(grammarHintSlice).toContain('if (lessonHintSupportBlocked) return');
    expect(grammarHintSlice.indexOf('if (lessonHintSupportBlocked) return')).toBeLessThan(
      grammarHintSlice.indexOf('for (const hint of GRAMMAR_HINTS)'),
    );

    const theoryButtonSlice = source.slice(
      source.indexOf('testID="lesson1-theory"'),
      source.indexOf('{status === \'result\'', source.indexOf('testID="lesson1-theory"')),
    );
    expect(theoryButtonSlice).toContain('if (lessonTheorySupportBlocked)');
    expect(theoryButtonSlice).toContain("name={lessonTheorySupportBlocked ? 'shield-checkmark-outline' : 'book-outline'}");
    expect(theoryButtonSlice).toContain("ru: 'На проверке'");
  });
});
