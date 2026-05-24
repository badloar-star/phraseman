import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, '..', 'components', 'NoEnergyModal.tsx'), 'utf8');

const plannedLocales = ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
const legacyRuntimePattern =
  /\b(lang === 'ru'|lang === 'uk'|lang === 'es'|isUK|isES|ENERGY_MESSAGES_(?:RU|UK|ES)|ENERGY_GATE_MESSAGES_(?:RU|UK|ES))\b/u;

describe('NoEnergyModal planned locale runtime copy', () => {
  it('does not route planned locales through legacy RU/UK/ES branches', () => {
    expect(source).not.toMatch(legacyRuntimePattern);
    expect(source).toContain("import { lessonEnergyMessages } from '../app/lesson_locale_utils';");
    expect(source).toContain('ENERGY_GATE_MESSAGES_BY_LANG');
  });

  it('has visible copy branches for every planned locale', () => {
    for (const locale of plannedLocales) {
      expect(source).toContain(locale === 'pt-BR' ? "'pt-BR'" : `${locale}:`);
    }
    expect(source).toContain('messagePtBr');
    expect(source).toContain('messageVi');
    expect(source).toContain('messageId');
    expect(source).toContain('messageTr');
    expect(source).toContain('messagePl');
  });
});
