import fs from 'fs';
import path from 'path';

describe('foreground root resume contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

  // зачем (PM-220): три фоновые задачи корня (сброс очереди повышения уровня, снимок виджета, бонус лиги)
  // удалены вместе с модалкой повышения, виджетом и Лигами (D83, 1b0ee9d52). Правило то же: корень не
  // выполняет тяжёлого внутри активного события. Охраняем отсутствие возврата прямых вызовов.
  it('does not run retired root housekeeping inside the active event', () => {
    expect(source).not.toContain('root_level_up_queue_flush');
    expect(source).not.toContain('root_widget_snapshot_refresh');
    expect(source).not.toContain('root_league_bonus_availability');
    expect(source).not.toMatch(/flushLevelUpQueue|refreshWidgetSnapshot|leagueBonusAvailability/);
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
