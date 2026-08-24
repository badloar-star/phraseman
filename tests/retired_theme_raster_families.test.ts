import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const sourceRoots = ['app', 'components', 'constants', 'hooks', 'lib', 'modules'];
const retiredPrefixes = [
  'assets/images/level_gifts/',
  'assets/images/level_gift_reward_icons/',
  'assets/images/league_bonus/',
  'assets/images/weekly_boon_icons/',
  'assets/images/trainer_theme_icons/',
] as const;

function sourceFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolutePath);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe('owner-retired raster families', () => {
  test('has no runtime source references to retired raster paths or registries', () => {
    const offenders: string[] = [];
    for (const absolutePath of sourceRoots.flatMap(relativePath =>
      sourceFiles(path.join(root, relativePath)))) {
      const source = fs.readFileSync(absolutePath, 'utf8');
      const hasRetiredPath = retiredPrefixes.some(prefix => source.includes(prefix));
      const hasRetiredRegistry = /dailyPhraseThemeArt|leagueBonusGiftImages|boonIconAssets/.test(source);
      if (hasRetiredPath || hasRetiredRegistry) {
        offenders.push(path.relative(root, absolutePath).replace(/\\/g, '/'));
      }
    }

    expect(offenders).toEqual([]);
  });

  test('keeps reward behavior while rendering code-native fallback art', () => {
    const fallback = fs.readFileSync(
      path.join(root, 'components/feedback/RetiredRasterFallback.tsx'),
      'utf8',
    );
    expect(fallback).toContain("kind: 'gift' | 'league' | 'boon'");
    expect(fallback).not.toMatch(/<Image\b|require\(|https?:\/\//);

    const expectations = [
      ['components/LevelGiftModal.tsx', 'kind="gift"'],
      ['components/LevelGiftDualModal.tsx', 'kind="gift"'],
      ['components/LeagueBonusAvailableModal.tsx', 'kind="league"'],
      ['components/LeagueChestOpenModal.tsx', 'kind="league"'],
      ['components/WeeklyBoonDetailModal.tsx', 'kind="boon"'],
      ['components/celebration/BoonActivatedHybrid.tsx', 'kind="boon"'],
    ] as const;
    for (const [relativePath, marker] of expectations) {
      expect(fs.readFileSync(path.join(root, relativePath), 'utf8')).toContain(marker);
    }

    const dailyPhrase = fs.readFileSync(path.join(root, 'components/DailyPhraseCard.tsx'), 'utf8');
    expect(dailyPhrase).not.toContain('dailyPhraseThemeArtSource');
    expect(dailyPhrase).toContain('Ionicons');
  });
});
