import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.resolve(__dirname, '../app/arena_lobby.tsx'), 'utf8');

describe('Arena lobby runtime visibility', () => {
  it('combines screen focus, foreground state, and tab ownership', () => {
    expect(source).toContain('const lobbyRuntimeActive = useRuntimeActive(arenaTabVisible)');
    expect(source).toContain('setLobbyActive(lobbyRuntimeActive)');
    expect(source).not.toContain("AppState.addEventListener('change'");
  });

  it('uses the shared visible wall clock instead of a local search UI interval', () => {
    expect(source).toContain('useVisibleWallClock(lobbyRuntimeActive && searchVisible)');
    expect(source).not.toContain('setSearchUiTick');
  });
});
