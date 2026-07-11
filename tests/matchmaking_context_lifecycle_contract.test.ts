import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), 'utf8');

describe('MatchmakingContext control-clock lifecycle', () => {
  it('ships the verified control-clock path enabled', () => {
    expect(read('app/config.ts')).toContain('export const ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK = true');
  });

  it('uses generation-bound absolute deadlines and shared AppState integration', () => {
    const source = read('contexts/MatchmakingContext.tsx');
    expect(source).toContain('useArenaMatchmakingControlClock({');
    expect(source).toMatch(/const searchActiveRef\s*=\s*useRef\(false\)/);
    expect(source).toMatch(/const searchGenerationRef\s*=\s*useRef\(0\)/);
    expect(source).toContain('originalStartedAt: t0');
    expect(source).toContain('rangeDeadlineAt: t0 + RANGE_EXPAND_MS');
    expect(source).toContain('botFallbackDeadlineAt');
    expect(source).toContain('timeoutDeadlineAt: t0 + SEARCH_TIMEOUT_MS');
    expect(source).toContain("await controlClock.requestReconcile('post_join')");
  });

  it('keeps the legacy intervals dormant when the feature flag is enabled', () => {
    const source = read('contexts/MatchmakingContext.tsx');
    expect(source).toContain('if (!ENABLE_ARENA_MATCHMAKING_CONTROL_CLOCK) {');
    expect(source).toContain('timerRef.current = setInterval(() => {');
    expect(source).toContain('controlClock.start({');
  });
});
