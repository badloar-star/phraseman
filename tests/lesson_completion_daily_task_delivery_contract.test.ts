import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const daily = fs.readFileSync(path.join(ROOT, 'app/daily_tasks.ts'), 'utf8').replace(/\r\n/g, '\n');
const lesson = fs.readFileSync(path.join(ROOT, 'app/lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('lesson completion Daily Challenge delivery', () => {
  it('prepares an idempotent target journal before writing progress', () => {
    const start = daily.indexOf('export const deliverDailyTaskProgressEvent');
    const end = daily.indexOf('// ── Главная функция', start);
    const body = daily.slice(start, end);
    const prepare = body.indexOf("'daily_task_progress_event_not_prepared'");
    const progress = body.indexOf('await saveTodayProgressStrict(current');
    const finalize = body.indexOf("'daily_task_progress_event_not_finalized'");

    expect(prepare).toBeGreaterThanOrEqual(0);
    expect(progress).toBeGreaterThan(prepare);
    expect(finalize).toBeGreaterThan(progress);
    expect(body).toContain('deliveryTargetRowsForActiveTasks(entry, activeTaskIds)');
    expect(body).toContain('completedTaskIds.filter(');
  });

  it('starts delivery while the completion modal is visible and retries the same event on Continue', () => {
    expect(lesson).toContain('const finishDailyTaskEventId = [');
    expect(lesson).toContain('let lessonFinishDeliveryPromise = startLessonFinishDelivery();');
    expect(lesson).toContain('lessonFinishDeliveryPromise = startLessonFinishDelivery();');
    expect(lesson).toContain('cycleEndCallbackRef.current = finalizeLessonCompletion;');
    expect(lesson).not.toContain('updateMultipleTaskProgress(\nlessonFinishUpdates,');
  });

  it('does not close or navigate until delivery succeeds', () => {
    const start = lesson.indexOf('const finalizeLessonCompletion = async');
    const end = lesson.indexOf('const hasErrors =', start);
    const body = lesson.slice(start, end);
    const awaitDelivery = body.indexOf('await lessonFinishDeliveryPromise;');
    const close = body.indexOf('setShowCycleEndModal(false);');
    const navigate = body.indexOf('navigate();');

    expect(awaitDelivery).toBeGreaterThanOrEqual(0);
    expect(close).toBeGreaterThan(awaitDelivery);
    expect(navigate).toBeGreaterThan(close);
    expect(body).toContain('Нажми «Продолжить» ещё раз');
  });

  it('guards double taps on the modal Continue button synchronously', () => {
    expect(lesson).toContain('const cycleEndContinueInFlightRef = useRef(false);');
    expect(lesson).toContain('if (!callback || cycleEndContinueInFlightRef.current) return;');
    expect(lesson).toContain('cycleEndContinueInFlightRef.current = true;');
  });
});
