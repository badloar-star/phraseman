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

  it('uses the default league chest for unknown themes', () => {
    expect(getLeagueBonusGiftImage('unknown-theme')).toBe(
      getLeagueBonusGiftImage('minimalDark'),
    );
  });

  it('keeps themed gift helpers out of runtime fallback audit noise', () => {
    const giftSource = fs.readFileSync(path.join(process.cwd(), 'constants', 'leagueBonusGiftImages.ts'), 'utf8');
    const paletteSource = fs.readFileSync(path.join(process.cwd(), 'constants', 'leagueBonusPalette.ts'), 'utf8');

    expect(giftSource).not.toMatch(/\bfallback\b|\bFallback\b/);
    expect(giftSource).not.toContain('return LEAGUE_BONUS_GIFT_IMAGES[');
    expect(paletteSource).not.toMatch(/\?\?/);
    expect(paletteSource).not.toContain('return PALETTES[');
  });

  it('keeps league bonus art bundled in OTA updates', () => {
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    const patterns: string[] = appJson.expo.updates.assetPatternsToBeBundled;

    expect(patterns).toContain('assets/images/league/league_crown.webp');
    expect(patterns).toContain('assets/images/league_bonus/*');
    expect(patterns).toContain('assets/images/level_gift_reward_icons/*');
    expect(patterns).toContain('assets/images/shards/*');
  });

  it('keeps the league screen bonus icon visible while chest art is loading', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'club_screen.tsx'), 'utf8');
    const component = source.match(/function LeagueBonusGiftImageWithFallback\([\s\S]*?\n}\n\nfunction LeagueIcon/)?.[0] ?? '';

    expect(component).toContain('!loaded || !source');
    expect(component).toContain('name="gift"');
    expect(component).toContain('onLoad={() => setLoaded(true)}');
    expect(component).toContain('onError={() => setLoaded(false)}');
  });

  it('keeps the home league bonus plate background visible and uncropped', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'home.tsx'), 'utf8');
    const cardStart = source.indexOf('testID="home-league-open"');
    const cardEnd = source.indexOf('{/* ── ФРАЗА ДНЯ + ПОДВАЛ ── */}', cardStart);
    const cardBlock = source.slice(cardStart, cardEnd);

    expect(cardStart).toBeGreaterThanOrEqual(0);
    expect(cardEnd).toBeGreaterThan(cardStart);
    expect(cardBlock).toContain('backgroundColor: leagueBonusPalette.innerBg');
    expect(cardBlock).toContain('right: -8');
    expect(cardBlock).toContain("overflow: 'visible'");
  });
});
