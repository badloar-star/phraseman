import { readFileSync } from 'fs';
import { join } from 'path';

const files = [
  ['feedback engine', join(__dirname, '..', 'app', 'feedback_engine.ts')],
  ['feedback types', join(__dirname, '..', 'app', 'types', 'feedback.ts')],
  ['paywall personalization', join(__dirname, '..', 'app', 'paywall_personalization.ts')],
  ['premium revenuecat state', join(__dirname, '..', 'app', 'premium_revenuecat_state.ts')],
] as const;

describe('paywall and feedback runtime audit wording', () => {
  it('does not leave generic fallback markers in non-UI control paths', () => {
    const offenders: string[] = [];
    for (const [label, file] of files) {
      const source = readFileSync(file, 'utf8');
      if (source.includes('fallback') || source.includes('Fallback')) offenders.push(label);
    }
    expect(offenders).toEqual([]);
  });

  it('keeps paywall personalization tags covered for planned locales', () => {
    const source = readFileSync(join(__dirname, '..', 'app', 'paywall_personalization.ts'), 'utf8');
    for (const marker of ["'pt-BR'", 'vi:', 'id:', 'tr:', 'pl:']) {
      expect(source).toContain(marker);
    }
    expect(source).toContain('Energia ilimitada');
    expect(source).toContain('Năng lượng không giới hạn');
    expect(source).toContain('Energi tanpa batas');
    expect(source).toContain('Sınırsız enerji');
    expect(source).toContain('Nieograniczona energia');
  });
});
