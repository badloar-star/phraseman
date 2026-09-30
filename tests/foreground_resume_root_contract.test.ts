import fs from 'fs';
import path from 'path';

describe('foreground root resume contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

  it('queues root housekeeping instead of running it inside the active event', () => {
    expect(source).toContain("scheduleCoalescedForegroundTask('root_level_up_queue_flush'");
    expect(source).toContain("scheduleCoalescedForegroundTask('root_widget_snapshot_refresh'");
    expect(source).toContain("scheduleCoalescedForegroundTask('root_league_bonus_availability'");
  });

  it('drains the account-bound Spire report outbox on auth-ready startup and foreground without a timer', () => {
    expect(source).toContain("import('../modules/spire/task_report_client')");
    expect(source).toContain('retryPendingSpireTaskReports(readiness.stableUid)');
    expect(source).toContain('subscribeFirebaseAuthUid(setSpireAuthenticatedUid)');
    expect(source).toContain('[accountGeneration.phase, accountGeneration.stableId, appIsActive, spireAuthenticatedUid]');
    expect(source).toContain('canDrainSpireTaskReportOutbox(readiness)');
    const spireEffect = source.slice(
      source.indexOf("import('../modules/spire/task_report_client')") - 220,
      source.indexOf("import('../modules/spire/task_report_client')") + 400,
    );
    expect(spireEffect).not.toContain('setTimeout');
    expect(spireEffect).not.toContain('setInterval');
  });
});
