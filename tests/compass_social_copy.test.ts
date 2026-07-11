import {
  safeSocialName,
  socialLineForKind,
  socialMoreSuffix,
  type CompassSocialKind,
} from '../app/compass/compass_social_copy';

const LANGS = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const KINDS: CompassSocialKind[] = ['friend_request', 'friend_accepted', 'friend_added', 'like'];

describe('compass_social_copy — соц-сводка «Кстати…»', () => {
  it('строка события содержит имя и непуста на всех языках для всех типов', () => {
    for (const kind of KINDS) {
      for (const lang of LANGS) {
        const line = socialLineForKind(kind, 'Аня', lang);
        expect(line.trim().length).toBeGreaterThan(0);
        expect(line).toContain('Аня');
      }
    }
  });

  it('русские строки НЕ содержат запрещённых слов Библии', () => {
    // По канону Phraseman: без «урок/ошибка/статистика/цена/купить/подписка».
    const forbidden = [/\bурок/i, /\bошибк/i, /\bстатистик/i, /\bцена\b/i, /\bкупить\b/i, /\bподписк/i];
    for (const kind of KINDS) {
      const ru = socialLineForKind(kind, 'Имя', 'ru');
      for (const pat of forbidden) {
        expect(ru).not.toMatch(pat);
      }
    }
  });

  it('safeSocialName: пустое → дружелюбный fallback, длинное → обрезка с …', () => {
    expect(safeSocialName('', 'ru')).toBe('друг');
    expect(safeSocialName('   ', 'es')).toBe('un amigo');
    expect(safeSocialName('  Маша  ', 'ru')).toBe('Маша');
    const long = 'A'.repeat(40);
    const out = safeSocialName(long, 'ru');
    expect(out.length).toBeLessThanOrEqual(24);
    expect(out.endsWith('…')).toBe(true);
  });

  it('socialMoreSuffix: 0 → пусто, N>0 → локализованный суффикс с числом', () => {
    expect(socialMoreSuffix(0, 'ru')).toBe('');
    expect(socialMoreSuffix(-3, 'ru')).toBe('');
    expect(socialMoreSuffix(2, 'ru')).toContain('2');
    expect(socialMoreSuffix(5, 'uk')).toContain('5');
  });
});
