import { readFileSync } from 'fs';
import { join } from 'path';

const streakSource = readFileSync(join(__dirname, '..', 'components', 'StreakReviveModal.tsx'), 'utf8');
const energySource = readFileSync(join(__dirname, '..', 'components', 'EnergyRefillShardModal.tsx'), 'utf8');

describe('energy restore modals planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    for (const source of [streakSource, energySource]) {
      expect(source).not.toMatch(/\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES)\b/u);
    }
    expect(streakSource).not.toContain("function formatRemaining(ms: number, lang: 'ru' | 'uk' | 'es')");
  });

  it('uses full planned locale copy for visible labels and toasts', () => {
    for (const source of [streakSource, energySource]) {
      expect(source).toContain('triLang');
      for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
        expect(source).toContain(marker);
      }
      for (const marker of ['messagePtBr', 'messageVi', 'messageId', 'messageTr', 'messagePl']) {
        expect(source).toContain(marker);
      }
    }
  });

  it('keeps every streak recovery label explicit in all eight interface locales', () => {
    const localeMarkers = ['ru:', 'uk:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'];
    const copyNames = [
      'title',
      'description',
      'primaryLabel',
      'busyLabel',
      'secondaryLabel',
      'costLabel',
      'closeLabel',
    ];

    for (const copyName of copyNames) {
      const start = streakSource.indexOf(`const ${copyName} = triLang`);
      expect(start).toBeGreaterThanOrEqual(0);
      const end = streakSource.indexOf('});', start);
      const copyBlock = streakSource.slice(start, end);
      for (const marker of localeMarkers) expect(copyBlock).toContain(marker);
    }

    expect(streakSource).toContain("ru: 'Рекорд всё ещё твой'");
    expect(streakSource).toContain("'pt-BR': 'Seu recorde ainda é seu'");
    expect(streakSource).toContain("vi: 'Kỷ lục vẫn là của bạn'");
    expect(streakSource).toContain("id: 'Rekormu masih milikmu'");
    expect(streakSource).toContain("tr: 'Rekorun hâlâ senin'");
    expect(streakSource).toContain("pl: 'Twój rekord nadal jest Twój'");
  });

  it('keeps planned energy copy explicit rather than generic fallback text', () => {
    expect(energySource).toContain('Restaurar energia');
    expect(energySource).toContain('Khôi phục năng lượng');
    expect(energySource).toContain('Pulihkan energi');
    expect(energySource).toContain('Enerjiyi yenile');
    expect(energySource).toContain('Odnów energię');
  });
});
