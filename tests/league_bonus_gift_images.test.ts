import fs from 'fs';
import path from 'path';

import {
  getLeagueBonusGiftImage,
  LEAGUE_BONUS_GIFT_IMAGE_THEMES,
} from '../constants/leagueBonusGiftImages';

describe('league bonus themed gift images', () => {
  it('has a DALL-E generated league chest for every supported theme', () => {
    for (const theme of LEAGUE_BONUS_GIFT_IMAGE_THEMES) {
      const assetPath = path.join(
        process.cwd(),
        'assets',
        'images',
        'league_bonus',
        `${theme}-chest.webp`,
      );

      expect(fs.existsSync(assetPath)).toBe(true);
      expect(getLeagueBonusGiftImage(theme)).toBeTruthy();
    }
  });

  it('falls back to the default league chest for unknown themes', () => {
    expect(getLeagueBonusGiftImage('unknown-theme')).toBe(
      getLeagueBonusGiftImage('minimalDark'),
    );
  });
});
