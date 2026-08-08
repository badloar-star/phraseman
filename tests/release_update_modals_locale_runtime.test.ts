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

  it('uses planned locale chips and version label in release notes', () => {
    const src = source('components/ReleaseNotesModal.tsx');
    for (const pattern of plannedLocalePatterns) expect(src).toMatch(pattern);
    expect(src).toContain('const chips = useMemo(() => pickReleaseNotesCopy(lang, TEXT.chips), [lang]);');
    expect(src).toContain('const versionLabel = useMemo(() => pickReleaseNotesCopy(lang');
    expect(src).not.toContain("lang === 'es' ? TEXT.chips.es : lang === 'uk' ? TEXT.chips.uk : TEXT.chips.ru");
    expect(src).not.toContain("lang === 'es' ? 'Nueva versión' : lang === 'uk' ? 'Нова версія' : 'Новая версия'");
  });
});
