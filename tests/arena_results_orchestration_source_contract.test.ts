import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relative: string): string => readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

describe('Arena result and settle orchestration wiring', () => {
  it('requests one terminal sync from reducer state instead of trusting public live reward', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain('arenaQuickResultTerminalSyncVersion(quickResultState)');
    expect(results).toContain('useArenaTerminalResultSync({');
    expect(results).toContain("type: 'terminal_sync_requested'");
    expect(results).toContain('request: arenaV2SyncMatch');
  });

  it('schedules settle outside screen lifetime and carries route mode to results', () => {
    const match = read('app/arena_match.tsx');
    expect(match).toContain('arenaScheduleMatchSettleProbe({');
    expect(match).not.toContain('void arenaV2MatchSettle(matchId)');
    expect(match).not.toMatch(/setTimeout\(\(\) => \{[\s\S]{0,220}arenaV2MatchSettle/);
    expect(match).toContain("mode: plan.mode");
  });

  it('disables unresolved replay rather than hardcoding quick', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain('const replayMode = arenaResultReplayMode(routeMode, match);');
    expect(results).toContain('disabled={!replayMode}');
  });
});
