import { readFileSync } from 'node:fs';
import path from 'node:path';

const read = (relative: string): string => readFileSync(path.resolve(__dirname, '..', relative), 'utf8');

describe('Arena result and settle orchestration wiring', () => {
  it('requests one terminal sync from reducer state instead of trusting public live reward', () => {
    const results = read('app/arena_results.tsx');
    expect(results).toContain('arenaQuickResultTerminalSyncVersion(quickResultState)');
    expect(results).toContain('useArenaTerminalResultSync({');
    expect(results).toContain("type: 'terminal_sync_requested'");
    expect(results).toContain('request: requestResultSync');
    expect(results).toContain('arenaV2SyncMatchDispatch(matchId, version, resultAccount)');
    expect(results).not.toMatch(/\barenaV2SyncMatch\(/);
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
    expect(results).toContain('arenaResultReplayMode(routeMode, match)');
    expect(results).toContain('disabled={!replayMode}');
    // Свойство, а не написание: режим НЕ хардкодится в 'quick'. С 2026-08-23
    // у выражения появился фолбэк на локальный предпросмотр (D-74) — экран
    // открывается до ответа сервера, и без режима нижние кнопки прыгали бы.
    // Фолбэк берёт только явно известные режимы, неизвестный по-прежнему
    // оставляет кнопку выключенной.
    expect(results).toContain("effectiveMode === 'quick' || effectiveMode === 'ranked' ? effectiveMode : null");
    expect(results).not.toMatch(/const replayMode = ['"]quick['"]/);
  });
});
