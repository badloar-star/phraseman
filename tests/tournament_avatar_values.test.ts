import fs from 'fs';
import path from 'path';
import * as tournamentAvatars from '../components/tournament/tournament_avatars';

const { tournamentAvatarValue } = tournamentAvatars;
const root = path.join(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('tournament bot avatar values', () => {
  test('preserves server-authored level and shop avatars for bots', () => {
    expect(tournamentAvatarValue({ id: 'bot-level', isBot: true, avatar: '42' })).toBe('42');
    expect(tournamentAvatarValue({
      id: 'bot-shop',
      isBot: true,
      avatar: 'custom:custom-gen-41:aurora:black',
    })).toBe('custom:custom-gen-41:aurora:black');
  });

  test('keeps deterministic app-avatar fallback for legacy emoji bots', () => {
    const first = tournamentAvatarValue({ id: 'legacy-bot', isBot: true, avatar: '🦊' });
    const second = tournamentAvatarValue({ id: 'legacy-bot', isBot: true, avatar: '🦊' });
    expect(first).toBe(second);
    expect(first).toMatch(/^(?:\d+|custom:)/);
  });

  test('uses the authored level avatar as the first-frame loading fallback on every tournament surface', () => {
    const tournamentAvatarLevel = (
      tournamentAvatars as typeof tournamentAvatars & {
        tournamentAvatarLevel?: (avatar: string) => number | undefined;
      }
    ).tournamentAvatarLevel;

    expect(tournamentAvatarLevel?.('42')).toBe(42);
    expect(tournamentAvatarLevel?.('custom:custom-gen-41:aurora:black')).toBeUndefined();

    const lobby = read('app/tournament_lobby.tsx');
    const table = read('app/tournament_table.tsx');
    const results = read('app/tournament_results.tsx');
    expect(lobby.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(2);
    expect(table.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(1);
    expect(results.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(2);
  });
});
