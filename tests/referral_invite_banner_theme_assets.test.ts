import fs from 'fs';
import path from 'path';

describe('referral invite banner without legacy art', () => {
  it('uses a vector sign and bundles no themed bitmap banner', () => {
    const root = path.resolve(__dirname, '..');
    const source = fs.readFileSync(path.join(root, 'components/ReferralInviteBannerArt.tsx'), 'utf8');
    const directory = path.join(root, 'assets/images/settings/referral_theme');
    expect(source).toContain('name="gift-outline"');
    expect(source).not.toContain('THEME_BANNERS');
    expect(fs.existsSync(directory) ? fs.readdirSync(directory) : []).toEqual([]);
  });
});
