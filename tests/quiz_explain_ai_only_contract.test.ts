import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('thematic quiz AI-only explanation contract', () => {
  it('keeps thematic quiz explanations AI-only without local pack fallback', () => {
    const hookSource = read('app/use_quiz_explain.ts');
    const quizSource = read('app/(tabs)/quizzes.tsx');

    expect(hookSource).not.toContain('LOCAL_FALLBACK_DELAY_MS');
    expect(hookSource).not.toContain('useLocalFallback');
    expect(quizSource).not.toContain('quizExplain.useLocalFallback');
    expect(quizSource).not.toContain('staticExplanation');

    expect(quizSource).toContain('(isThematicQuiz || current.explanations)');
    expect(quizSource).toContain('const loading = quizExplain.state !==');
    expect(quizSource).toContain('{aiExplanation}');
  });

  it('keeps static explanations isolated to easy medium hard quizzes', () => {
    const quizSource = read('app/(tabs)/quizzes.tsx');

    expect(quizSource).toContain('if (isThematicQuiz) {');
    expect(quizSource).toContain('if (!current.explanations) return null;');
    expect(quizSource).toContain('const explanationIdx = quizExplanationIndexForAnswer(current, chosen, typedOk)');
    expect(quizSource).toContain('const explanation = explanationsArr[explanationIdx]');
  });

  it('keeps retrying AI loading for pending or transient callable failures', () => {
    const hookSource = read('app/use_quiz_explain.ts');

    expect(hookSource).toContain('const PENDING_RETRY_DELAY_MS');
    expect(hookSource).toContain('const TRANSIENT_RETRY_DELAY_MS');
    expect(hookSource).toContain("if (res.status === 'pending') {");
    expect(hookSource).toContain('scheduleRetry(PENDING_RETRY_DELAY_MS)');
    expect(hookSource).toContain('scheduleRetry(TRANSIENT_RETRY_DELAY_MS)');
  });

  it('sends the full option set so shuffled thematic choices reuse the same AI cache', () => {
    const quizSource = read('app/(tabs)/quizzes.tsx');

    expect(quizSource).toContain('[...current.choices].sort().join');
    expect(quizSource).toContain('current.choices.filter((_, i) => !isQuizChoiceCorrect(i, current.correct))');
    expect(quizSource).toContain('wrongOptions: quizWrongOptions');
  });
});
