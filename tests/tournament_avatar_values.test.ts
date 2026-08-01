import { tournamentAvatarValue } from '../components/tournament/tournament_avatars';

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
});
