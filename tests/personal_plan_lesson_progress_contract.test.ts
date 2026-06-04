import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan lesson progress contract', () => {
  const lessonSource = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');

  it('counts plan lesson phrases only after a correct answer', () => {
    expect(lessonSource).toContain('const currentPhraseCountsForPlan =');
    expect(lessonSource).toContain('if (isRight && isPlanLessonTask && planRequiredPhrases > 0 && currentPhraseCountsForPlan)');

    const completionIndex = lessonSource.indexOf('markPersonalPlanTaskCompleted({');
    const guardIndex = lessonSource.lastIndexOf('if (isRight && isPlanLessonTask && planRequiredPhrases > 0 && currentPhraseCountsForPlan)', completionIndex);
    const wrongBranchIndex = lessonSource.lastIndexOf('} else {', completionIndex);

    expect(completionIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(wrongBranchIndex);
  });
});
