import fs from 'fs';
import path from 'path';

function readApp(file: string): string {
  return fs.readFileSync(path.join(__dirname, '..', 'app', file), 'utf8');
}

describe('flashcard editor input placeholders', () => {
  it('keeps individual card fields visually empty until the user types', () => {
    const source = readApp('flashcards_card_editor.tsx');

    expect(source).not.toContain('placeholder={s.enterEN}');
    expect(source).not.toContain('placeholder={s.enterRU}');
    expect(source).not.toContain('placeholder={s.enterDescription}');
  });

  it('keeps community pack card fields visually empty until the user types', () => {
    const source = readApp('community_pack_create.tsx');

    expect(source).not.toContain('Текст передней стороны…');
    expect(source).not.toContain('Текст задней стороны…');
    expect(source).not.toContain('Краткая заметка, контекст или подсказка…');
  });
});
