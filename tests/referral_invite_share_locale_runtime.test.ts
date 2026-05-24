import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'app', 'referral_invite_share.ts'), 'utf8');

describe('referral invite share planned locale runtime copy', () => {
  it('does not route planned invite text through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
    expect(source).not.toContain('fallback');
    expect(source).not.toContain('copy[lang] ?? copy.ru');
  });

  it('keeps invite body copy explicit for planned locales', () => {
    expect(source).toContain('BODY_BY_LANG');
    for (const marker of ["'pt-BR': BODY_PT_BR", 'vi: BODY_VI', 'id: BODY_ID', 'tr: BODY_TR', 'pl: BODY_PL']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Bora aprender inglês no Phraseman comigo!');
    expect(source).toContain('Cùng mình học tiếng Anh trên Phraseman nhé!');
    expect(source).toContain('Ayo belajar bahasa Inggris bareng di Phraseman!');
    expect(source).toContain('Phraseman’da benimle İngilizce çalışmaya var mısın?');
    expect(source).toContain('Chodź uczyć się angielskiego ze mną w Phraseman!');
  });

  it('requires complete localized share labels', () => {
    expect(source).toContain("'pt-BR': 'Abra o convite: '");
    expect(source).toContain("vi: 'Mở lời mời: '");
    expect(source).toContain("id: 'Buka undangan: '");
    expect(source).toContain("tr: 'Davet bağlantısını aç: '");
    expect(source).toContain("pl: 'Otwórz zaproszenie: '");
  });
});
