import { existsSync, readFileSync } from 'fs';
import path from 'path';

const source = (relativePath: string) => readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('retired weekly boon raster art', () => {
  it('has no runtime image registry', () => {
    expect(existsSync(path.join(process.cwd(), 'constants', 'boonIconAssets.ts'))).toBe(false);
  });

  it.each([
    'components/TodaysBoonStrip.tsx',
    'components/WeeklyBoonDetailModal.tsx',
    'components/BoonActivatedModal.tsx',
    'components/BoonActivatedSheet.tsx',
  ])('%s uses the code-native boon fallback', (file) => {
    const component = source(file);
    expect(component).toContain('RetiredRasterFallback');
    expect(component).toContain('kind="boon"');
    expect(component).not.toContain('weeklyBoonIconSource');
  });

  it('keeps reward hosts and chest behavior while retiring the reward image prop', () => {
    for (const file of ['MysteryMondayHost.tsx', 'ComebackBoonHost.tsx', 'PerfectWeekHost.tsx']) {
      const host = source(`components/${file}`);
      expect(host).toContain('BoonChestModal');
      expect(host).not.toContain('rewardIcon=');
      expect(host).not.toContain('getThemedShardIcon');
    }

    const chest = source('components/BoonChestModal.tsx');
    expect(chest).toContain('GiftBox3D');
    expect(chest).toContain('paletteForRarity');
    expect(chest).toContain('kind="gift"');
  });
});
