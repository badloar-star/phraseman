import fs from 'fs';
import path from 'path';

describe('daily tasks claim optimistic UI contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'daily_tasks_screen.tsx'), 'utf8');

  it('marks a task reward claimed in UI before the async reward pipeline resolves', () => {
    const start = source.indexOf('const handleClaim = async');
    const claimCall = source.indexOf('await claimTaskWithReward', start);
    const claimEnd = source.indexOf('pendingClaimIdsRef.current.delete(taskId)', claimCall);
    const beforeClaimCall = source.slice(start, claimCall);
    const claimOptions = source.slice(claimCall, claimEnd);

    expect(start).toBeGreaterThan(0);
    expect(claimCall).toBeGreaterThan(start);
    expect(claimEnd).toBeGreaterThan(claimCall);
    expect(beforeClaimCall).toContain('pendingClaimIdsRef.current.add(taskId)');
    expect(beforeClaimCall).toContain('setProgress((prev) => markTaskClaimedForUi(prev, taskId))');
    expect(beforeClaimCall).toContain('showClaimedXpBadge(xpBase)');
    expect(beforeClaimCall).not.toContain('await getTodayTasksSafe');
    expect(claimOptions).toContain('onReserved: () =>');
    expect(claimOptions).toContain("emitAppEvent('action_toast'");
  });

  it('marks the all-tasks bonus claimed before waiting on cloud/local shard sync', () => {
    const start = source.indexOf('const handleClaimTrioShards = useCallback');
    const claimCall = source.indexOf('await claimDailyTasksAllShardsRewardDetailed', start);
    const beforeClaimCall = source.slice(start, claimCall);

    expect(start).toBeGreaterThan(0);
    expect(claimCall).toBeGreaterThan(start);
    expect(beforeClaimCall).toContain('setTrioClaimBusy(true)');
    expect(beforeClaimCall).toContain('setTrioShardsClaimed(true)');
    expect(source).toContain('const trioClaimButtonEnabled = allTasksObjectivesDone && !trioShardsClaimed && !trioClaimBusy');
  });

  it('does not require a second tap or show the old repeat-tap copy', () => {
    expect(source).toContain('void handleTaskNav(task);');
    expect(source).not.toContain('Нажми ещё раз');
    expect(source).not.toContain('Toca otra vez');
    expect(source).not.toContain('taskConfirmTrack');
  });
});
