import fs from 'fs';
import path from 'path';

describe('lesson finish screen contract', () => {
  it('closes the lesson by position after pending boundary replays are drained', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');
    const completionStart = source.indexOf('// Урок закрывается по кругу позиций');
    expect(completionStart).toBeGreaterThan(-1);

    const completionBlock = source.slice(completionStart, source.indexOf("void trackFeatureStart('lesson', 'complete'", completionStart));
    expect(completionBlock).toContain('if (nextCell === 0 && !pendingCycleEndReplay)');
    expect(completionBlock).not.toContain('overridePhraseCell === null');
    expect(completionBlock).not.toContain('sessionAnswerCount.current >= effectiveTotal');
    expect(completionBlock).not.toContain('total_answers');
  });

  it('replays pending last lesson mistakes before opening the final screen', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');
    expect(source).toContain('const ERROR_REPLAY_DELAY_ANSWERS = 2;');

    const replayStart = source.indexOf('const pendingCycleEndReplay = nextCell === 0');
    expect(replayStart).toBeGreaterThan(-1);
    const replayEnd = source.indexOf('if (nextCell === 0 && !pendingCycleEndReplay)', replayStart);
    expect(replayEnd).toBeGreaterThan(replayStart);
    const replayBlock = source.slice(replayStart, replayEnd);

    expect(replayBlock).toContain('!isPlanPhraseLessonTask');
    expect(replayBlock).toContain('errorQueueRef.current.length > 0');
    expect(replayBlock).toContain('questionsSinceErrorRef.current = Math.max(questionsSinceErrorRef.current, ERROR_REPLAY_DELAY_ANSWERS - 1);');
    expect(replayBlock).toContain('persistErrorReplayToStorage(overridePhraseCell);');

    const goNextStart = source.indexOf('const goNext = useCallback');
    const goNextBlock = source.slice(goNextStart, source.indexOf('// BUGFIX:', goNextStart));
    expect(goNextBlock).toContain('questionsSinceErrorRef.current >= ERROR_REPLAY_DELAY_ANSWERS');
  });

  it('keeps result reveal animation on the native driver before lesson completion', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');
    const resultStart = source.indexOf('// Сразу показываем результат');
    expect(resultStart).toBeGreaterThan(-1);

    const resultBlock = source.slice(resultStart, source.indexOf('const nextCell = (cellIndex + 1) % effectiveTotal', resultStart));
    expect(resultBlock).toContain('fadeAnim.stopAnimation');
    expect(resultBlock).toContain('Animated.timing(fadeAnim');
    expect(resultBlock).toContain('useNativeDriver: true');
    expect(resultBlock).not.toContain('useNativeDriver: false');
  });

  it('routes directly to the final screen without a duplicate cycle-end modal', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');

    expect(source).not.toContain('LessonCycleEndModal');
    expect(source).not.toContain('testID="lesson-cycle-end-modal"');
    expect(source).not.toContain('testID="lesson-cycle-end-continue"');
    expect(source).toContain('There is one completion surface: go straight to lesson_complete.');
    expect(source).toContain('await navigate();');
  });
});
