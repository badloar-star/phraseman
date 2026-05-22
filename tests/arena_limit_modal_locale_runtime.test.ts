import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'components', 'ArenaLimitModal.tsx'), 'utf8');

describe('ArenaLimitModal planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
  });

  it('has visible modal and toast copy for planned locales', () => {
    for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(marker);
    }
    for (const marker of ['messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Com Premium, duelos ilimitados todos os dias');
    expect(source).toContain('Với Premium, bạn có lượt đấu không giới hạn mỗi ngày');
    expect(source).toContain('Dengan Premium, duel tak terbatas setiap hari');
    expect(source).toContain('Premium ile her gün sınırsız düello');
    expect(source).toContain('Z Premium masz nielimitowane pojedynki każdego dnia');
  });
});
