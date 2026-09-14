import {
  defaultPackLanguageForStudyTarget,
  normalizePackLanguage,
  packLanguageLabel,
  type PackLanguage,
} from '../app/flashcards/pack_languages';

describe('pack language domain', () => {
  it.each<PackLanguage>(['en', 'fr', 'de', 'es'])('accepts %s as a pack language', (language) => {
    expect(normalizePackLanguage(language)).toBe(language);
  });

  it('normalizes missing and unknown legacy values to English', () => {
    expect(normalizePackLanguage(undefined)).toBe('en');
    expect(normalizePackLanguage('ru')).toBe('en');
    expect(normalizePackLanguage('DEV:fr')).toBe('en');
  });

  it('uses a supported study target as the default without widening the study target contract', () => {
    expect(defaultPackLanguageForStudyTarget('fr')).toBe('fr');
    expect(defaultPackLanguageForStudyTarget('de')).toBe('de');
    expect(defaultPackLanguageForStudyTarget('es')).toBe('es');
    expect(defaultPackLanguageForStudyTarget('ru')).toBe('en');
    expect(defaultPackLanguageForStudyTarget(null)).toBe('en');
  });

  it('exposes stable native labels for the language picker', () => {
    expect(packLanguageLabel('en')).toBe('English');
    expect(packLanguageLabel('fr')).toBe('Français');
    expect(packLanguageLabel('de')).toBe('Deutsch');
    expect(packLanguageLabel('es')).toBe('Español');
  });
});
