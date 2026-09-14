import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('card training deck selection tiles', () => {
  test('both selection surfaces use the shared square tile', () => {
    const sheet = read('app', 'flashcards', 'DeckPickerSheet.tsx');
    const setup = read('app', 'flashcards_training_setup.tsx');
    const tilePath = path.join(ROOT, 'app', 'flashcards', 'DeckSelectionTile.tsx');

    expect(sheet).toContain('DeckSelectionTile');
    expect(setup).toContain('DeckSelectionTile');
    expect(fs.existsSync(tilePath)).toBe(true);
    if (!fs.existsSync(tilePath)) return;

    const tile = fs.readFileSync(tilePath, 'utf8');
    expect(tile).toContain('aspectRatio: 1');
    expect(tile).toContain('accessibilityRole="checkbox"');
    expect(tile).toContain('contentFit="contain"');
    expect(tile).toMatch(/checkbox:\s*\{[\s\S]*?top:\s*8,[\s\S]*?right:\s*8,/);
  });

  test('pack options carry real artwork and a cache revision', () => {
    const options = read('app', 'flashcards', 'deck_options.ts');

    expect(options).toContain('coverImage');
    expect(options).toContain('coverRevision');
    expect(options).toContain('packTileImageForPack');
    expect(options).toContain('bundledPackTilePng');
  });
});
