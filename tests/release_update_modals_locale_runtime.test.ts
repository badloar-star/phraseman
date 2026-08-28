import { readFileSync } from 'fs';
import { join } from 'path';

const source = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

const plannedLocalePatterns = [/'pt-BR'\s*:/, /\bvi\s*:/, /'?id'?\s*:/, /\btr\s*:/, /\bpl\s*:/];

describe('release and update modals planned locale runtime', () => {
  it('uses full locale dictionaries for update modal copy', () => {
    const src = source('components/UpdateModal.tsx');
    for (const pattern of plannedLocalePatterns) expect(src).toMatch(pattern);
    expect(src).toContain('const tx = pickUpdateText(lang);');
    expect(src).not.toContain("const tx = lang === 'es' ? TEXTS.es : TEXTS[lang === 'uk' ? 'uk' : 'ru'];");
  });

  it('uses the full locale dictionary and localized pill in release notes', () => {
    const modal = source('components/ReleaseNotesModal.tsx');
    const copy = source('components/release_notes_copy.ts');
    for (const pattern of plannedLocalePatterns) expect(copy).toMatch(pattern);
    expect(modal).toContain('const tx = useMemo(() => pickReleaseNotesTexts(lang), [lang]);');
    expect(modal).toContain('{tx.pill}');
    expect(modal).not.toContain('TEXT.chips');
    expect(modal).not.toContain('versionLabel');
  });
});
