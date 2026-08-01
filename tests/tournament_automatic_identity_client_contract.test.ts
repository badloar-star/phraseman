import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tournament automatic identity client contract', () => {
  const source = readFileSync(resolve(__dirname, '../app/tournament_client.ts'), 'utf8');

  it('bootstraps the existing automatic account before every tournament callable', () => {
    const start = source.indexOf('async function callFunction');
    const end = source.indexOf('\n}', start);
    const block = source.slice(start, end);

    expect(source).toContain("import { ensureAnonUser } from './cloud_sync';");
    expect(block).toContain('await ensureAnonUser().catch(() => null);');
    expect(block.indexOf('await ensureAnonUser()')).toBeLessThan(block.indexOf('httpsCallable('));
    expect(source).not.toContain('signInWithProvider');
  });

  it('sends the current local nickname, avatar, and aura with both join routes', () => {
    expect(source).toContain("import AsyncStorage from '@react-native-async-storage/async-storage';");
    expect(source).toContain("AsyncStorage.multiGet(['user_name', 'user_avatar', 'user_avatar_aura'])");
    expect(source).toMatch(
      /'tournamentJoin',\s*\{\s*roomId,\s*profile:\s*await loadTournamentProfileHint\(\)\s*\},/,
    );
    expect(source).toMatch(
      /'tournamentStartNow',\s*\{\s*profile:\s*await loadTournamentProfileHint\(\)\s*\},/,
    );
  });
});
