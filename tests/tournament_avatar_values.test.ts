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

  test('caps bot level avatars at 50 while real users keep theirs (owner 2026-08-03)', () => {
    // Комнаты, созданные до деплоя functions, ещё несут 51–60: клиент
    // детерминированно заворачивает их в 1..50, у всех зрителей одинаково.
    expect(tournamentAvatarValue({ id: 'bot-old', isBot: true, avatar: '58' })).toBe('8');
    expect(tournamentAvatarValue({ id: 'bot-edge', isBot: true, avatar: '51' })).toBe('1');
    expect(tournamentAvatarValue({ id: 'bot-max', isBot: true, avatar: '50' })).toBe('50');
    // Настоящий игрок 58 уровня имеет право на свой аватар — кап только для ботов.
    expect(tournamentAvatarValue({ id: 'human', isBot: false, avatar: '58' })).toBe('58');
    // Легаси-фолбэк по хэшу тоже не выдаёт уровни выше 50.
    for (let i = 0; i < 200; i += 1) {
      const value = tournamentAvatarValue({ id: `legacy-${i}`, isBot: true, avatar: '🦊' });
      if (/^\d+$/.test(value)) expect(Number(value)).toBeLessThanOrEqual(50);
    }
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
    // Лобби: 1 — только SeatCard; профиль-шторка заменена штатной
    // PlayerProfileModal (владелец 2026-08-03), она сама ведёт уровень от XP.
    expect(lobby.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(1);
    expect(table.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(1);
    expect(results.match(/level=\{tournamentAvatarLevel\(/g)).toHaveLength(2);
  });
});
