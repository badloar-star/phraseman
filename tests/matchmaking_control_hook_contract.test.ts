import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.resolve(__dirname, '../hooks/use_arena_matchmaking_control_clock.ts'),
  'utf8',
);

describe('Arena matchmaking control hook contract', () => {
  it('uses the shared AppState store and keeps callback dependencies fresh', () => {
    expect(source).toContain('runtimeAppStateStore.subscribe');
    expect(source).toContain('runtimeAppStateStore.getSnapshot()');
    expect(source).toContain('depsRef.current = deps');
    expect(source).not.toContain('AppState.addEventListener');
  });
});
