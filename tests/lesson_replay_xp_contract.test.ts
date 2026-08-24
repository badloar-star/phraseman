import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson replay XP contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

  it('awards lesson XP immediately on each correct answer', () => {
    const xpStart = source.indexOf('const normalBaseXp = Math.round(5 * comboM);');
    expect(xpStart).toBeGreaterThanOrEqual(0);
    const xpEnd = source.indexOf('// [COMBO]', xpStart);
    const xpBlock = source.slice(xpStart, xpEnd > xpStart ? xpEnd : xpStart + 4200);

    expect(xpBlock).toContain('setXpToastAmount(optimisticXpAmount)');
    expect(xpBlock).not.toContain('if (userNameRef.current) {');
    expect(xpBlock).toContain("registerXP(xpAmount, 'lesson_answer'");
    expect(xpBlock).toContain("userNameRef.current || ''");
    expect(xpBlock).toContain("'answer'");
    expect(xpBlock).not.toContain('skipLeagueChestMultiplier: true');
    expect(xpBlock).toContain("surface: 'lesson1_answer'");
    expect(xpBlock).not.toContain('!isReplayRef.current');
    expect(xpBlock).toContain('resolveLessonAnswerBaseXp(normalBaseXp, isReplayRef.current');
    expect(xpBlock).toContain('replayRewardRate: isReplayRef.current ? LESSON_REPLAY_XP_RATE : 1');
  });

  it('applies global multipliers after reducing replay base XP', () => {
    const resolution = source.indexOf('const answerBaseXp = resolveLessonAnswerBaseXp');
    const registration = source.indexOf("registerXP(xpAmount, 'lesson_answer'", resolution);

    expect(resolution).toBeGreaterThanOrEqual(0);
    expect(registration).toBeGreaterThan(resolution);
    expect(source.slice(resolution, registration)).toContain('const xpAmount = answerBaseXp.baseXp;');
  });

  it('finalizes lesson-scoped one-shot multipliers once on the result screen', () => {
    const completion = fs.readFileSync(path.join(ROOT, 'app', 'lesson_complete.tsx'), 'utf8');
    expect(completion).toContain('finalizeLessonXpMultipliers(completionAttemptId)');
  });

  it('does not reset replay rounding state during deferred hydration', () => {
    const loadStart = source.indexOf('const loadData = async () => {');
    const loadEnd = source.indexOf('const shuffleWords', loadStart);
    const loadBlock = source.slice(loadStart, loadEnd);

    expect(loadStart).toBeGreaterThanOrEqual(0);
    expect(loadBlock).not.toContain('replayNormalBaseXpRef.current = 0');
    expect(loadBlock).not.toContain('replayAwardedBaseXpRef.current = 0');
    expect(source).toContain("const replayXpScope = `${lessonStorageId}:${studyTarget}:${routeServerAttemptId ?? 'stored'}`;");
  });

  it('does not hold answer XP until lesson completion', () => {
    const completeStart = source.indexOf('const didUnlock = await tryUnlockNextLesson');
    expect(completeStart).toBeGreaterThanOrEqual(0);
    const completeEnd = source.indexOf('logLessonComplete(lessonId);', completeStart);
    const completeBlock = source.slice(completeStart, completeEnd > completeStart ? completeEnd : completeStart + 2400);

    expect(source).not.toContain("registerXP(batch.baseTotal, 'lesson_complete'");
    expect(source).not.toContain('pendingLessonXpRef.current');
    expect(completeBlock).not.toContain('registerXP(');
  });

  it('breaks the lesson combo after mistakes during replay attempts', () => {
    const wrongStart = source.indexOf("np[progressCell] = 'wrong';");
    expect(wrongStart).toBeGreaterThanOrEqual(0);
    const wrongEnd = source.indexOf('// Новая долгосрочная система «Ошибки»', wrongStart);
    const wrongBlock = source.slice(wrongStart, wrongEnd > wrongStart ? wrongEnd : wrongStart + 900);

    expect(wrongBlock).toContain('correctStreakRef.current = 0;');
    expect(wrongBlock).not.toContain('if (!isReplayRef.current)');
  });
});
