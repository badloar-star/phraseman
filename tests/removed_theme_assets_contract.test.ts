import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

const root = path.join(__dirname, '..');
const removedThemeAssetPattern = /minimalDark|minimal-dark|candyBlue|candy-blue/i;

const sourceFiles = [
  'app/coin_icons.ts',
  'app/flashcards/FlashcardsCategoryHub.tsx',
  'app/image_preload.ts',
  'components/ReferralInviteBannerArt.tsx',
  'constants/streakIconAssets.ts',
];

function collectRemovedThemeAssets(directory: string, relative = ''): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = path.join(relative, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectRemovedThemeAssets(absolutePath, relativePath);
    return removedThemeAssetPattern.test(relativePath) ? [relativePath] : [];
  });
}

describe('removed theme assets contract', () => {
  it('has no bundled or source assets for Onyx and Candy Blue', () => {
    expect(collectRemovedThemeAssets(path.join(root, 'assets', 'images'))).toEqual([]);
  });

  it('has no static app references to removed theme assets', () => {
    for (const relativePath of sourceFiles) {
      const source = normalizeEol(fs.readFileSync(path.join(root, relativePath), 'utf8'));
      const assetReferences = source.match(/assets\/images[^'"\r\n)]+/g) ?? [];
      expect(assetReferences.filter(reference => removedThemeAssetPattern.test(reference))).toEqual([]);
    }
  });
});
