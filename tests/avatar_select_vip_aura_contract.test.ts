import fs from 'fs';
import path from 'path';

describe('avatar_select Plus aura contract', () => {
  const source = fs.readFileSync(path.join(__dirname, '../app/avatar_select.tsx'), 'utf8');

  it('unlocks both Plus aura variants from paid Plus or admin-granted Plus', () => {
    const sharedPlusOwnedChecks = source.match(
      /const isOwned = isPremiumAura \|\| isVipAura \? hasPlusAuraAccess :/g,
    ) ?? [];

    expect(source).toContain('const hasPlusAuraAccess = isPremium || isVip;');
    expect(sharedPlusOwnedChecks).toHaveLength(2);
    expect(source).not.toContain('premiumAuraAccess');
  });

  it('presents both locked status auras as Plus upsells', () => {
    expect(source).toMatch(/if \(isPremiumAura \|\| isVipAura\) \{[\s\S]*\/premium_modal/);
    expect(source).toMatch(/isPremiumAura \|\| isVipAura\s*\?\s*<PlusBadge/);
    expect(source).not.toContain('Доступно только с VIP-доступом');
    expect(source).not.toContain('shield-checkmark');
  });
});
