import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

describe('flashcard details no context contract', () => {
  it('does not render a separate Context/Example detail section', () => {
    const source = read('app/flashcards/FlashcardDetailsBody.tsx');

    expect(source).not.toContain('CONTEXT_LABEL');
    expect(source).not.toContain('EXAMPLE_LABEL');
    expect(source).not.toMatch(/item\.example(En|Ru|Uk|Es)/);
    expect(source).not.toMatch(/Контекст|Context\s*:/i);
  });

  it('does not treat example-only cards as expandable details', () => {
    const source = read('app/flashcards/types.ts');
    const fnStart = source.indexOf('export function cardHasDetails');
    const fnSource = source.slice(fnStart, source.indexOf('/* expo-router route shim', fnStart));

    expect(fnStart).toBeGreaterThanOrEqual(0);
    expect(fnSource).not.toMatch(/example(En|Ru|Uk|Es)/);
  });
});
