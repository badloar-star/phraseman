import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson 17 vocabulary copy', () => {
  it('uses an infinitive-style Russian and Ukrainian gloss for standalone "looking for"', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_words.tsx'), 'utf8');
    const lookingForRow = source.match(/\{\s*en:\s*'looking for'[\s\S]*?\}/)?.[0] ?? '';

    expect(lookingForRow).toContain("ru: 'Искать'");
    expect(lookingForRow).toContain("uk: 'Шукати'");
    expect(lookingForRow).not.toContain("ru: 'Искал'");
    expect(lookingForRow).not.toContain("uk: 'Шукав'");
  });

  it('does not use past-tense glosses for standalone "looking for" source locales', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson_words_source_locales.ts'), 'utf8');
    const lookingForBlock = source.match(/'looking for':\s*\{[\s\S]*?\n\s*\},/)?.[0] ?? '';

    expect(lookingForBlock).toContain("tr: 'arıyor / aramak'");
    expect(lookingForBlock).toContain("pl: 'szukać / szukając'");
    expect(lookingForBlock).not.toContain('arıyordu');
    expect(lookingForBlock).not.toContain('szukał');
  });
});
