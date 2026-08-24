import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const THEMES = [
  'dark',
  'gold',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'indigo',
  'sagePorcelain',
] as const;

describe('league weekly goal theme art', () => {
  test('has one static bundled asset per ThemeMode', () => {
    const registryPath = path.join(ROOT, 'components/league/leagueWeeklyGoalAssets.ts');
    const source = fs.readFileSync(registryPath, 'utf8');

    for (const theme of THEMES) {
      const relative = `../../assets/images/league/weekly-goal/${theme}.webp`;
      expect(source).toContain(`require('${relative}')`);
      expect(fs.existsSync(path.join(ROOT, relative.replace('../../', '')))).toBe(true);
    }
    expect(source).toContain('satisfies Record<ThemeMode, ImageSourcePropType>');
  });

  test('renders the theme asset as the primary chest art', () => {
    const mission = fs.readFileSync(
      path.join(ROOT, 'components/league/LeagueBonusMission.tsx'),
      'utf8',
    );
    expect(mission).toContain("from './leagueWeeklyGoalAssets'");
    expect(mission).toContain('getLeagueWeeklyGoalAsset(themeMode)');
    expect(mission).toContain("from 'expo-image'");
    expect(mission).toContain('source={weeklyGoalAsset as ImageSource}');
  });
});
