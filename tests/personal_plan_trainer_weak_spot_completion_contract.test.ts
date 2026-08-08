import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('trainer_weak_spot plan trainer completion contract', () => {
  const navigationSource = read('app/personal_plan_navigation.ts');
  const planRouterSource = read('app/trainer_plan_session.tsx');
  const helperSource = read('app/trainer_plan_task_route.ts');
  const wordsSource = read('app/trainer_words_session.tsx');
  const phrasesSource = read('app/trainer_phrases_session.tsx');

  it('routes plan trainer tasks through the live trainer-plan router, not legacy smart session', () => {
    expect(navigationSource).toContain("pathname: '/trainer_plan_session'");
    expect(planRouterSource).toContain('getTrainerPremiumItemsForPlan(');
    expect(planRouterSource).toContain("if (queue === 'words') return '/trainer_words_session'");
    expect(planRouterSource).not.toContain("return '/trainer_arena_session'");
    expect(planRouterSource).toContain("return '/trainer_phrases_session'");
  });

  it('keeps plan trainer params and marks completion from live session screens', () => {
    expect(helperSource).toContain('planTrainerTask?: string | string[]');
    expect(helperSource).toContain("routeParamString(params.planTrainerTask) === '1'");
    expect(helperSource).toContain('markPersonalPlanTaskCompleted({');

    for (const source of [wordsSource, phrasesSource]) {
      expect(source).toContain('readTrainerPlanTaskContext({');
      expect(source).toContain('getTrainerPremiumItemsForPlanQueue(');
      expect(source).toContain('planTrainerCompletionTracked.current = true');
      expect(source).toContain('markTrainerPlanTaskCompleted(planTrainerContext, studyTarget)');
    }
  });

});
