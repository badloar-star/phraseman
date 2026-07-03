import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('Gustav French lesson runtime source gate', () => {
  it('loads French lesson rows from the remote server pack before falling back to any empty state', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

    const lessonDataSlice = source.slice(
      source.indexOf('const LESSON_DATA = useMemo'),
      source.indexOf('const effectiveTotal = Math.min'),
    );
    expect(source).toContain("import { loadFrenchRemoteLessonRows } from './french_lesson_remote_runtime'");
    expect(source).toContain('const frenchRemoteLessonRequired = frenchStudyActive(studyTarget) && !isPlanPhraseLessonTask');
    expect(source).toContain('loadFrenchRemoteLessonRows(lessonId, frenchRemoteSourceLocale)');
    expect(lessonDataSlice).toContain('remoteFrenchLessonRows ?? getLessonData(lessonId)');
    expect(lessonDataSlice).toContain('phraseHasStudyTargetContent(p, studyTarget)');
    expect(lessonDataSlice).toContain('[planPhraseLesson, remoteFrenchLessonRows, lessonId, studyTarget');
    expect(source).toContain('const hasPlayableLessonRows = effectiveTotal > 0');
    expect(source).toContain("const frenchLessonRemotePending = frenchRemoteLessonRequired && (remoteFrenchLessonLoadState === 'idle' || remoteFrenchLessonLoadState === 'loading')");
    expect(source).toContain("const frenchLessonRemoteFailed = frenchRemoteLessonRequired && remoteFrenchLessonLoadState === 'failed' && !hasPlayableLessonRows");
    expect(source).toContain('const frenchLessonSourceGateBlocked = frenchStudyActive(studyTarget) && !hasPlayableLessonRows && !frenchLessonRemotePending && !frenchLessonRemoteFailed');
    expect(source).toContain('if (frenchLessonRemotePending)');
    expect(source).toContain('if (frenchLessonRemoteFailed)');
    expect(source).toContain('if (frenchLessonSourceGateBlocked)');
  });

  it('clears hydrated lesson state instead of reusing English phrase order when no rows are playable', () => {
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

  it('keeps in-runtime support gates language-aware before English helpers can show as French', () => {
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
  });
});
