import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('streak revive shop and stats contract', () => {
  it('sends users who lack shards to the shop with a return target', () => {
    const source = fs.readFileSync(path.join(ROOT, 'components', 'StreakReviveModal.tsx'), 'utf8');

    expect(source).toContain("source: 'streak_revive'");
    expect(source).toContain('returnTo: shopReturnTo');
  });

  it('returns from the shop to the revive surface after the missing shards are covered', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'shards_shop.tsx'), 'utf8');

    expect(source).toContain("params.source !== 'streak_revive'");
    expect(source).toContain("params.returnTo === 'streak_stats' ? '/streak_stats' : '/(tabs)/home'");
  });

  it('keeps a one-day revive action on the streak statistics screen', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'streak_stats.tsx'), 'utf8');

    expect(source).toContain('getReviveOffer');
    expect(source).toContain('<StreakReviveModal');
    expect(source).toContain("shopReturnTo=\"streak_stats\"");
    expect(source).toContain('reviveOffer={reviveOffer}');
    expect(source).toContain('onRevivePress={handleReviveStreak}');
  });
});
