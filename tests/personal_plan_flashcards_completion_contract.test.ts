import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('flashcards_plan_review swipe completion contract', () => {
  const source = fs.readFileSync(path.join(ROOT, 'app', 'flashcards_swipe.tsx'), 'utf8');

  it('reads plan flashcards params and limits the smart queue to the required card count', () => {
    expect(source).toContain('planFlashcardsTask?: string');
    expect(source).toContain("const planFlashcardsTaskId = routeParamString(params.planFlashcardsTask) === '1' ? routeParamString(params.planTaskId) : ''");
    expect(source).toContain("const planFlashcardsRequiredCards = Math.max(1, Math.min(50, parseInt(routeParamString(params.requiredCards) || '3', 10) || 3))");
    expect(source).toContain('smartSortCards([...byKey.values()], memory, now).slice(0, planFlashcardsTaskId ? planFlashcardsRequiredCards : undefined)');
  });

  it('marks the plan flashcards task complete only after the swipe session is done', () => {
    const doneIndex = source.indexOf('if (!done || !planFlashcardsTaskId || planFlashcardsCompletionTracked.current) return;');
    const markIndex = source.indexOf('markPersonalPlanTaskCompleted({');

    expect(doneIndex).toBeGreaterThan(0);
    expect(markIndex).toBeGreaterThan(doneIndex);
    expect(source).toContain('planFlashcardsCompletionTracked.current = true');
    expect(source).toContain('taskId: planFlashcardsTaskId');
    expect(source).toContain('planInstanceId: routeParamString(params.planInstanceId)');
    expect(source).toContain('dayIndex: planFlashcardsDayIndex');
  });
});
