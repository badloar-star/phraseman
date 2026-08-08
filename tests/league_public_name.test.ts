import { leaguePublicName, looksLikePublicEmail } from '../app/league_public_name';

describe('league public names', () => {
  it('keeps a normal public name unchanged', () => {
    expect(leaguePublicName('Анна', 'uid-42')).toBe('Анна');
  });

  it('replaces email-like and empty names with the same stable safe fallback', () => {
    const fromEmail = leaguePublicName(' person@example.com ', 'stable-uid');
    const fromEmpty = leaguePublicName('', 'stable-uid');

    expect(fromEmail).toMatch(/^Игрок \d{4}$/);
    expect(fromEmail).toBe(fromEmpty);
    expect(fromEmail).not.toContain('@');
  });

  it('recognizes incomplete email-like identifiers before they reach UI', () => {
    expect(looksLikePublicEmail('first@second')).toBe(true);
    expect(looksLikePublicEmail('first @ second')).toBe(true);
    expect(looksLikePublicEmail('Анна')).toBe(false);
  });

  it('derives different deterministic fallbacks from different stable identities', () => {
    const first = leaguePublicName('', 'uid-one');
    const second = leaguePublicName('', 'uid-two');

    expect(leaguePublicName('', 'uid-one')).toBe(first);
    expect(second).not.toBe(first);
  });
});
