import {
  communityPackTtsLanguage,
  isCommunityPackLanguage,
  normalizeCommunityPackLanguage,
} from './community_pack_language';

describe('community pack language (D127)', () => {
  it('keeps an explicit "none" and the four study languages', () => {
    expect(normalizeCommunityPackLanguage('none')).toBe('none');
    for (const code of ['en', 'fr', 'de', 'es']) expect(normalizeCommunityPackLanguage(code)).toBe(code);
    expect(isCommunityPackLanguage('none')).toBe(true);
  });

  it('treats legacy packs without the field as English', () => {
    expect(normalizeCommunityPackLanguage(undefined)).toBe('en');
    expect(normalizeCommunityPackLanguage(null)).toBe('en');
    expect(normalizeCommunityPackLanguage('')).toBe('en');
    expect(normalizeCommunityPackLanguage('xx')).toBe('en');
    expect(isCommunityPackLanguage(undefined)).toBe(false);
  });

  it('TTS skips packs without a language and voices the rest', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    expect(communityPackTtsLanguage('none', { packId: 'p1' })).toBeNull();
    expect(log.mock.calls.some(([line]) => String(line).includes('[PACK-LANG] tts:skip pack=p1'))).toBe(true);
    expect(communityPackTtsLanguage('fr')).toBe('fr');
    expect(communityPackTtsLanguage(undefined)).toBe('en');
    log.mockRestore();
  });
});
