import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal_practice_seeded review completion contract', () => {
  const reviewSource = fs.readFileSync(path.join(ROOT, 'app', 'review.tsx'), 'utf8');

  it('reads plan practice params without switching the session away from real due review', () => {
    expect(reviewSource).toContain('planPracticeTask?: string');
    expect(reviewSource).toContain('trainingId?: string');
    expect(reviewSource).toContain('requiredPhrases?: string');
    expect(reviewSource).toContain('requiredWords?: string');
    expect(reviewSource).toContain("const planPracticeTaskId = params.planPracticeTask === '1' ? params.planTaskId : undefined");
    expect(reviewSource).toContain('const planPracticeRequiredPhrases');
    expect(reviewSource).toContain('resolvePersonalPracticeSeededDuePhrases({');
    expect(reviewSource).toContain('requiredPhraseCount: planPracticeRequiredPhrases');
  });

  it('marks the plan practice task complete only after the review session is done', () => {
    const doneEffectIndex = reviewSource.indexOf('if (!done) return;');
    const markIndex = reviewSource.indexOf('markPersonalPlanTaskCompleted({');

    expect(doneEffectIndex).toBeGreaterThan(0);
    expect(markIndex).toBeGreaterThan(doneEffectIndex);
    expect(reviewSource).toContain('planPracticeCompletionTracked.current = true');
    expect(reviewSource).toContain('taskId: planPracticeTaskId');
    expect(reviewSource).toContain('planInstanceId: params.planInstanceId');
    expect(reviewSource).toContain('dayIndex: planPracticeDayIndex');
  });
});
