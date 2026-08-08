import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const read = (file: string): string => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('XP award caller contracts', () => {
  it('does not gate real XP writes on a loaded display name', () => {
    const lesson = read('app/lesson1.tsx');
    // зачем: строки про app/(tabs)/quizzes.tsx убраны — экран удалён вместе с квизами.
    const diagnostic = read('app/diagnostic_test.tsx');
    const irregularVerbs = read('app/lesson_irregular_verbs.tsx');
    const prepositions = read('app/preposition_drill.tsx');
    const review = read('app/review.tsx');

    expect(lesson).toContain("registerXP(xpAmount, 'lesson_answer', userNameRef.current || ''");
    expect(lesson).not.toContain("registerXP(batch.baseTotal, 'lesson_complete'");
    expect(lesson).not.toContain('pendingLessonXpRef.current');

    expect(diagnostic).toContain("registerXP(2, 'diagnostic_test', userNameRef.current || ''");
    expect(diagnostic).not.toContain('if (!userNameRef.current) return;');

    expect(irregularVerbs).toContain("registerXP(POINTS_PER_VERB, 'verb_learned', userName || ''");
    expect(irregularVerbs).not.toMatch(/if\s*\(userName\)\s*\{[\s\S]{0,900}?registerXP\(/);

    expect(prepositions).toContain("registerXP(POINTS_PER_CORRECT, 'preposition_drill_answer', userNameRef.current || ''");
    expect(prepositions).not.toMatch(/if\s*\(userNameRef\.current\)\s*\{[\s\S]{0,700}?registerXP\(POINTS_PER_CORRECT/);

    expect(review).toContain("registerXP(5, 'review_answer', userNameRef.current || ''");
    expect(review).not.toMatch(/if\s*\(userNameRef\.current\)\s*\{[\s\S]{0,700}?registerXP\(5, 'review_answer'/);
  });

  it('keeps SRS review XP event ids scoped to the review session', () => {
    const review = read('app/review.tsx');

    expect(review).toContain('const makeReviewSessionId');
    expect(review).toContain('const reviewSessionIdRef = useRef(makeReviewSessionId())');
    expect(review).toContain('safeReviewEventPart(reviewSessionIdRef.current, 32)');
  });
});
