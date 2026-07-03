import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');

describe('arena pass reward claim contract', () => {
  const source = readFileSync(join(ROOT, 'app', 'arena_pass.tsx'), 'utf8');

  it('marks tiers claimed locally before granting rewards in the background', () => {
    const grantStart = source.indexOf('const grantReward = useCallback');
    const xpBranch = source.indexOf("r.kind === 'xp'", grantStart);
    const claimFreeStart = source.indexOf('const claimFree = useCallback');
    const claimPremiumStart = source.indexOf('const claimPremium = useCallback');
    const openPaywallStart = source.indexOf('const openPaywall = useCallback');
    const claimFree = source.slice(claimFreeStart, claimPremiumStart);
    const claimPremium = source.slice(claimPremiumStart, openPaywallStart);

    expect(grantStart).toBeGreaterThan(0);
    expect(xpBranch).toBeGreaterThan(grantStart);
    expect(claimFree.indexOf('const next = await markFreeClaimed(level, seasonId);')).toBeLessThan(
      claimFree.indexOf("void grantReward(tier.free, 'free', level).catch"),
    );
    expect(claimPremium.indexOf('const next = await markPremiumClaimed(level, seasonId);')).toBeLessThan(
      claimPremium.indexOf("void grantReward(tier.premium, 'premium', level).catch"),
    );
    expect(claimFree).not.toContain('await grantReward(');
    expect(claimPremium).not.toContain('await grantReward(');
    expect(source.slice(xpBranch, claimFreeStart)).toContain('await registerXP(');
    expect(source.slice(xpBranch, claimFreeStart)).not.toContain('catch { /* XP');
  });
});
