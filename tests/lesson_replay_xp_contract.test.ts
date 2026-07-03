import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson replay XP contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

  it('awards lesson XP immediately on each correct answer', () => {
    const xpStart = source.indexOf('const xpAmount = Math.round(5 * comboM);');
    expect(xpStart).toBeGreaterThanOrEqual(0);
    const xpEnd = source.indexOf('// [COMBO]', xpStart);
    const xpBlock = source.slice(xpStart, xpEnd > xpStart ? xpEnd : xpStart + 2600);

    expect(xpBlock).toContain('setXpToastAmount(optimisticXpAmount)');
    expect(xpBlock).not.toContain('if (userNameRef.current) {');
    expect(xpBlock).toContain("registerXP(xpAmount, 'lesson_answer'");
    expect(xpBlock).toContain("userNameRef.current || ''");
    expect(xpBlock).toContain("'answer'");
    expect(xpBlock).toContain('skipLeagueChestMultiplier: true');
    expect(xpBlock).toContain("surface: 'lesson1_answer'");
    expect(xpBlock).not.toContain('!isReplayRef.current');
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
    const wrongEnd = source.indexOf('// [SRS]', wrongStart);
    const wrongBlock = source.slice(wrongStart, wrongEnd > wrongStart ? wrongEnd : wrongStart + 900);

    expect(wrongBlock).toContain('correctStreakRef.current = 0;');
    expect(wrongBlock).not.toContain('if (!isReplayRef.current)');
  });
});
