import fs from 'fs';
import path from 'path';

const source = (relativePath: string) => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('retired league bonus raster art', () => {
  it('has no runtime image registry', () => {
    expect(fs.existsSync(path.join(process.cwd(), 'constants', 'leagueBonusGiftImages.ts'))).toBe(false);
  });

  it('keeps the league mission and reward surfaces on the code-native fallback', () => {
    for (const file of [
      'components/league/LeagueBonusMission.tsx',
      'components/LeagueBonusAvailableModal.tsx',
      'components/LeagueChestOpenModal.tsx',
    ]) {
      const component = source(file);
      expect(component).toContain('RetiredRasterFallback');
      expect(component).toContain('kind="league"');
    }

    const club = source('app/club_screen.tsx');
    expect(club).not.toContain('getLeagueBonusGiftImage');
    expect(club).not.toContain('giftImage=');
  });

  it('keeps the home league bonus plate background visible inside the rounded card', () => {
    const home = source('app/(tabs)/home.tsx');
    const cardStart = home.indexOf('testID="home-league-open"');
    const cardEnd = home.indexOf('<DailyPhraseCard variant="homeAdditional"', cardStart);
    const cardBlock = home.slice(cardStart, cardEnd);

    expect(cardStart).toBeGreaterThanOrEqual(0);
    expect(cardEnd).toBeGreaterThan(cardStart);
    expect(cardBlock).toContain('backgroundColor: leagueBonusPalette.innerBg');
    expect(cardBlock).toContain('kind="league"');
    expect(cardBlock).toContain("overflow: 'hidden'");
  });
});
