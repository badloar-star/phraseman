import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('trainer_weak_spot smart trainer completion contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'trainer_smart_session.tsx'), 'utf8');

  it('reads plan trainer params and filters the session by current plan instance', () => {
    expect(source).toContain('planTrainerTask?: string');
    expect(source).toContain("const planTrainerTaskId = params.planTrainerTask === '1' ? params.planTaskId : undefined");
    expect(source).toContain('const planTrainerRequiredItems = Math.max(1, Math.min(12, parseInt(params.requiredItems ?? \'3\', 10) || 3))');
    expect(source).toContain('getTrainerPremiumItemsForPlan(params.planInstanceId, mode, planTrainerRequiredItems)');
  });

  it('marks the plan trainer task complete only after the trainer session is done', () => {
    const doneIndex = source.indexOf('if (!done || !planTrainerTaskId || planTrainerCompletionTracked.current) return;');
    const markIndex = source.indexOf('markPersonalPlanTaskCompleted({');

    expect(doneIndex).toBeGreaterThan(0);
    expect(markIndex).toBeGreaterThan(doneIndex);
    expect(source).toContain('planTrainerCompletionTracked.current = true');
    expect(source).toContain('taskId: planTrainerTaskId');
    expect(source).toContain('planInstanceId: params.planInstanceId');
    expect(source).toContain('dayIndex: planTrainerDayIndex');
  });
});
