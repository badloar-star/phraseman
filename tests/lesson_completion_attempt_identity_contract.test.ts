import fs from 'fs';
import path from 'path';

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('lesson completion attempt identity 6A', () => {
  it('passes the completed run and next replay as two distinct identities', () => {
    const lesson = read('app/lesson1.tsx');
    const completion = lesson.slice(
      lesson.indexOf('if (nextCell === 0 && !pendingCycleEndReplay)'),
      lesson.indexOf('// Панель «Скажи вслух»', lesson.indexOf('if (nextCell === 0 && !pendingCycleEndReplay)')),
    );

    expect(completion).toContain(
      'const completedAttemptId = normalizeLessonServerAttemptId(serverAttemptIdRef.current)',
    );
    expect(completion).toContain('const nextAttemptId = makeLessonServerAttemptId();');
    expect(completion.indexOf('const completedAttemptId'))
      .toBeLessThan(completion.indexOf('serverAttemptIdRef.current = nextAttemptId;'));
    expect(completion).toContain('completedAttemptId,');
    expect(completion).toContain('repeatAttemptId: nextAttemptId');
  });

  it('deduplicates server completion by attempt id instead of medal pass_count', () => {
    const screen = read('app/lesson_complete.tsx');
    const submit = screen.slice(
      screen.indexOf('submitProgressEvent({'),
      screen.indexOf('void syncToCloud', screen.indexOf('submitProgressEvent({')),
    );

    expect(screen).toContain('completedAttemptId?: string | string[];');
    expect(screen).toContain('normalizeLessonServerAttemptId(params.completedAttemptId)');
    expect(submit).toContain('safeLessonCompleteEventPart(completionAttemptId)');
    expect(submit).toContain('attemptId: completionAttemptId');
    expect(submit).not.toContain('Math.max(1, newPassCount)');
  });

  it('keeps replay base at 20 percent and sends it through normal multiplier resolution', () => {
    const lesson = read('app/lesson1.tsx');
    const reward = read('app/lesson_replay_reward.ts');
    const answer = lesson.slice(
      lesson.indexOf('const answerBaseXp = resolveLessonAnswerBaseXp'),
      lesson.indexOf('// [COMBO]', lesson.indexOf('const answerBaseXp = resolveLessonAnswerBaseXp')),
    );

    expect(reward).toContain('export const LESSON_REPLAY_XP_RATE = 0.2;');
    expect(answer).toContain("registerXP(xpAmount, 'lesson_answer'");
    expect(answer).not.toContain('skipLeagueChestMultiplier: true');
    expect(answer).toContain('replayRewardRate: isReplayRef.current ? LESSON_REPLAY_XP_RATE : 1');
  });

  it('peeks lesson-wide boosts for every answer and consumes them once per completed attempt', () => {
    const manager = read('app/xp_manager.ts');
    const completion = read('app/lesson_complete.tsx');

    expect(manager).toContain('isLessonXp\n          ? await peekLeagueChestXpOverrideMultiplier()');
    expect(manager).toContain('export async function finalizeLessonXpMultipliers(');
    expect(manager).toContain('finalized.includes(normalizedAttemptId)');
    expect(manager).toContain('consumeLeagueChestXpOverrideMultiplier().catch(() => 1)');
    expect(manager).toContain('consumeSeasonGoldenLessonMultiplier().catch(() => 1)');
    expect(completion).toContain('finalizeLessonXpMultipliers(completionAttemptId)');
  });
});
