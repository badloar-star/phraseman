import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan quiz screen contract', () => {
  const quizSource = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'quizzes.tsx'), 'utf8');

  it('renders a user-facing instruction for plan quizzes', () => {
    expect(quizSource).toContain('getPersonalPlanQuizTaskCopy');
    expect(quizSource).toContain('planQuizTaskCopy');
    expect(quizSource).toContain('testID="personal-plan-quiz-instruction"');
  });

  it('starts plan quizzes from route params without falling into regular quiz navigation', () => {
    expect(quizSource).toContain('planQuizLevelParam');
    expect(quizSource).toContain('const planQuizLevel');
    expect(quizSource).toContain('const planQuizStartSelection');
    expect(quizSource).toContain('setSelection(planQuizStartSelection)');
    expect(quizSource).toContain("key={`${gameKey}:${selection}:${planQuizId ?? 'base'}`}");
    expect(quizSource).toContain('planQuizId={planQuizId}');
    expect(quizSource).toContain('planTaskId={planQuizTaskId}');
    expect(quizSource).toContain('planInstanceId={planQuizInstanceId}');
  });

  it('records plan-aware mistake context only through the plan quiz adapter', () => {
    expect(quizSource).toContain('buildPersonalPlanQuizMistakeMeta(tokenMeta');
    expect(quizSource).toContain('planQuizId,');
    expect(quizSource).toContain('coverage: planQuizCoverage');
    expect(quizSource).toContain('logMistake(');
  });

  it('returns plan quiz users to the production personal plan route', () => {
    expect(quizSource).toContain("safeRouterBack(router, (planQuizId ? '/personal_plan' : '/(tabs)/home') as any)");

    const planQuizBackIndex = quizSource.indexOf('planQuizId ?');
    expect(planQuizBackIndex).toBeGreaterThan(0);
    expect(quizSource.slice(planQuizBackIndex, planQuizBackIndex + 180)).not.toContain('/personal_plan_dev');
  });
});
