import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/personal_plan_exercise.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

function transitionBody(): string {
  const start = source.indexOf('const finishTaskAndAdvance');
  const end = source.indexOf('const next = async', start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('Personal Plan transition integrity', () => {
  it('uses an immediate ref lock against double completion/navigation', () => {
    const body = transitionBody();
    expect(source).toContain('const advancingRef = useRef(false);');
    expect(body).toContain('if (advancingRef.current) return false;');
    expect(body).toContain('advancingRef.current = true;');
    expect(source).toContain('if (!item || advancingRef.current) return;');
    expect(source).toContain('if (advancingRef.current || !item || !session');
  });

  it('does not swallow critical completion persistence failures', () => {
    const body = transitionBody();
    expect(body).toContain('await markPersonalPlanTaskCompleted({');
    expect(body).not.toContain('markPersonalPlanTaskCompleted({\n      taskId: planTaskId,\n      planId,\n      planInstanceId,\n      studyTarget,\n      dayIndex,\n    }).catch');
    expect(body).toContain('Не удалось сохранить выполнение задания');
  });

  it('does not translate resolver failure into a false day completion', () => {
    const body = transitionBody();
    expect(body).toContain('nextTask = await resolveNextPlanTask({ completedTaskId: planTaskId, studyTarget });');
    expect(body).not.toContain('resolveNextPlanTask({ completedTaskId: planTaskId, studyTarget }).catch(() => null)');
    expect(body).toContain('Только успешный resolver result `null` означает настоящий финал дня.');
    expect(source).toContain('const done = !advancing && completed;');
  });

  it('starts non-critical completion side effects only once per route task', () => {
    const body = transitionBody();
    expect(source).toContain('const completionSideEffectsStartedRef = useRef(false);');
    expect(body).toContain('if (!completionSideEffectsStartedRef.current)');
    expect(body).toContain('completionSideEffectsStartedRef.current = true;');
    expect(source).toContain('completionSideEffectsStartedRef.current = false;');
  });
});
