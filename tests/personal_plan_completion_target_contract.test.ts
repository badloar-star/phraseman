import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('personal plan completion target-aware stats contract', () => {
  it('bumps the completed-plan-task daily metric in the same study target bucket', () => {
    const source = read('app/personal_plan_progress.ts');

    expect(source).toContain("import type { RuntimeStudyTarget } from './target_storage_keys';");
    expect(source).toContain('studyTarget?: RuntimeStudyTarget');
    expect(source).toContain("bumpStatsDaily('plan_tasks_completed', 1, input.studyTarget)");
  });

  it('passes studyTarget through every production personal-plan completion entry point', () => {
    const expectations: [string, string][] = [
      ['app/personal_plan_exercise.tsx', 'studyTarget,'],
      ['app/lesson1.tsx', 'studyTarget: studyTargetRef.current'],
      ['app/flashcards_swipe.tsx', 'studyTarget,'],
      ['app/review.tsx', 'studyTarget,'],
      ['app/(tabs)/quizzes.tsx', 'studyTarget,'],
      ['app/trainer_plan_task_route.ts', 'studyTarget,'],
      ['app/trainer_words_session.tsx', 'markTrainerPlanTaskCompleted(planTrainerContext, studyTarget)'],
      ['app/trainer_phrases_session.tsx', 'markTrainerPlanTaskCompleted(planTrainerContext, studyTarget)'],
      ['app/trainer_arena_session.tsx', 'markTrainerPlanTaskCompleted(planTrainerContext, studyTarget)'],
    ];

    for (const [relativePath, expectedSnippet] of expectations) {
      expect(read(relativePath)).toContain(expectedSnippet);
    }
  });
});
