import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const daily = fs.readFileSync(path.join(ROOT, 'app/daily_tasks.ts'), 'utf8').replace(/\r\n/g, '\n');
const lesson = fs.readFileSync(path.join(ROOT, 'app/lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');
const dailyScreen = fs.readFileSync(path.join(ROOT, 'app/daily_tasks_screen.tsx'), 'utf8').replace(/\r\n/g, '\n');
const home = fs.readFileSync(path.join(ROOT, 'app', '(tabs)', 'home.tsx'), 'utf8').replace(/\r\n/g, '\n');

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
    expect(body).toContain('mergeProgressAtLeast(current, entry.targetRows)');
  });

  it('starts exactly-once delivery in the background and retries the same event id', () => {
    expect(lesson).toContain('const finishDailyTaskEventId = [');
    expect(lesson).toContain('const firstLessonFinishDelivery = startLessonFinishDelivery();');
    expect(lesson).toContain('const finishLessonDeliveryInBackground = async () => {');
    expect(lesson).toContain('await startLessonFinishDelivery();');
    expect(lesson).toContain('void finishLessonDeliveryInBackground();');
    expect(lesson).not.toContain('updateMultipleTaskProgress(\nlessonFinishUpdates,');
  });

  it('navigates directly to the final screen without waiting for delivery', () => {
    const backgroundStart = lesson.indexOf('const finishLessonDeliveryInBackground = async');
    const backgroundEnd = lesson.indexOf("void bumpStatsDaily('lessons_completed'", backgroundStart);
    const backgroundBody = lesson.slice(backgroundStart, backgroundEnd);
    const navigationStart = lesson.indexOf('const navigate = async () => {', backgroundEnd);
    const navigationEnd = lesson.indexOf('} catch (e) {', navigationStart);
    const completionBody = lesson.slice(navigationStart, navigationEnd);

    expect(backgroundBody).toContain('await firstLessonFinishDelivery;');
    expect(backgroundBody).toContain("trackFeatureError('lesson', 'daily_task_delivery_retry'");
    expect(completionBody).toContain('await navigate();');
    expect(completionBody).not.toContain('await firstLessonFinishDelivery');
    expect(completionBody).not.toContain('setShowCycleEndModal');
  });

  it('removes the redundant completion modal and its Continue gate', () => {
    expect(lesson).not.toContain('LessonCycleEndModal');
    expect(lesson).not.toContain('lesson-cycle-end-modal');
    expect(lesson).not.toContain('lesson-cycle-end-continue');
    expect(lesson).not.toContain('cycleEndContinueInFlightRef');
  });

  it('invalidates cached challenge progress after every saved lesson-finish increment', () => {
    expect(daily).toContain("emitAppEvent('daily_task_progress_changed'");
    expect(dailyScreen).toContain("onAppEvent('daily_task_progress_changed'");
    expect(dailyScreen).toContain('invalidateDailyTasksScreenSnapshot(captureAccountGeneration(), getTodayKey(), eventTarget);');
    expect(home).toContain("onAppEvent('daily_task_progress_changed'");
    expect(home).toContain('requestDailyTaskSummaryRefresh();');
  });
});
