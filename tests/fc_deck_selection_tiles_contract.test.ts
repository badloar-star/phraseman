import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('card training deck selection tiles', () => {
  // зачем: PM-092 (378ac4081, владелец: «не квадраты-блоки, а удобный список») — квадратная плитка
  // заменена строкой на всю ширину: обложка 44×44 слева, текст гибкий, галочка справа не сжимается.
  test('both selection surfaces use the shared compact row', () => {
    const sheet = read('app', 'flashcards', 'DeckPickerSheet.tsx');
    const setup = read('app', 'flashcards_training_setup.tsx');
    const tilePath = path.join(ROOT, 'app', 'flashcards', 'DeckSelectionTile.tsx');

    expect(sheet).toContain('DeckSelectionTile');
    expect(setup).toContain('DeckSelectionTile');
    expect(fs.existsSync(tilePath)).toBe(true);
    if (!fs.existsSync(tilePath)) return;

    const tile = fs.readFileSync(tilePath, 'utf8');
    expect(tile).not.toContain('aspectRatio: 1');
    expect(tile).toContain("wrapper: { width: '100%' }");
    expect(tile).toContain('textCol: { flex: 1, minWidth: 0 }');
    expect(tile).toContain('accessibilityRole="checkbox"');
    expect(tile).toContain('contentFit="cover"');
    expect(tile).toMatch(/checkbox:\s*\{[\s\S]*?flexShrink:\s*0,/);
  });

  test('pack options carry real artwork and a cache revision', () => {
    const options = read('app', 'flashcards', 'deck_options.ts');

    expect(options).toContain('coverImage');
    expect(options).toContain('coverRevision');
    expect(options).toContain('packTileImageForPack');
    expect(options).toContain('bundledPackTilePng');
  });
});
