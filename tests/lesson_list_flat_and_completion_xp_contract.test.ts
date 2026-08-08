import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('lesson list and completion XP contracts', () => {
  it('keeps the complete lesson path permanently visible in one flat list', () => {
    const source = read('app', '(tabs)', 'lessons.tsx');

    expect(source).toContain("kind: 'lesson'");
    expect(source).toContain("kind: 'exam'");
    expect(source).toContain("kind: 'attestation'");
    expect(source).toContain("data={listData}");
    expect(source).not.toContain("kind: 'chapter'");
  });

  it('passes this lesson’s awarded answer XP plus first-completion XP to animated results', () => {
    const source = read('app', 'lesson_complete.tsx');
    const bonusGrant = read('app', 'lesson_bonus_grant.ts');

    expect(source).toContain('deriveConfirmedLessonResults');
    expect(source).toContain('xp={lessonResults.xp}');
    expect(source).toContain('rewards={lessonResults.rewards}');
    expect(source).toContain('<ResultsSequence');
    expect(source).not.toContain('xp={bonusXP}');
    expect(bonusGrant).toContain('const finalDelta = Math.max(0, Math.round(xpResult.finalDelta || 0));');
    expect(bonusGrant).toContain('baseXp: reward.totalXP');
    expect(bonusGrant).toContain('multiplier: xpResult.multiplier');
    expect(source).toContain('setFirstCompletionAward({');
  });

  it('grants first-completion XP only after lesson1 passes the lesson', () => {
    const lesson = read('app', 'lesson1.tsx');
    const completion = read('app', 'lesson_complete.tsx');

    expect(lesson).toContain("passed: finalScore >= 2.5 ? '1' : '0'");
    expect(completion).toContain("const isQualifyingLessonPass = params.passed === '1';");
    expect(completion).toContain('if (!isQualifyingLessonPass) return;');
  });

  it('preserves the computed lesson pass status in the completion fallback', () => {
    const lesson = read('app', 'lesson1.tsx');
    const navigationStart = lesson.indexOf('const navigate = async () => {');
    const completionTimerStart = lesson.lastIndexOf('setTimeout(async () => {', navigationStart);
    const completionTryStart = lesson.indexOf('try {', completionTimerStart);
    const finalScoreStart = lesson.indexOf('let finalScore =', completionTimerStart);
    const fallbackStart = lesson.indexOf('} catch (e) {', navigationStart);
    const fallbackEnd = lesson.indexOf('      }, 1500);', fallbackStart);

    expect(navigationStart).toBeGreaterThan(-1);
    expect(completionTimerStart).toBeGreaterThan(-1);
    expect(completionTryStart).toBeGreaterThan(completionTimerStart);
    expect(finalScoreStart).toBeGreaterThan(completionTimerStart);
    expect(finalScoreStart).toBeLessThan(completionTryStart);
    expect(fallbackStart).toBeGreaterThan(navigationStart);
    expect(fallbackEnd).toBeGreaterThan(fallbackStart);

    const fallback = lesson.slice(fallbackStart, fallbackEnd);
    expect(fallback).toContain("passed: finalScore >= 2.5 ? '1' : '0'");
    expect(fallback).not.toContain("passed: '0'");
  });
});
