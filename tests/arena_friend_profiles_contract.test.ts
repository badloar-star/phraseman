import fs from 'fs';
import path from 'path';

const arenaLobbySource = () =>
  fs.readFileSync(path.join(__dirname, '..', 'app', 'arena_lobby.tsx'), 'utf8');

describe('arena friend profile contract', () => {
  it('warms persisted friend profile cache before rendering arena friend chips', () => {
    const source = arenaLobbySource();

    expect(source).toContain("import { peekProfilesCache, startFriendsTabSwrPrime } from './friends_tab_swr_warm'");
    expect(source).toContain('await startFriendsTabSwrPrime()');
    expect(source.indexOf('await startFriendsTabSwrPrime()')).toBeLessThan(source.indexOf('peekProfilesCache()[f.uid]'));
  });
});
