import {
  PROFILE_CARD_BIO_MAX_CHARS,
  PROFILE_CARD_BIO_MIN_INTERVAL_MS,
  decideProfileCardBioWrite,
  validateProfileCardBio,
} from './profile_card_bio_core';
import { containsProfanity } from './profile_card_profanity';
import { buildAuthoritativePublicProfileProjection } from './public_profile_projection';

const PRO = { profileCardPro: true };
const NOW = 1_800_000_000_000;

describe('profile card bio: validation', () => {
  it('trims edges and collapses inner whitespace', () => {
    expect(validateProfileCardBio('   Учу   английский  ')).toEqual({ ok: true, text: 'Учу английский' });
  });

  it('accepts exactly 80 characters and rejects 81', () => {
    expect(validateProfileCardBio('a'.repeat(PROFILE_CARD_BIO_MAX_CHARS))).toEqual({
      ok: true, text: 'a'.repeat(80),
    });
    expect(validateProfileCardBio('a'.repeat(PROFILE_CARD_BIO_MAX_CHARS + 1))).toEqual({ ok: false, reason: 'too_long' });
  });

  it('counts emoji as one character, not two UTF-16 units', () => {
    const emoji = '🙂'.repeat(80);
    expect(emoji.length).toBe(160);
    expect(validateProfileCardBio(emoji).ok).toBe(true);
  });

  it('checks the length after trimming', () => {
    expect(validateProfileCardBio(`  ${'a'.repeat(80)}   `).ok).toBe(true);
  });

  it('rejects line breaks and control or invisible characters', () => {
    expect(validateProfileCardBio('строка\nвторая')).toEqual({ ok: false, reason: 'line_break' });
    expect(validateProfileCardBio('строка\r\nвторая')).toEqual({ ok: false, reason: 'line_break' });
    expect(validateProfileCardBio(`a${String.fromCharCode(0x2028)}b`)).toEqual({ ok: false, reason: 'line_break' });
    expect(validateProfileCardBio(`a${String.fromCharCode(0x0007)}b`)).toEqual({ ok: false, reason: 'control_char' });
    expect(validateProfileCardBio(`a${String.fromCharCode(0x200b)}b`)).toEqual({ ok: false, reason: 'control_char' });
    expect(validateProfileCardBio(`a${String.fromCharCode(0x202e)}b`)).toEqual({ ok: false, reason: 'control_char' });
  });

  it('rejects non-strings', () => {
    expect(validateProfileCardBio(undefined)).toEqual({ ok: false, reason: 'not_string' });
    expect(validateProfileCardBio(42)).toEqual({ ok: false, reason: 'not_string' });
  });

  it('allows an empty text (clears the bio)', () => {
    expect(validateProfileCardBio('   ')).toEqual({ ok: true, text: '' });
  });
});

describe('profile card bio: profanity filter', () => {
  it.each([
    'иди на хуй',
    'ты пиздец',
    'заебал уже',
    'блять',
    'Х.У.Й',
    'xyй', // латинские двойники
    'пи3да',
    'ты сука',
    'fuck you',
    'f.u.c.k',
    'bullshit',
    'motherfucker',
    'курва',
    'їбати',
  ])('blocks %s', (text) => {
    expect(containsProfanity(text)).toBe(true);
    expect(validateProfileCardBio(text)).toEqual({ ok: false, reason: 'profanity' });
  });

  it.each([
    'Учу английский к поездке в Лондон. Пишите — потренируемся вместе!',
    'Хлебать суп',
    'мандарин и небо',
    'сукно и сучок',
    'Мех уйти',
    'Скупой рыцарь',
    'Hello, I love learning English',
    'Shiitake and Dickens',
    'Застрахуйся от ошибок', // «страх» внутри слова — не мат
    'Потребую победу',
  ])('does not block harmless %s', (text) => {
    expect(containsProfanity(text)).toBe(false);
  });
});

describe('profile card bio: write decision', () => {
  it('refuses anyone who is not a Pro owner, before validating the text', () => {
    expect(decideProfileCardBioWrite(null, 'привет', NOW)).toEqual({ kind: 'reject', reason: 'pro_required' });
    expect(decideProfileCardBioWrite({ profileCardPro: false }, 'привет', NOW))
      .toEqual({ kind: 'reject', reason: 'pro_required' });
    expect(decideProfileCardBioWrite({ profileCardPro: 'true' }, 'хуй', NOW))
      .toEqual({ kind: 'reject', reason: 'pro_required' });
  });

  it('writes a valid text for a Pro owner', () => {
    expect(decideProfileCardBioWrite(PRO, ' Привет! ', NOW)).toEqual({ kind: 'write', text: 'Привет!' });
  });

  it('passes validation failures through', () => {
    expect(decideProfileCardBioWrite(PRO, 'a'.repeat(81), NOW)).toEqual({ kind: 'reject', reason: 'too_long' });
    expect(decideProfileCardBioWrite(PRO, 'блять', NOW)).toEqual({ kind: 'reject', reason: 'profanity' });
  });

  it('rate-limits changes to once a minute and reports the wait', () => {
    const profile = { ...PRO, profileCardBio: 'старый', profileCardBioUpdatedAtMs: NOW - 20_000 };
    expect(decideProfileCardBioWrite(profile, 'новый', NOW)).toEqual({
      kind: 'reject', reason: 'rate_limited', retryAfterMs: PROFILE_CARD_BIO_MIN_INTERVAL_MS - 20_000,
    });
    expect(decideProfileCardBioWrite({ ...profile, profileCardBioUpdatedAtMs: NOW - 60_000 }, 'новый', NOW))
      .toEqual({ kind: 'write', text: 'новый' });
  });

  it('does not spend the rate limit on the same text', () => {
    const profile = { ...PRO, profileCardBio: 'тот же', profileCardBioUpdatedAtMs: NOW - 1_000 };
    expect(decideProfileCardBioWrite(profile, ' тот  же ', NOW)).toEqual({ kind: 'unchanged', text: 'тот же' });
  });
});

describe('public profile projection never accepts the bio from the client', () => {
  it('ignores profileCardBio in the projection input and projects Pro/style only', () => {
    const input = {
      name: 'Лидия',
      profileCardPro: true,
      profileCardStyle: 'obs',
      profileCardBio: 'хуй',
    } as Record<string, unknown>;
    const projection = buildAuthoritativePublicProfileProjection('stable-a', {}, input, NOW);
    expect(projection).not.toHaveProperty('profileCardBio');
    expect(projection.profileCardPro).toBe(true);
    expect(projection.profileCardStyle).toBe('obs');
  });

  it('drops the style for non-Pro and unknown styles', () => {
    expect(buildAuthoritativePublicProfileProjection('s', {}, { profileCardStyle: 'obs' }, NOW))
      .not.toHaveProperty('profileCardStyle');
    expect(buildAuthoritativePublicProfileProjection('s', {}, { profileCardPro: true, profileCardStyle: 'gold' }, NOW))
      .not.toHaveProperty('profileCardStyle');
    expect(buildAuthoritativePublicProfileProjection('s', {}, { profileCardPro: 'yes' }, NOW).profileCardPro).toBe(false);
  });
});
