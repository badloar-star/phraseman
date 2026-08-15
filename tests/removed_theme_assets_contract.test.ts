import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const removedThemeAssetPattern = /minimalDark|minimal-dark|candyBlue|candy-blue/i;

const sourceFiles = [
  'app/coin_icons.ts',
  'app/flashcards/FlashcardsCategoryHub.tsx',
  'app/home_menu_icons.ts',
  'app/image_preload.ts',
  'components/ReferralInviteBannerArt.tsx',
  'constants/boonIconAssets.ts',
  'constants/generatedThemeIconAssets.ts',
  'constants/leagueBonusGiftImages.ts',
  'constants/socialIconAssets.ts',
  'constants/streakIconAssets.ts',
  'constants/trainerThemeIcons.ts',
  'constants/weeklyCompassIcons.ts',
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
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
      const assetReferences = source.match(/assets\/images[^'"\r\n)]+/g) ?? [];
      expect(assetReferences.filter(reference => removedThemeAssetPattern.test(reference))).toEqual([]);
    }
  });
});
