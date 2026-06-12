import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

const read = (relativePath: string) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('league XP promotion remote mode contract', () => {
  it('keeps the admin remote config switch and threshold editable without an app deploy', () => {
    const adminSource = read('admin/index.html');
    const flagsSource = read('app/remote_flags.ts');

    expect(adminSource).toContain("key: 'league_xp_promotion_enabled'");
    expect(adminSource).toContain("key: 'league_xp_promotion_threshold'");
    expect(flagsSource).toContain('league_xp_promotion_enabled: false');
    expect(flagsSource).toContain('league_xp_promotion_threshold: 1000');
  });

  it('keeps the app league screen wired to show the temporary rule and green promotion badges', () => {
    const clubSource = read('app/club_screen.tsx');

    expect(clubSource).toContain('remote_config_changed');
    expect(clubSource).toContain('league-xp-promotion-banner');
    expect(clubSource).toContain('league-xp-promotion-badge');
    expect(clubSource).toContain('leagueXpPromotionBannerText');
    expect(clubSource).toContain('isLeagueXpPromotionEnabled');
    expect(clubSource).toContain('getLeagueXpPromotionThreshold');
  });
});
