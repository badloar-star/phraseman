import fs from 'fs';
import path from 'path';

const buildExpoConfig = require('../app.config.js') as {
  (args?: { config?: Record<string, unknown> }): {
    updates?: { assetPatternsToBeBundled?: string[] };
  };
  expandAssetPatternsToExactFiles: (projectRoot: string, patterns: string[]) => string[];
};

const NEW_OFFICIAL_CARD_BACK_FILES = [
  'assets/images/flashcard_backs/official_phrasal_verbs_en.webp',
  'assets/images/flashcard_backs/official_phrasal_verbs_en_fan.webp',
  'assets/images/flashcard_backs/official_movie_series_en.webp',
  'assets/images/flashcard_backs/official_movie_series_en_fan.webp',
];

describe('flashcard card back OTA assets', () => {
  const oldMinimalOtaAssets = process.env.PHRASEMAN_MINIMAL_OTA_ASSETS;
  const oldStoreRelease = process.env.EXPO_PUBLIC_STORE_RELEASE;

  afterEach(() => {
    if (oldMinimalOtaAssets === undefined) {
      delete process.env.PHRASEMAN_MINIMAL_OTA_ASSETS;
    } else {
      process.env.PHRASEMAN_MINIMAL_OTA_ASSETS = oldMinimalOtaAssets;
    }

    if (oldStoreRelease === undefined) {
      delete process.env.EXPO_PUBLIC_STORE_RELEASE;
    } else {
      process.env.EXPO_PUBLIC_STORE_RELEASE = oldStoreRelease;
    }
  });

  it('keeps the two newest official pack backs present on disk', () => {
    for (const assetPath of NEW_OFFICIAL_CARD_BACK_FILES) {
      expect(fs.existsSync(path.join(process.cwd(), assetPath))).toBe(true);
    }
  });

  it('bundles the two newest official pack backs in regular OTA updates', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const exactAssets = buildExpoConfig.expandAssetPatternsToExactFiles(
      process.cwd(),
      appJson.expo.updates.assetPatternsToBeBundled,
    );

    expect(exactAssets).toEqual(expect.arrayContaining(NEW_OFFICIAL_CARD_BACK_FILES));
  });

  it('bundles the two newest official pack backs in minimal OTA updates', () => {
    process.env.PHRASEMAN_MINIMAL_OTA_ASSETS = '1';
    delete process.env.EXPO_PUBLIC_STORE_RELEASE;

    const expoConfig = buildExpoConfig({ config: {} });

    expect(expoConfig.updates?.assetPatternsToBeBundled ?? []).toEqual(
      expect.arrayContaining(NEW_OFFICIAL_CARD_BACK_FILES),
    );
  });
});
